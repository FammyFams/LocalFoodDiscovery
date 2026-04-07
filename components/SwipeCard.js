import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function getNextOpenTime(hours) {
  if (!hours || hours.length === 0) return null;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  const todayEntry = hours.find((h) => h.startsWith(today));
  if (!todayEntry) return null;
  // e.g. "Monday: 11:00 AM – 9:00 PM" or "Monday: Closed"
  const match = todayEntry.match(/:\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
  return match ? match[1].trim() : null;
}
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 24, 420);
// Subtract header (~100), action buttons (~70), tab bar (~90) from screen height
const CARD_HEIGHT = SCREEN_HEIGHT - 310;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.22;
const SWIPE_OUT_DURATION = 300;

const SwipeCard = forwardRef(function SwipeCard({ restaurant, onSwipeLeft, onSwipeRight, onPress, isTop, index }, ref) {
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const position = useRef(new Animated.ValueXY()).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const isTopRef = useRef(isTop);
  isTopRef.current = isTop;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => isTopRef.current && (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5),
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.3 });
        const progress = Math.min(Math.abs(gesture.dx) / SWIPE_THRESHOLD, 1);
        cardScale.setValue(1 + progress * 0.04);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) swipeOut('right');
        else if (gesture.dx < -SWIPE_THRESHOLD) swipeOut('left');
        else resetPosition();
      },
    })
  ).current;

  function swipeOut(direction) {
    const x = direction === 'right' ? SCREEN_WIDTH * 1.6 : -SCREEN_WIDTH * 1.6;
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x, y: 0 },
        duration: SWIPE_OUT_DURATION,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.spring(cardScale, { toValue: 1.1, useNativeDriver: false, speed: 60 }),
        Animated.timing(cardScale, { toValue: 0.85, duration: SWIPE_OUT_DURATION - 60, useNativeDriver: false }),
      ]),
    ]).start(() => {
      if (direction === 'right') onSwipeRight(restaurant);
      else onSwipeLeft(restaurant);
    });
  }

  useImperativeHandle(ref, () => ({
    swipeLeft: () => swipeOut('left'),
    swipeRight: () => swipeOut('right'),
  }));

  function resetPosition() {
    Animated.parallel([
      Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 6, tension: 80, useNativeDriver: false }),
      Animated.spring(cardScale, { toValue: 1, friction: 4, useNativeDriver: false }),
    ]).start();
  }

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-20deg', '0deg', '20deg'],
  });

  const likeProgress = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeProgress = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const likeTintOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 0.55],
    extrapolate: 'clamp',
  });
  const nopeTintOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [0.55, 0],
    extrapolate: 'clamp',
  });

  const likeGlowOpacity = likeProgress;
  const nopeGlowOpacity = nopeProgress;

  const wrapperStyle = isTop
    ? { zIndex: 10, transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }, { scale: cardScale }] }
    : { zIndex: 5 };

  const imageUri = restaurant.images?.[0];

  return (
    <Animated.View style={[styles.wrapper, wrapperStyle]} {...(isTop ? panResponder.panHandlers : {})}>

      <Animated.View style={[styles.glowBorder, styles.likeGlow, { opacity: likeGlowOpacity }]} />
      <Animated.View style={[styles.glowBorder, styles.nopeGlow, { opacity: nopeGlowOpacity }]} />

      <View style={styles.card}>
        <TouchableOpacity activeOpacity={0.95} onPress={() => isTop && onPress(restaurant)} style={styles.touchable}>

          <Animated.View style={[styles.tint, { backgroundColor: t.green, opacity: likeTintOpacity }]} />
          <Animated.View style={[styles.tint, { backgroundColor: t.red, opacity: nopeTintOpacity }]} />

          <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeProgress }]}>
            <Text style={styles.likeStampText}>LIKE</Text>
          </Animated.View>

          <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeProgress }]}>
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
              {restaurant.rating && (
                <Text style={styles.metaText}>{'  '}⭐ {restaurant.rating}</Text>
              )}
              {restaurant.openNow !== null && (
                <Text style={[styles.metaText, { color: restaurant.openNow ? '#81C784' : '#EF9A9A' }]}>
                  {'  '}{restaurant.openNow ? '● Open' : `● Closed${getNextOpenTime(restaurant.hours) ? ` (Opens ${getNextOpenTime(restaurant.hours)})` : ''}`}
                </Text>
              )}
            </View>
            {restaurant.types?.length > 0 && (
              <Text style={styles.cuisine} numberOfLines={1}>{restaurant.types.join(' · ')}</Text>
            )}
            <Text style={styles.address} numberOfLines={1}>{restaurant.address}</Text>
          </View>

        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

export default SwipeCard;

const BORDER_RADIUS = 18;
const GLOW_SPREAD = 3;

function createStyles(t) {
  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
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
    touchable: { flex: 1 },
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
      fontSize: 22, fontWeight: '800', color: t.green, letterSpacing: 2,
    },
    nopeStampText: {
      fontSize: 22, fontWeight: '800', color: t.red, letterSpacing: 2,
    },
    infoOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18,
      backgroundColor: t.card,
      borderTopLeftRadius: 18, borderTopRightRadius: 18,
      zIndex: 3,
    },
    name: { fontSize: 20, fontWeight: '700', color: t.text, marginBottom: 4, letterSpacing: -0.3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    metaText: { fontSize: 13, color: t.textSecondary, fontWeight: '500' },
    cuisine: { fontSize: 12, color: t.textTertiary, marginBottom: 2 },
    address: { fontSize: 12, color: t.textQuaternary },
  });
}
