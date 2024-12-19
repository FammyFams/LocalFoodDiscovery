//
//  RestaurantViewModel.swift
//  LocalFoodDiscovery
//
//  Created by Matthew Zheng on 12/18/24.
//

import Foundation
import CoreLocation
import SwiftUI

class RestaurantViewModel: ObservableObject {
    @Published var restaurants: [Restaurant] = []
    @Published var likedRestaurants: [Restaurant] = []
    @Published var dislikedRestaurants: [Restaurant] = []

    private let geocoder = CLGeocoder()

    func fetchRestaurants(for city: String, radiusMiles: Int) {
        // Clear current restaurants
        restaurants = []

        geocodeCity(city) { coordinate in
            guard let coordinate = coordinate else { return }

            let radiusInMeters = radiusMiles * 1609
            // Here we’ll pretend we got data from an API; for now, just mock some data.
            // Replace the following mock data with an actual network call later.
            
            let mockRestaurants = [
                Restaurant(id: "1",
                           name: "Tasty Local Diner",
                           distance: 0.5,
                           priceLevel: 1,
                           images: [URL(string: "https://via.placeholder.com/300")!]),
                Restaurant(id: "2",
                           name: "Gourmet Bistro",
                           distance: 2.0,
                           priceLevel: 3,
                           images: [URL(string: "https://via.placeholder.com/300")!])
            ]
            
            DispatchQueue.main.async {
                self.restaurants = mockRestaurants
            }
        }
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
    }

    private func geocodeCity(_ city: String, completion: @escaping (CLLocationCoordinate2D?) -> Void) {
        geocoder.geocodeAddressString(city) { placemarks, error in
            if let location = placemarks?.first?.location {
                completion(location.coordinate)
            } else {
                completion(nil)
            }
        }
    }
}
