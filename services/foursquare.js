import { FOURSQUARE_API_KEY } from '../config';

const BASE_URL = 'https://api.foursquare.com/v3/places/search';
const FOOD_CATEGORY = '13000';

function milesToMeters(miles) {
  return Math.round(miles * 1609.34);
}

function buildPhotoUrl(photo) {
  if (!photo) return null;
  return `${photo.prefix}original${photo.suffix}`;
}

export async function fetchNearbyRestaurants({ latitude, longitude, radiusMiles = 1 }) {
  // Build URL manually — URLSearchParams can be unreliable in React Native
  const url =
    `${BASE_URL}` +
    `?ll=${latitude},${longitude}` +
    `&radius=${milesToMeters(radiusMiles)}` +
    `&categories=${FOOD_CATEGORY}` +
    `&limit=50` +
    `&fields=fsq_id,name,distance,price,photos,location,rating`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: FOURSQUARE_API_KEY,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Foursquare error ${response.status}: ${text}`);
  }

  const data = await response.json();

  return (data.results || []).map((place) => ({
    id: place.fsq_id,
    name: place.name,
    distance: place.distance ? (place.distance / 1609.34).toFixed(1) : '?',
    priceLevel: place.price ?? 1,
    images: (place.photos || []).map(buildPhotoUrl).filter(Boolean),
    address:
      place.location?.formatted_address ??
      place.location?.address ??
      'Address unavailable',
    rating: place.rating ? (place.rating / 2).toFixed(1) : null,
    userRatingsTotal: null,
  }));
}
