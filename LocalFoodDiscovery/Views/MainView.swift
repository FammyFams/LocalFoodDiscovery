//
//  MainView.swift
//  LocalFoodDiscovery
//
//  Created by Matthew Zheng on 12/19/24.
//

import SwiftUI

struct MainView: View {
    @StateObject var viewModel = RestaurantViewModel()
    @State private var selectedCity = "San Francisco"
    @State private var selectedRadius = 10 // in miles

    var body: some View {
        VStack {
            // City & Radius Selector
            HStack {
                TextField("City", text: $selectedCity)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .frame(width: 150)

                Picker("Radius", selection: $selectedRadius) {
                    ForEach([5, 10, 20, 50], id: \.self) { radius in
                        Text("\(radius) mi").tag(radius)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())

                Button("Search") {
                    viewModel.fetchRestaurants(for: selectedCity, radiusMiles: selectedRadius)
                }
            }
            .padding()

            // Card Stack
            ZStack {
                ForEach(viewModel.restaurants) { restaurant in
                    RestaurantCard(restaurant: restaurant) { direction in
                        if direction == .right {
                            viewModel.like(restaurant: restaurant)
                        } else {
                            viewModel.dislike(restaurant: restaurant)
                        }
                    }
                    .padding()
                }
            }

            Spacer()
        }
        .padding()
    }
}

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
        MainView()
    }
}
