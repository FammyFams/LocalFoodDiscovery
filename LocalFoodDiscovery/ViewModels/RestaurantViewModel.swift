//
//  RestaurantViewModel.swift
//  LocalFoodDiscovery
//
//  Created by Matthew Zheng on 12/18/24.
//

import Foundation
import CoreLocation

class RestaurantViewModel: ObservableObject {
    @Published var restaurants: [Restaurant] = []
    @Published var likedRestaurants: [Restaurant] = []
    @Published var dislikedRestaurants: [Restaurant] = []

    private var nextPageToken: String?
    private var lastLatitude: Double?
    private var lastLongitude: Double?
    private var lastRadiusMiles: Int?

    func fetchRestaurants(latitude: Double, longitude: Double, radiusMiles: Int) {
        self.lastLatitude = latitude
        self.lastLongitude = longitude
        self.lastRadiusMiles = radiusMiles
        self.nextPageToken = nil
        self.restaurants = []

        requestPlaces(latitude: latitude, longitude: longitude, radiusMiles: radiusMiles, nextPageToken: nil)
    }

    private func requestPlaces(latitude: Double, longitude: Double, radiusMiles: Int, nextPageToken: String?) {
        let radiusInMeters = radiusMiles * 1609
        let apiKey = "AIzaSyA-y8jnW4QserJxiej8k8UOdJtw5N21up8"
        var urlString: String

        if let token = nextPageToken {
            urlString = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=\(token)&key=\(apiKey)"
        } else {
            urlString = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=\(latitude),\(longitude)&radius=\(radiusInMeters)&type=restaurant&key=\(apiKey)"
        }

        guard let url = URL(string: urlString) else { return }

        URLSession.shared.dataTask(with: url) { [weak self] data, _, error in
            guard let self = self else { return }
            guard let data = data, error == nil else {
                print("Error fetching data: \(error?.localizedDescription ?? "Unknown error")")
                return
            }

            do {
                let result = try JSONDecoder().decode(GooglePlacesResponse.self, from: data)

                let fetchedRestaurants = result.results.compactMap { place -> Restaurant? in
                    let imageURLs: [URL] = place.photos?.compactMap { photo in
                        URL(string: "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=\(photo.photo_reference)&key=\(apiKey)")
                    } ?? []

                    guard let lat = self.lastLatitude, let lng = self.lastLongitude else { return nil }
                    let userLocation = CLLocation(latitude: lat, longitude: lng)
                    let restaurantLocation = CLLocation(latitude: place.geometry.location.lat, longitude: place.geometry.location.lng)
                    let distanceInMeters = userLocation.distance(from: restaurantLocation)
                    let distanceInMiles = distanceInMeters / 1609.34
                    let priceLevel = place.price_level ?? 2

                    return Restaurant(
                        id: place.place_id,
                        name: place.name,
                        distance: distanceInMiles,
                        priceLevel: priceLevel,
                        images: imageURLs,
                        address: place.vicinity,
                        rating: place.rating,
                        userRatingsTotal: place.user_ratings_total
                    )
                }

                DispatchQueue.main.async {
                    self.nextPageToken = result.next_page_token
                    let nextBatch = Array(fetchedRestaurants.prefix(4))
                    self.restaurants.append(contentsOf: nextBatch)
                }
            } catch {
                print("Decoding error: \(error.localizedDescription)")
            }
        }.resume()
    }

    func like(restaurant: Restaurant) {
        likedRestaurants.append(restaurant)
        removeFromCurrentStack(restaurant)
    }

    func dislike(restaurant: Restaurant) {
        dislikedRestaurants.append(restaurant)
        removeFromCurrentStack(restaurant)
    }

    private func removeFromCurrentStack(_ restaurant: Restaurant) {
        if let index = restaurants.firstIndex(where: { $0.id == restaurant.id }) {
            restaurants.remove(at: index)
        }

        if restaurants.isEmpty {
            loadMoreIfAvailable()
        }
    }

    private func loadMoreIfAvailable() {
        guard let lat = self.lastLatitude,
              let lng = self.lastLongitude,
              let radius = self.lastRadiusMiles,
              let token = self.nextPageToken else {
            print("No more restaurants available or missing parameters.")
            return
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.requestPlaces(latitude: lat, longitude: lng, radiusMiles: radius, nextPageToken: token)
        }
    }
}

// MARK: - Google Places API Response Models

struct GooglePlacesResponse: Codable {
    let results: [GooglePlaceResult]
    let next_page_token: String?
}

struct GooglePlaceResult: Codable {
    let place_id: String
    let name: String
    let geometry: Geometry
    let price_level: Int?
    let photos: [Photo]?
    let vicinity: String
    let rating: Double?
    let user_ratings_total: Int?

    struct Geometry: Codable {
        let location: Location
    }

    struct Location: Codable {
        let lat: Double
        let lng: Double
    }

    struct Photo: Codable {
        let photo_reference: String
    }
}
