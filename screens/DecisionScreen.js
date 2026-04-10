import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
} from 'react-native';
import SwipeCard from '../components/SwipeCard';
import { useRestaurants } from '../context/RestaurantContext';
import { useTheme } from '../context/ThemeContext';
import { trackEvent } from '../services/analytics';

export default function DecisionScreen({ navigation }) {
  const { likedRestaurants, removeLiked, dislikeRestaurant } = useRestaurants();
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);

  // Snapshot the liked list when this screen opens so the deck is stable
  const [deck, setDeck] = useState(() => [...likedRestaurants]);
  const [kept, setKept] = useState([]);

  const topCardRef = useRef(null);
  const likeScale = useRef(new Animated.Value(1)).current;
  const nopeScale = useRef(new Animated.Value(1)).current;

  function animateButton(anim) {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.3, useNativeDriver: true, speed: 50, bounciness: 20 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
  }

  function handleKeep(restaurant) {
    trackEvent('decision_kept', {
      restaurant_id: restaurant.id,
      name: restaurant.name,
    });
    setKept((prev) => [...prev, restaurant]);
    setDeck((prev) => prev.filter((r) => r.id !== restaurant.id));
  }

  function handleRemove(restaurant) {
    trackEvent('decision_removed', {
      restaurant_id: restaurant.id,
      name: restaurant.name,
    });
    removeLiked(restaurant.id);
    dislikeRestaurant(restaurant);
    setDeck((prev) => prev.filter((r) => r.id !== restaurant.id));
  }

  const visibleCards = deck.slice(0, 3);
  const done = deck.length === 0;

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.doneContainer}>
          <Text style={styles.doneEmoji}>{kept.length === 0 ? '🤔' : '🎯'}</Text>
          <Text style={styles.doneTitle}>
            {kept.length === 0
              ? 'No places left!'
              : `You narrowed it down to ${kept.length}!`}
          </Text>
          <Text style={styles.doneSub}>
            {kept.length === 0
              ? 'Head back and save some more spots.'
              : kept.length === 1
              ? `Looks like ${kept[0].name} is the one. Let\'s go! 🚀`
              : 'Check your Liked tab to see your finalists.'}
          </Text>

          {kept.length === 1 && (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => navigation.navigate('Detail', { restaurant: kept[0] })}
            >
              <Text style={styles.viewButtonText}>View {kept[0].name} →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.viewButton, kept.length !== 1 && { backgroundColor: t.accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.viewButtonText}>
              {kept.length === 1 ? 'Go Back' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Narrow It Down</Text>
          <Text style={styles.headerSub}>{deck.length} left · keep right, remove left</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((likedRestaurants.length - deck.length) / likedRestaurants.length) * 100}%` },
          ]}
        />
      </View>

      {/* Cards */}
      <View style={styles.cardArea}>
        {[...visibleCards].reverse().map((restaurant, reverseIndex) => {
          const index = visibleCards.length - 1 - reverseIndex;
          return (
            <SwipeCard
              key={restaurant.id}
              ref={index === 0 ? topCardRef : null}
              restaurant={restaurant}
              isTop={index === 0}
              index={index}
              onSwipeRight={handleKeep}
              onSwipeLeft={handleRemove}
              onPress={(r) => navigation.navigate('Detail', { restaurant: r })}
            />
          );
        })}
      </View>

      {/* Buttons */}
      <View style={styles.actionRow}>
        <View style={styles.actionHint}>
          <Text style={styles.hintText}>Remove</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: nopeScale }] }}>
          <TouchableOpacity
            style={[styles.actionButton, styles.nopeButton]}
            onPress={() => { animateButton(nopeScale); topCardRef.current?.swipeLeft(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: likeScale }] }}>
          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => { animateButton(likeScale); topCardRef.current?.swipeRight(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>♥</Text>
          </TouchableOpacity>
        </Animated.View>
        <View style={styles.actionHint}>
          <Text style={styles.hintText}>Keep</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },

    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: t.surface, borderBottomWidth: 0.5, borderBottomColor: t.separator,
    },
    backButton: { padding: 4 },
    backText: { fontSize: 30, fontWeight: '600', color: t.text, lineHeight: 34 },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '600', color: t.text },
    headerSub: { fontSize: 12, color: t.textTertiary, marginTop: 2 },

    progressBar: {
      height: 2, backgroundColor: t.separator,
    },
    progressFill: {
      height: 2, backgroundColor: t.accent, borderRadius: 1,
    },

    cardArea: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
    },

    actionRow: {
      flexDirection: 'row', justifyContent: 'center',
      alignItems: 'center', gap: 16,
      paddingVertical: 16, paddingBottom: 24,
      backgroundColor: t.surface,
      borderTopWidth: 0.5, borderTopColor: t.separator,
    },
    actionHint: { width: 48, alignItems: 'center' },
    hintText: { fontSize: 11, color: t.textQuaternary, fontWeight: '500' },
    actionButton: {
      width: 60, height: 60, borderRadius: 30,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
    },
    nopeButton: { backgroundColor: t.card, borderWidth: 1.5, borderColor: t.red },
    likeButton: { backgroundColor: t.card, borderWidth: 1.5, borderColor: t.green },
    actionButtonText: { fontSize: 24, fontWeight: '600' },

    // Done screen
    doneContainer: {
      flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36,
    },
    doneEmoji: { fontSize: 56, marginBottom: 16 },
    doneTitle: { fontSize: 22, fontWeight: '700', color: t.text, textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
    doneSub: { fontSize: 15, color: t.textTertiary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    viewButton: {
      backgroundColor: t.accent, borderRadius: 12,
      paddingVertical: 14, paddingHorizontal: 32,
      width: '100%', alignItems: 'center', marginBottom: 10,
    },
    viewButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  });
}
