import React, { useRef, forwardRef, useImperativeHandle } from 'react';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 420);
const CARD_HEIGHT = Math.min(SCREEN_HEIGHT * 0.62, 520);
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.22;
const SWIPE_OUT_DURATION = 300;

const SwipeCard = forwardRef(function SwipeCard({ restaurant, onSwipeLeft, onSwipeRight, onPress, isTop, index }, ref) {
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

          <Animated.View style={[styles.tint, { backgroundColor: '#4CAF50', opacity: likeTintOpacity }]} />
          <Animated.View style={[styles.tint, { backgroundColor: '#F44336', opacity: nopeTintOpacity }]} />

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
                  {'  '}{restaurant.openNow ? '● Open' : '● Closed'}
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

const BORDER_RADIUS = 20;
const GLOW_SPREAD = 4;

const styles = StyleSheet.create({
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
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  nopeGlow: {
    borderColor: '#F44336',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  card: {
    flex: 1,
    borderRadius: BORDER_RADIUS,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  touchable: { flex: 1 },
  image: { position: 'absolute', width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center',
  },
  tint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 2,
  },
  stamp: {
    position: 'absolute', top: 44, zIndex: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 4, borderRadius: 8,
  },
  likeStamp: {
    left: 20,
    borderColor: '#4CAF50',
    transform: [{ rotate: '-22deg' }],
  },
  nopeStamp: {
    right: 20,
    borderColor: '#F44336',
    transform: [{ rotate: '22deg' }],
  },
  likeStampText: {
    fontSize: 24, fontWeight: '900', color: '#4CAF50', letterSpacing: 2,
  },
  nopeStampText: {
    fontSize: 24, fontWeight: '900', color: '#F44336', letterSpacing: 2,
  },
  infoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 3,
  },
  name: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  metaText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  cuisine: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 3 },
  address: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
});
