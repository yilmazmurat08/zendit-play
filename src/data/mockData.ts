import type { AppSettings } from '../types';

/** Settings a fresh install starts with. The app ships no channel, movie or series content. */
export const defaultSettings: AppSettings = {
  playerEngine: 'exo',
  language: 'tr',
  startupBehavior: 'home',
  autoRefresh: true,
  liveStreamFormat: '.ts',
  changePlayerVOD: 'exo',
  changePlayerLive: 'exo',
  autoPlayNext: true,
  trailerInApp: true,
  resumePlayback: true,
  epgEnabled: true,
  epgUrl: '',
  epgOffsetHours: 0,
  hardwareAcceleration: true,
  bufferSize: 'normal',
  audioTrack: 'auto',
  subtitleTrack: 'none',
  subtitleScale: 1,
  aspectMode: 'fit',
  parental: { enabled: false, pinHash: '', salt: '', overrides: {} },
};
