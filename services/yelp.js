import { YELP_API_KEY } from '../config';

const BASE_URL = 'https://api.yelp.com/v3/businesses/search';

function milesToMeters(miles) {
  return Math.min(Math.round(miles * 1609.34), 40000); // Yelp max radius is 40km
}

export async function fetchNearbyRestaurants({ latitude, longitude, radiusMiles = 1 }) {
  const url =
    `${BASE_URL}` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&radius=${milesToMeters(radiusMiles)}` +
    `&categories=food,restaurants` +
    `&limit=50` +
    `&sort_by=distance`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${YELP_API_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Yelp error ${response.status}: ${text}`);
  }

  const data = await response.json();

  return (data.businesses || []).map((biz) => ({
    id: biz.id,
    name: biz.name,
    distance: biz.distance ? (biz.distance / 1609.34).toFixed(1) : '?',
    priceLevel: biz.price ? biz.price.length : 1, // "$" -> 1, "$$" -> 2, etc.
    images: biz.image_url ? [biz.image_url] : [],
    address: biz.location?.display_address?.join(', ') ?? 'Address unavailable',
    rating: biz.rating ? biz.rating.toFixed(1) : null,
    userRatingsTotal: biz.review_count ?? null,
  }));
}
