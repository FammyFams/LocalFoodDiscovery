//
//  RestaurantDetailView.swift
//  LocalFoodDiscovery
//
//  Created by Matthew Zheng on 12/19/24.
//

import SwiftUI

struct RestaurantDetailView: View {
    let restaurant: Restaurant

    var body: some View {
        ScrollView {
            if !restaurant.images.isEmpty {
                TabView {
                    ForEach(restaurant.images, id: \.self) { imageUrl in
                        AsyncImage(url: imageUrl) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(height: 300)
                        .clipped()
                    }
                }
                .tabViewStyle(PageTabViewStyle())
                .frame(height: 300)
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(height: 300)
                    .overlay(Text("No Image").foregroundColor(.white))
            }

            VStack(alignment: .leading, spacing: 10) {
                Text(restaurant.name)
                    .font(.title)
                    .fontWeight(.bold)

                if let rating = restaurant.rating {
                    Text("Rating: \(rating, specifier: "%.1f") (\(restaurant.userRatingsTotal ?? 0) reviews)")
                }

                Text("Distance: \(String(format: "%.2f", restaurant.distance)) miles")
                Text("Price: " + String(repeating: "$", count: restaurant.priceLevel))
                Text("Address: \(restaurant.address)")
            }
            .padding()
        }
        .navigationTitle(restaurant.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
