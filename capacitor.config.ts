import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zendit.play',
  appName: 'Zendit Play',
  webDir: 'dist',
  backgroundColor: '#1B1938',
  server: {
    // The app runs at http://localhost: most IPTV streams, logos and posters are plain http,
    // which an https app origin would block as mixed content.
    androidScheme: 'http',
    // Adds android:usesCleartextTraffic="true" - required for http:// IPTV servers.
    cleartext: true,
  },
  plugins: {
    // fetch()/XMLHttpRequest go through Android's native HTTP stack: no CORS limits for Xtream / M3U requests.
    CapacitorHttp: {
      enabled: true,
    },
    // Light status/navigation bar icons on the dark UI. Content stays clear of the bars and the camera cutout.
    SystemBars: {
      style: 'DARK',
    },
  },
};

export default config;
