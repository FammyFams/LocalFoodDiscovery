//
//  Restaurant.swift
//  LocalFoodDiscovery
//
//  Created by Matthew Zheng on 12/18/24.
//

import Foundation

struct Restaurant: Identifiable {
    let id: String
    let name: String
    let distance: Double
    let priceLevel: Int
    let images: [URL]
    let address: String
    let rating: Double?
    let userRatingsTotal: Int?
}
