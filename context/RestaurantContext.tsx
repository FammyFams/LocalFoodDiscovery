import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant, RestaurantContextValue } from '../types';

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

const LIKED_KEY = '@foodtinder_liked';
const NOT_NOW_KEY = '@foodtinder_notnow';

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [likedRestaurants, setLikedRestaurants] = useState<Restaurant[]>([]);
  const [notNowRestaurants, setNotNowRestaurants] = useState<Restaurant[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [liked, notNow] = await Promise.all([
          AsyncStorage.getItem(LIKED_KEY),
          AsyncStorage.getItem(NOT_NOW_KEY),
        ]);
        if (liked) setLikedRestaurants(JSON.parse(liked));
        if (notNow) setNotNowRestaurants(JSON.parse(notNow));
      } catch (e) { console.warn('[RestaurantContext] Failed to load saved data:', e); }
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(LIKED_KEY, JSON.stringify(likedRestaurants)).catch((e) => console.warn('[RestaurantContext] Failed to save liked:', e));
  }, [likedRestaurants, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(NOT_NOW_KEY, JSON.stringify(notNowRestaurants)).catch((e) => console.warn('[RestaurantContext] Failed to save notNow:', e));
  }, [notNowRestaurants, loaded]);

  const likeRestaurant = useCallback((restaurant: Restaurant) => {
    setLikedRestaurants((prev) => {
      if (prev.some((r) => r.id === restaurant.id)) return prev;
      return [restaurant, ...prev];
    });
  }, []);

  const dislikeRestaurant = useCallback((restaurant: Restaurant) => {
    setNotNowRestaurants((prev) => {
      if (prev.some((r) => r.id === restaurant.id)) return prev;
      return [restaurant, ...prev];
    });
  }, []);

  const removeLiked = useCallback((id: string) => {
    setLikedRestaurants((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const removeNotNow = useCallback((id: string) => {
    setNotNowRestaurants((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setLikedRestaurants([]);
    setNotNowRestaurants([]);
  }, []);

  return (
    <RestaurantContext.Provider
      value={{ likedRestaurants, notNowRestaurants, likeRestaurant, dislikeRestaurant, removeLiked, removeNotNow, clearAll, loaded }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurants(): RestaurantContextValue {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurants must be used inside RestaurantProvider');
  return ctx;
}
