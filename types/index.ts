export interface Restaurant {
  id: string;
  name: string;
  distance: number | null;
  priceLevel: number;
  images: string[];
  allPhotoRefs: string[];
  address: string;
  rating: string | null;
  userRatingsTotal: number | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  openNow: boolean | null;
  hours: string[];
  types: string[];
  tags: string[];
}

export interface Theme {
  bg: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
  separator: string;
  border: string;
  accent: string;
  accentLight: string;
  orange: string;
  destructive: string;
  green: string;
  red: string;
  blue: string;
  cardBg: string;
  inputBg: string;
  tabBar: string;
  overlay: string;
  chipActive: string;
  chipActiveText: string;
  chipInactive: string;
  chipInactiveText: string;
}

export interface Settings {
  darkMode: boolean;
  dietPreferences: string[];
  dietRestrictionsEnabled?: boolean;
  priceRange: number[];
}

export interface RestaurantContextValue {
  likedRestaurants: Restaurant[];
  notNowRestaurants: Restaurant[];
  likeRestaurant: (restaurant: Restaurant) => void;
  dislikeRestaurant: (restaurant: Restaurant) => void;
  removeLiked: (id: string) => void;
  removeNotNow: (id: string) => void;
  clearAll: () => void;
  loaded: boolean;
}

export interface SettingsContextValue {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  loaded: boolean;
}

export interface CuisineOption {
  label: string;
  type: string | null;
  emoji: string;
}

export type RootStackParamList = {
  Tabs: undefined;
  Detail: { restaurant: Restaurant };
  MapPicker: { initialCoords?: { latitude: number; longitude: number }; initialRadius?: number };
  DietPreferences: undefined;
  Decision: undefined;
};

export type TabParamList = {
  Discover: { pickedLocation?: { latitude: number; longitude: number }; pickedRadius?: number } | undefined;
  Liked: undefined;
  'Not Now': undefined;
  Account: undefined;
};
