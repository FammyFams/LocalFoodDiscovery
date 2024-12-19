//
//  NotNowView.swift
//  LocalFoodDiscovery
//
//  Created by Matthew Zheng on 12/19/24.
//

import SwiftUI

struct NotNowView: View {
    let restaurants: [Restaurant]

    var body: some View {
        List(restaurants) { restaurant in
            NavigationLink(destination: RestaurantDetailView(restaurant: restaurant)) {
                Text(restaurant.name)
            }
        }
        .navigationTitle("Not Now")
    }
}
