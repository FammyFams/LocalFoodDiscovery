//
//  MainView.swift
//  LocalFoodDiscovery
//
//  Created by Matthew Zheng on 12/19/24.
//

import SwiftUI
import CoreLocation

struct MainView: View {
    @StateObject var viewModel = RestaurantViewModel()
    @State private var selectedRadius = 2 // Default to 2 miles
    @StateObject private var locationManager = LocationManager()

    // Access the user's current coordinate from the location manager
    private var currentCoordinate: CLLocationCoordinate2D? {
        locationManager.currentCoordinate
    }

    var body: some View {
        NavigationView {
            VStack {
                headerSection
                RestaurantListView(
                    restaurants: viewModel.restaurants,
                    onSwipe: { restaurant, direction in
                        if direction == .right {
                            viewModel.like(restaurant: restaurant)
                        } else {
                            viewModel.dislike(restaurant: restaurant)
                        }
                    },
                    detailView: { restaurant in
                        RestaurantDetailView(restaurant: restaurant)
                    }
                )

                Spacer()

                bottomButtons
            }
            .padding()
            .background(Color.orange.opacity(0.2))
            .edgesIgnoringSafeArea(.all)
            .navigationBarHidden(true)
            .onChange(of: selectedRadius) { newRadius in
                // If we have a coordinate, update results when radius changes
                if let coord = currentCoordinate {
                    viewModel.fetchRestaurants(latitude: coord.latitude, longitude: coord.longitude, radiusMiles: newRadius)
                }
            }
            .onAppear {
                // Attempt to use current location as default
                locationManager.requestLocation()
            }
            .onReceive(locationManager.$currentCoordinate) { coord in
                // When coordinate is updated, trigger search if available
                if let coord = coord {
                    viewModel.fetchRestaurants(latitude: coord.latitude, longitude: coord.longitude, radiusMiles: selectedRadius)
                }
            }
        }
    }

    // MARK: - Subviews

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Find Local Restaurants Near Me")
                .font(.headline)

            HStack(spacing: 8) {
                Picker("Radius", selection: $selectedRadius) {
                    ForEach([1, 2, 3, 4, 5], id: \.self) { (radius: Int) in
                        Text("\(radius) mi").tag(radius)
                    }
                }
                .pickerStyle(MenuPickerStyle())

                Button("Use Current Location") {
                    locationManager.requestLocation()
                }
                .font(.footnote)
                .padding(.vertical, 6)
                .padding(.horizontal, 8)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
        .padding(.horizontal, 20)
        .padding(.top, 20)
    }

    private var bottomButtons: some View {
        HStack {
            NavigationLink(destination: NotNowView(restaurants: viewModel.dislikedRestaurants)) {
                Text("Not Now")
                    .padding()
                    .background(Color.red.opacity(0.2))
                    .cornerRadius(8)
            }

            NavigationLink(destination: LikedView(restaurants: viewModel.likedRestaurants)) {
                Text("Liked")
                    .padding()
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(8)
            }
        }
        .padding(.bottom, 20)
    }
}

// MARK: - RestaurantListView

struct RestaurantListView<DetailView: View>: View {
    let restaurants: [Restaurant]
    let onSwipe: (Restaurant, SwipeDirection) -> Void
    let detailView: (Restaurant) -> DetailView

    var body: some View {
        ZStack {
            // Add explicit type annotations and id
            ForEach(restaurants, id: \.id) { (restaurant: Restaurant) in
                NavigationLink(destination: detailView(restaurant)) {
                    RestaurantCard(restaurant: restaurant) { direction in
                        onSwipe(restaurant, direction)
                    }
                    .padding()
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
    }
}

// MARK: - Location Manager

class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    @Published var currentCoordinate: CLLocationCoordinate2D?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func requestLocation() {
        let status = CLLocationManager.authorizationStatus()
        if status == .notDetermined {
            manager.requestWhenInUseAuthorization()
        } else if status == .authorizedWhenInUse || status == .authorizedAlways {
            manager.requestLocation()
        } else {
            print("Location permission not granted.")
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.first else { return }
        DispatchQueue.main.async {
            self.currentCoordinate = location.coordinate
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error.localizedDescription)")
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        if status == .authorizedWhenInUse || status == .authorizedAlways {
            manager.requestLocation()
        }
    }
}

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
        MainView()
    }
}
