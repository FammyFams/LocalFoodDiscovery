# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start the dev server (opens Expo Go QR code)
npm start

# Run on a specific platform
npm run android
npm run ios
npm run web
```

There are no tests or linting scripts configured.

## API Key Setup


The app requires a `config.js` file in the project root (gitignored). Create it before running:

```js
// config.js
export const GOOGLE_API_KEY = 'your-google-places-api-key';
```

The Google Places API (v1 — New) must have the **Places API (New)** enabled in Google Cloud Console.

## Architecture

This is a React Native (Expo) app called **foodFinder** — a Tinder-style restaurant discovery app.

**Navigation structure** (`App.js`):
- Root: `Stack.Navigator`
  - `Tabs` → `Tab.Navigator` with three tabs: Discover (`MainScreen`), Liked (`LikedScreen`), Not Now (`NotNowScreen`)
  - `Detail` — full restaurant detail view (modal-style push)
  - `MapPicker` — fullscreen modal for picking a location on a map
  - `Decision` — fullscreen modal shown after every 10 likes to help pick a restaurant

**State management** (`context/RestaurantContext.js`):
- Single React Context (`RestaurantProvider`) wraps the whole app
- Persists `likedRestaurants` and `notNowRestaurants` arrays to `AsyncStorage`
- Exposes: `likeRestaurant`, `dislikeRestaurant`, `removeLiked`, `removeNotNow`, `clearAll`
- Hook: `useRestaurants()`

**Data fetching** (`services/googlePlaces.js`):
- Calls Google Places API (New) `searchNearby` endpoint
- Returns a normalized restaurant object with: `id`, `name`, `rating`, `priceLevel`, `images[]`, `address`, `tags[]`, `types[]`, `hours[]`, `phone`, `website`, `openNow`, `description`
- `services/yelp.js` and `services/foursquare.js` exist as alternative/unused service stubs

**Core swipe flow** (`screens/MainScreen.js` + `components/SwipeCard.js`):
- `MainScreen` manages restaurant queue, location, radius filter (0.5–5 miles), and auto-fetches more when fewer than 5 cards remain
- Cards already acted on are filtered out via a `Set` of liked+notNow IDs before rendering
- Only the top 3 cards render at once; the top card gets a `ref` (`topCardRef`) so the action buttons can imperatively trigger swipes
- `SwipeCard` is a gesture-driven card using `react-native-gesture-handler` and `react-native-reanimated`

**Location handling**:
- Default: device GPS via `expo-location`
- Alternatives: text search (geocoded via `expo-location`), or map pin via `MapPickerScreen` (uses `react-native-maps`)
- Picked map location is passed back to `MainScreen` via `route.params.pickedLocation`

**Brand color**: `#FF6B35` (orange) used throughout for primary actions and accents.
