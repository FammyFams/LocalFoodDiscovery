import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { Restaurant, Theme } from '../types';

interface DecisionPromptModalProps {
  visible: boolean;
  likedRestaurants: Restaurant[];
  onGoToDecision: () => void;
  onDismiss: () => void;
}

export default function DecisionPromptModal({
  visible,
  likedRestaurants,
  onGoToDecision,
  onDismiss,
}: DecisionPromptModalProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>You've liked {likedRestaurants.length} places!</Text>
          <Text style={styles.sub}>
            Ready to pick where to eat? Browse your saved spots and decide.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
            {likedRestaurants.slice(0, 6).map((r) => (
              <View key={r.id} style={styles.previewItem}>
                {r.images?.[0] ? (
                  <Image source={{ uri: r.images[0] }} style={styles.previewImage} />
                ) : (
                  <View style={[styles.previewImage, styles.previewPlaceholder]}>
                    <Text>🍽️</Text>
                  </View>
                )}
                <Text style={styles.previewName} numberOfLines={1}>{r.name}</Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.goButton} onPress={onGoToDecision}>
            <Text style={styles.goText}>Swipe to Decide →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} style={styles.dismiss}>
            <Text style={styles.dismissText}>Keep Swiping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1, backgroundColor: t.overlay,
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    sheet: {
      backgroundColor: t.card, borderRadius: 24, padding: 24,
      width: '100%', alignItems: 'center',
    },
    emoji: { fontSize: 44, marginBottom: 12 },
    title: {
      fontSize: 20, fontFamily: 'Lora_700Bold', color: t.text,
      textAlign: 'center', marginBottom: 8, letterSpacing: -0.3,
    },
    sub: {
      fontSize: 14, color: t.textTertiary, textAlign: 'center',
      lineHeight: 20, marginBottom: 20,
    },
    previewRow: { marginBottom: 20, alignSelf: 'stretch' },
    previewItem: { alignItems: 'center', marginRight: 12, width: 68 },
    previewImage: { width: 68, height: 68, borderRadius: 20, marginBottom: 4 },
    previewPlaceholder: {
      backgroundColor: t.inputBg, justifyContent: 'center', alignItems: 'center',
    },
    previewName: { fontSize: 11, color: t.textTertiary, textAlign: 'center' },
    goButton: {
      backgroundColor: t.accent, borderRadius: 24,
      paddingVertical: 14, paddingHorizontal: 32,
      width: '100%', alignItems: 'center', marginBottom: 10,
    },
    goText: { color: '#fff', fontFamily: 'Raleway_600SemiBold', fontSize: 16 },
    dismiss: { paddingVertical: 8 },
    dismissText: { color: t.textTertiary, fontSize: 14, fontWeight: '500' },
  });
}
