import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import type { Theme } from '../types';
import { useThemedStyles } from '../hooks/useThemedStyles';

interface TutorialOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function TutorialOverlay({ visible, onDismiss }: TutorialOverlayProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={30} tint="dark" style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.emoji}>🤔</Text>
          <Text style={styles.title}>Don't know where to eat?</Text>
          <Text style={styles.text}>
            Swipe right to save a restaurant you'd like to try.{'\n'}
            Swipe left to skip it.
          </Text>
          <Text style={styles.arrow}>↓</Text>
          <TouchableOpacity style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: t.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 200,
    },
    content: { alignItems: 'center', paddingHorizontal: 40 },
    emoji: { fontSize: 44, marginBottom: 12 },
    title: {
      fontSize: 38, fontFamily: 'Lora_700Bold', color: '#fff',
      textAlign: 'center', marginBottom: 10, letterSpacing: -0.3,
    },
    text: {
      fontSize: 26, fontFamily: 'Raleway_400Regular',
      color: 'rgba(255,255,255,0.75)', textAlign: 'center',
      lineHeight: 36, marginBottom: 16,
    },
    arrow: { fontSize: 32, color: '#fff', marginBottom: 20 },
    button: {
      backgroundColor: '#ffffff', borderRadius: 24,
      paddingVertical: 14, paddingHorizontal: 48,
    },
    buttonText: { color: t.text, fontFamily: 'Raleway_600SemiBold', fontSize: 17 },
  });
}
