import React, { forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { Restaurant, Theme } from '../types';

function getNextOpenTime(hours: string[]): string | null {
  if (!hours || hours.length === 0) return null;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  const todayEntry = hours.find((h) => h.startsWith(today));
  if (!todayEntry) return null;
  const match = todayEntry.match(/:\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
  return match ? match[1].trim() : null;
}

const CARD_MAX_WIDTH = 420;
const CARD_HEIGHT_RATIO = 0.62;
const SWIPE_THRESHOLD_RATIO = 0.12;
const SWIPE_OUT_DURATION = 300;
const BORDER_RADIUS = 24;
const GLOW_SPREAD = 3;

interface SwipeCardProps {
  restaurant: Restaurant;
  onSwipeLeft: (restaurant: Restaurant) => void;
  onSwipeRight: (restaurant: Restaurant) => void;
  onPress: (restaurant: Restaurant) => void;
  isTop: boolean;
  index: number;
}

export interface SwipeCardRef {
  swipeLeft: () => void;
  swipeRight: () => void;
}

const SwipeCard = forwardRef<SwipeCardRef, SwipeCardProps>(function SwipeCard(
  { restaurant, onSwipeLeft, onSwipeRight, onPress, isTop, index },
  ref,
) {
  const t = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const styles = useThemedStyles(createStyles);

  const cardWidth = Math.min(screenWidth - 32, CARD_MAX_WIDTH);
  const cardHeight = screenHeight * CARD_HEIGHT_RATIO;
  const swipeThreshold = screenWidth * SWIPE_THRESHOLD_RATIO;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const fireSwipeRight = useCallback(() => onSwipeRight(restaurant), [onSwipeRight, restaurant]);
  const fireSwipeLeft = useCallback(() => onSwipeLeft(restaurant), [onSwipeLeft, restaurant]);
  const firePress = useCallback(() => onPress(restaurant), [onPress, restaurant]);

  const swipeOut = useCallback((direction: 'left' | 'right') => {
    const targetX = direction === 'right' ? screenWidth * 1.6 : -screenWidth * 1.6;
    const callback = direction === 'right' ? fireSwipeRight : fireSwipeLeft;
    translateX.value = withTiming(targetX, { duration: SWIPE_OUT_DURATION, easing: Easing.out(Easing.cubic) }, () => {
      runOnJS(callback)();
    });
    translateY.value = withTiming(0, { duration: SWIPE_OUT_DURATION });
    scale.value = withTiming(0.85, { duration: SWIPE_OUT_DURATION });
  }, [screenWidth, fireSwipeRight, fireSwipeLeft, translateX, translateY, scale]);

  useImperativeHandle(ref, () => ({
    swipeLeft: () => { swipeOut('left'); },
    swipeRight: () => { swipeOut('right'); },
  }));

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
      const progress = Math.min(Math.abs(e.translationX) / swipeThreshold, 1);
      scale.value = 1 + progress * 0.04;
    })
    .onEnd((e) => {
      if (e.translationX > swipeThreshold) {
        runOnJS(swipeOut)('right');
      } else if (e.translationX < -swipeThreshold) {
        runOnJS(swipeOut)('left');
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }
    });

  const tap = Gesture.Tap()
    .enabled(isTop)
    .onEnd(() => {
      runOnJS(firePress)();
    });

  const gesture = Gesture.Race(pan, tap);

  const wrapperAnimatedStyle = useAnimatedStyle(() => {
    if (!isTop) return { zIndex: 5 } as const;
    const rot = interpolate(
      translateX.value,
      [-screenWidth, 0, screenWidth],
      [-20, 0, 20],
    );
    return {
      zIndex: 10,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rot}deg` },
        { scale: scale.value },
      ],
    } as const;
  });

  const likeGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, swipeThreshold], [0, 1], 'clamp'),
  }));

  const nopeGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-swipeThreshold, 0], [1, 0], 'clamp'),
  }));

  const likeTintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, swipeThreshold], [0, 0.55], 'clamp'),
  }));

  const nopeTintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-swipeThreshold, 0], [0.55, 0], 'clamp'),
  }));

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, swipeThreshold], [0, 1], 'clamp'),
  }));

  const nopeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-swipeThreshold, 0], [1, 0], 'clamp'),
  }));

  const imageUri = restaurant.images?.[0];

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.wrapper, { width: cardWidth, height: cardHeight }, wrapperAnimatedStyle]}>
        <Animated.View style={[styles.glowBorder, styles.likeGlow, likeGlowStyle]} />
        <Animated.View style={[styles.glowBorder, styles.nopeGlow, nopeGlowStyle]} />

        <View style={styles.card}>
          <Animated.View style={[styles.tint, { backgroundColor: t.green }, likeTintStyle]} />
          <Animated.View style={[styles.tint, { backgroundColor: t.red }, nopeTintStyle]} />

          <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle]}>
            <Text style={styles.likeStampText}>LIKE</Text>
          </Animated.View>

          <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStampStyle]}>
            <Text style={styles.nopeStampText}>NOPE</Text>
          </Animated.View>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: 64 }}>🍽️</Text>
            </View>
          )}

          <View style={styles.infoOverlay}>
            <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
            <View style={styles.metaRow}>
              {restaurant.priceLevel > 0 && (
                <Text style={styles.metaText}>{'$'.repeat(restaurant.priceLevel)}</Text>
              )}
              {restaurant.rating != null && (
                <Text style={styles.metaText}>{'  '}⭐ {restaurant.rating}</Text>
              )}
              {restaurant.openNow !== null && (
                <Text style={[styles.metaText, { color: restaurant.openNow ? '#81C784' : '#EF9A9A' }]}>
                  {'  '}{restaurant.openNow ? '● Open' : `● Closed${getNextOpenTime(restaurant.hours) ? ` (Opens ${getNextOpenTime(restaurant.hours)})` : ''}`}
                </Text>
              )}
            </View>
            {(restaurant.types?.length ?? 0) > 0 && (
              <Text style={styles.cuisine} numberOfLines={1}>{restaurant.types.join(' · ')}</Text>
            )}
            <Text style={styles.address} numberOfLines={1}>{restaurant.address}</Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

export default SwipeCard;

function createStyles(t: Theme) {
  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      alignSelf: 'center',
    },
    glowBorder: {
      position: 'absolute',
      top: -GLOW_SPREAD,
      left: -GLOW_SPREAD,
      right: -GLOW_SPREAD,
      bottom: -GLOW_SPREAD,
      borderRadius: BORDER_RADIUS + GLOW_SPREAD,
      borderWidth: GLOW_SPREAD,
    },
    likeGlow: {
      borderColor: t.green,
      shadowColor: t.green,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 16,
      elevation: 16,
    },
    nopeGlow: {
      borderColor: t.red,
      shadowColor: t.red,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 16,
      elevation: 16,
    },
    card: {
      flex: 1,
      borderRadius: BORDER_RADIUS,
      backgroundColor: t.card,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    image: { position: 'absolute', width: '100%', height: '100%' },
    imagePlaceholder: {
      width: '100%', height: '100%',
      backgroundColor: t.inputBg, justifyContent: 'center', alignItems: 'center',
    },
    tint: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 2,
    },
    stamp: {
      position: 'absolute', top: 44, zIndex: 10,
      paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 3, borderRadius: 6,
    },
    likeStamp: {
      left: 20,
      borderColor: t.green,
      transform: [{ rotate: '-22deg' }],
    },
    nopeStamp: {
      right: 20,
      borderColor: t.red,
      transform: [{ rotate: '22deg' }],
    },
    likeStampText: {
      fontSize: 22, fontFamily: 'Lora_700Bold', color: t.green, letterSpacing: 2,
    },
    nopeStampText: {
      fontSize: 22, fontFamily: 'Lora_700Bold', color: t.red, letterSpacing: 2,
    },
    infoOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18,
      backgroundColor: t.card,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      zIndex: 3,
    },
    name: { fontSize: 20, fontFamily: 'Lora_700Bold', color: t.text, marginBottom: 4, letterSpacing: -0.3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    metaText: { fontSize: 13, color: t.textSecondary, fontFamily: 'Raleway_500Medium' },
    cuisine: { fontSize: 12, color: t.textTertiary, fontFamily: 'Raleway_400Regular', marginBottom: 2 },
    address: { fontSize: 12, color: t.textTertiary, fontFamily: 'Raleway_400Regular' },
  });
}
