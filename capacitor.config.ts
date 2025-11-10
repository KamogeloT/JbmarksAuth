import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.municipality.faultreporter',
  appName: 'SDINMOTION',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    Camera: {
      presentationStyle: 'popover'
    },
    Geolocation: {}
  }
};

export default config;
