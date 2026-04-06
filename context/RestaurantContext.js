import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RestaurantContext = createContext(null);

const LIKED_KEY = '@foodtinder_liked';
const NOT_NOW_KEY = '@foodtinder_notnow';

export function RestaurantProvider({ children }) {
  const [likedRestaurants, setLikedRestaurants] = useState([]);
  const [notNowRestaurants, setNotNowRestaurants] = useState([]);
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
      } catch {}
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(LIKED_KEY, JSON.stringify(likedRestaurants)).catch(() => {});
  }, [likedRestaurants, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(NOT_NOW_KEY, JSON.stringify(notNowRestaurants)).catch(() => {});
  }, [notNowRestaurants, loaded]);

  const likeRestaurant = useCallback((restaurant) => {
    setLikedRestaurants((prev) => {
      if (prev.some((r) => r.id === restaurant.id)) return prev;
      return [restaurant, ...prev];
    });
  }, []);

  const dislikeRestaurant = useCallback((restaurant) => {
    setNotNowRestaurants((prev) => {
      if (prev.some((r) => r.id === restaurant.id)) return prev;
      return [restaurant, ...prev];
    });
  }, []);

  const removeLiked = useCallback((id) => {
    setLikedRestaurants((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const removeNotNow = useCallback((id) => {
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

export function useRestaurants() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurants must be used inside RestaurantProvider');
  return ctx;
}
