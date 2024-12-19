//
//  RestaurantCard.swift
//  LocalFoodDiscovery
//
//  Created by Matthew Zheng on 12/18/24.
//

import SwiftUI

enum SwipeDirection {
    case left
    case right
}

struct RestaurantCard: View {
    let restaurant: Restaurant
    var onSwipe: (SwipeDirection) -> Void

    @State private var offset: CGSize = .zero

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 15)
                .fill(Color(UIColor.systemBackground))
                .shadow(radius: 5)

            VStack {
                if let imageURL = restaurant.images.first {
                    AsyncImage(url: imageURL) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        ProgressView()
                    }
                    .frame(height: 200)
                    .clipped()
                }

                Text(restaurant.name)
                    .font(.headline)
                    .padding(.top)

                Text("Distance: \(String(format: "%.2f", restaurant.distance)) miles")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Text("Price: " + String(repeating: "$", count: restaurant.priceLevel))
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Spacer()
            }
            .padding()
        }
        .frame(width: 300, height: 400)
        .offset(x: offset.width)
        .rotationEffect(.degrees(Double(offset.width / 20)))
        .gesture(
            DragGesture()
                .onChanged { gesture in
                    offset = gesture.translation
                }
                .onEnded { _ in
                    if offset.width > 100 {
                        // Swipe right
                        onSwipe(.right)
                    } else if offset.width < -100 {
                        // Swipe left
                        onSwipe(.left)
                    } else {
                        withAnimation {
                            offset = .zero
                        }
                    }
                }
        )
        .animation(.spring(), value: offset)
    }
}

struct RestaurantCard_Previews: PreviewProvider {
    static var previews: some View {
        RestaurantCard(
            restaurant: Restaurant(
                id: "1",
                name: "Example Restaurant",
                distance: 1.2,
                priceLevel: 2,
                images: [URL(string: "https://via.placeholder.com/300")!]
            ),
            onSwipe: { _ in }
        )
    }
}
