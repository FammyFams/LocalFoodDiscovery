import PostHog from 'posthog-react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Dimensions, Platform } from 'react-native';
import { POSTHOG_API_KEY } from '../env';

let posthog = null;

export function initAnalytics() {
  if (!POSTHOG_API_KEY) {
    console.warn('[Analytics] No PostHog API key found');
    return;
  }
  try {
    posthog = new PostHog(POSTHOG_API_KEY, {
      host: 'https://us.i.posthog.com',
    });

    const { width, height } = Dimensions.get('screen');
    posthog.register({
      device_brand: Device.brand,
      device_model: Device.modelName,
      os_name: Device.osName,
      os_version: Device.osVersion,
      app_version: Constants.expoConfig?.version ?? null,
      app_build: Platform.OS === 'ios'
        ? Constants.expoConfig?.ios?.buildNumber ?? null
        : Constants.expoConfig?.android?.versionCode ?? null,
      screen_width: width,
      screen_height: height,
      device_type: Device.deviceType,
      is_physical_device: Device.isDevice,
    });

    console.log('[Analytics] PostHog initialized with device properties');
  } catch (e) {
    console.warn('[Analytics] PostHog init failed:', e);
  }
}

export function trackEvent(event, properties = {}) {
  if (!posthog) {
    console.warn('[Analytics] PostHog not initialized, skipping:', event);
    return;
  }
  posthog.capture(event, properties);
}

export function getPosthog() {
  return posthog;
}
