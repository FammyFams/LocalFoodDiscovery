import { PLACES_PROXY_URL } from '../env';
import { Restaurant } from '../types';

const MAX_RADIUS_MILES: number = 31; // Google Places API cap (~50km)

function milesToMeters(miles: number): number {
  return Math.round(Math.min(miles, MAX_RADIUS_MILES) * 1609.34);
}

// Photos load via the proxy's /photo endpoint, which 302-redirects to a
// signed Google CDN URL. The Google API key never touches the client.
export function getPhotoUrl(photoName: string): string {
  return `${PLACES_PROXY_URL}/photo?name=${encodeURIComponent(photoName)}&maxHeightPx=800`;
}

function parsePriceLevel(level: string | undefined): number {
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[level as string] ?? 1;
}


function parseTypes(types: string[] = []): string[] {
  const skip = new Set(['restaurant', 'food', 'point_of_interest', 'establishment', 'store']);
  return types
    .filter((t) => !skip.has(t))
    .map((t) => t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .slice(0, 4);
}


// Card-view fields only (Basic/Essential SKU tier — much cheaper)
const CARD_FIELD_MASK: string = [
  'places.id',
  'places.displayName',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.photos',
  'places.formattedAddress',
  'places.location',
  'places.regularOpeningHours',
  'places.types',
].join(',');

// Detail-only fields fetched on demand via Place Details
const DETAIL_FIELD_MASK: string = [
  'editorialSummary',
  'nationalPhoneNumber',
  'websiteUri',
  'servesBeer',
  'servesWine',
  'servesBrunch',
  'servesBreakfast',
  'servesLunch',
  'servesDinner',
  'takeout',
  'delivery',
  'dineIn',
].join(',');

interface FetchBucketParams {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  includedTypes: string[];
  excludedTypes: string[];
}

async function fetchOneBucket({ latitude, longitude, radiusMiles, includedTypes, excludedTypes }: FetchBucketParams): Promise<any[]> {
  const body = {
    includedTypes,
    ...(excludedTypes.length > 0 && { excludedTypes }),
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius: milesToMeters(radiusMiles),
      },
    },
  };
  if (!PLACES_PROXY_URL) {
    throw new Error('Restaurant service URL not configured');
  }
  const response = await fetch(`${PLACES_PROXY_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, fieldMask: CARD_FIELD_MASK }),
  });
  if (!response.ok) {
    throw new Error(`Restaurant search failed (${response.status})`);
  }
  const data = await response.json();
  return data.places || [];
}

interface FetchNearbyParams {
  latitude: number;
  longitude: number;
  radiusMiles?: number;
  cuisineTypes?: string[];
  noFastFood?: boolean;
  noConvenienceStore?: boolean;
}

export async function fetchNearbyRestaurants({ latitude, longitude, radiusMiles = 1, cuisineTypes = [], noFastFood = false, noConvenienceStore = false }: FetchNearbyParams): Promise<Restaurant[]> {
  const excludedTypes: string[] = [
    ...(noFastFood ? ['fast_food_restaurant'] : []),
    ...(noConvenienceStore ? ['convenience_store', 'gas_station'] : []),
  ];

  let rawPlaces: any[];
  if (cuisineTypes.length === 0) {
    rawPlaces = await fetchOneBucket({
      latitude, longitude, radiusMiles,
      includedTypes: ['restaurant'],
      excludedTypes,
    });
  } else {
    rawPlaces = await fetchOneBucket({
      latitude, longitude, radiusMiles,
      includedTypes: cuisineTypes,
      excludedTypes,
    });
  }

  const HOTEL_TYPES = new Set(['hotel', 'motel', 'lodging', 'extended_stay_hotel', 'resort_hotel', 'bed_and_breakfast', 'hostel', 'inn']);

  const filtered = rawPlaces.filter((place: any) => {
    if (place.types?.some((t: string) => HOTEL_TYPES.has(t))) return false;
    return true;
  });

  // Partition into open and closed, shuffle each group, then concat
  // so closed restaurants appear at the back instead of being discarded
  const open = filtered.filter((p: any) => p.regularOpeningHours?.openNow !== false);
  const closed = filtered.filter((p: any) => p.regularOpeningHours?.openNow === false);

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  const shuffled = [...shuffle(open), ...shuffle(closed)];

  return shuffled.map((place: any): Restaurant => ({
    id: place.id,
    name: place.displayName?.text ?? 'Unknown',
    distance: null,
    priceLevel: parsePriceLevel(place.priceLevel),
    images: (place.photos || []).slice(0, 1).map((p: any) => getPhotoUrl(p.name)),
    allPhotoRefs: (place.photos || []).slice(0, 2).map((p: any) => p.name),
    address: place.formattedAddress ?? 'Address unavailable',
    rating: place.rating ? place.rating.toFixed(1) : null,
    userRatingsTotal: place.userRatingCount ?? null,
    // Detail fields — null until fetched on demand via fetchRestaurantDetails()
    description: null,
    phone: null,
    website: null,
    openNow: place.regularOpeningHours?.openNow ?? null,
    hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    types: parseTypes(place.types),
    tags: [],
  }));
}

export async function fetchRestaurantDetails(placeId: string): Promise<Partial<Restaurant>> {
  if (!PLACES_PROXY_URL) {
    throw new Error('Restaurant service URL not configured');
  }
  const response = await fetch(
    `${PLACES_PROXY_URL}/details?id=${encodeURIComponent(placeId)}`
  );
  if (!response.ok) {
    throw new Error(`Detail fetch failed (${response.status})`);
  }
  const place = await response.json();
  return {
    description: place.editorialSummary?.text ?? null,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    tags: [
      place.dineIn && 'Dine In',
      place.takeout && 'Takeout',
      place.delivery && 'Delivery',
      place.servesBreakfast && 'Breakfast',
      place.servesBrunch && 'Brunch',
      place.servesLunch && 'Lunch',
      place.servesDinner && 'Dinner',
      place.servesBeer && 'Beer',
      place.servesWine && 'Wine',
    ].filter(Boolean) as string[],
  };
}

export { DETAIL_FIELD_MASK };
