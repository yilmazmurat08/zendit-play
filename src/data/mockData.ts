import { AppSettings, Channel, Movie, Series } from '../types';

/**
 * Demo content: fictional channels and the Blender Foundation's open movies (CC BY 3.0) from public
 * test servers. No real channel, film or series names, logos or posters.
 */

const STREAMS = {
  akamaiLive: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
  shakaLive: 'https://storage.googleapis.com/shaka-live-assets/player-source.m3u8',
  appleMulti: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
  bigBuckBunny: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  tearsOfSteel: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  sintelTrailer: 'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4',
};

const logo = (slug: string) => `/demo/logos/${slug}.png`;
const poster = (slug: string) => `/demo/posters/${slug}.jpg`;

function channel(
  number: number,
  name: string,
  category: string,
  logoSlug: string,
  streamUrl: string,
  currentShow: string,
  nextShow: string,
  extra: Partial<Channel> = {}
): Channel {
  return {
    id: `demo_ch_${number}`,
    name,
    streamUrl,
    category,
    logo: logo(logoSlug),
    number,
    currentShow,
    nextShow,
    epgStart: '',
    epgEnd: '',
    progress: 0,
    resolution: 'HD',
    format: '.m3u8',
    isFavorite: false,
    ...extra,
  };
}

export const sampleChannels: Channel[] = [
  channel(1, 'Ufuk TV', 'Ulusal', 'ufuk-tv', STREAMS.akamaiLive, 'Canlı test yayını', 'Akşam Haberleri', { isFavorite: true, resolution: 'FHD' }),
  channel(2, 'Kent TV', 'Ulusal', 'kent-tv', STREAMS.shakaLive, 'Canlı test yayını', 'Gece Sohbetleri'),
  channel(3, 'Mavi Kanal', 'Ulusal', 'mavi-kanal', STREAMS.appleMulti, 'Çok dilli test yayını (ses ve altyazı seçimi)', 'Bil Bakalım', {
    resolution: 'FHD',
  }),
  channel(4, 'Perde Sinema', 'Sinema', 'perde-sinema', STREAMS.tearsOfSteel, 'Tears of Steel', 'Sintel (Fragman)', {
    isFavorite: true,
    resolution: 'FHD',
  }),
  channel(5, 'Minik Dünya', 'Çocuk', 'minik-dunya', STREAMS.bigBuckBunny, 'Big Buck Bunny', 'Renkli Masallar'),
  channel(6, 'Yaban Belgesel', 'Belgesel', 'yaban-belgesel', STREAMS.sintelTrailer, 'Sintel (Fragman)', 'Dağların Sesi'),
];

const OPEN_MOVIES = 'Açık Lisanslı Filmler';
const BLENDER = 'Blender Foundation’ın açık lisanslı (CC BY 3.0) kısa filmi; © Blender Foundation, www.blender.org.';

export const sampleMovies: Movie[] = [
  {
    id: 'demo_mov_1',
    title: 'Big Buck Bunny',
    year: 2008,
    rating: 'N/A',
    duration: '10dk',
    poster: poster('big-buck-bunny'),
    backdrop: poster('big-buck-bunny'),
    genres: ['Animasyon', 'Komedi'],
    synopsis: `İri, uykucu ve iyi kalpli bir tavşan, ormandaki kelebeklere eziyet eden üç yaramaz kemirgene kendi yöntemleriyle ders verir. ${BLENDER}`,
    cast: [],
    director: 'Sacha Goedegebure',
    streamUrl: STREAMS.bigBuckBunny,
    category: OPEN_MOVIES,
    isFavorite: true,
  },
  {
    id: 'demo_mov_2',
    title: 'Tears of Steel',
    year: 2012,
    rating: 'N/A',
    duration: '12dk',
    poster: poster('tears-of-steel'),
    backdrop: poster('tears-of-steel'),
    genres: ['Bilim Kurgu', 'Aksiyon'],
    synopsis: `Geleceğin Amsterdam’ında bir grup bilim insanı ve asker, dünyayı ele geçiren robotları durdurmak için geçmişteki bir anıyı değiştirmeye çalışır. ${BLENDER}`,
    cast: ['Derek de Lint', 'Sergio Hasselbaink', 'Rogier Schippers', 'Vanja Rukavina'],
    director: 'Ian Hubert',
    streamUrl: STREAMS.tearsOfSteel,
    category: OPEN_MOVIES,
    progress: 35,
    isFavorite: false,
  },
  {
    id: 'demo_mov_3',
    title: 'Sintel (Fragman)',
    year: 2010,
    rating: 'N/A',
    duration: '1dk',
    poster: poster('sintel'),
    backdrop: poster('sintel'),
    genres: ['Fantastik', 'Animasyon'],
    synopsis: `Yaralı bir yavru ejderhayla dost olan genç Sintel, onu kaybedince ejderhayı bulmak için uzun ve tehlikeli bir yolculuğa çıkar. ${BLENDER}`,
    cast: ['Halina Reijn', 'Thom Hoffman'],
    director: 'Colin Levy',
    streamUrl: STREAMS.sintelTrailer,
    category: OPEN_MOVIES,
    isFavorite: false,
  },
];

export const sampleSeries: Series[] = [
  {
    id: 'demo_ser_1',
    title: 'Açık Filmler',
    year: 2012,
    rating: 'N/A',
    seasonsCount: 1,
    poster: poster('acik-filmler'),
    backdrop: poster('acik-filmler'),
    genres: ['Koleksiyon'],
    synopsis:
      'Blender Foundation’ın açık lisanslı (CC BY 3.0) kısa filmlerinden oluşan örnek koleksiyon; dizi ekranını, bölüm listesini ve kaldığın yerden devam özelliğini denemen için.',
    cast: [],
    director: 'Blender Foundation',
    category: 'Örnek Dizi',
    isFavorite: false,
    lastWatchedEpisode: { seasonNum: 1, episodeNum: 2, title: 'Tears of Steel', progress: 40 },
    seasons: [
      {
        seasonNum: 1,
        title: 'Sezon 1',
        episodes: [
          {
            episodeNum: 1,
            title: 'Big Buck Bunny',
            duration: '10dk',
            streamUrl: STREAMS.bigBuckBunny,
            plot: 'Blender Foundation · 2008 · CC BY 3.0',
            thumbnail: poster('big-buck-bunny'),
            progress: 100,
          },
          {
            episodeNum: 2,
            title: 'Tears of Steel',
            duration: '12dk',
            streamUrl: STREAMS.tearsOfSteel,
            plot: 'Blender Foundation · 2012 · CC BY 3.0',
            thumbnail: poster('tears-of-steel'),
            progress: 40,
          },
          {
            episodeNum: 3,
            title: 'Sintel (Fragman)',
            duration: '1dk',
            streamUrl: STREAMS.sintelTrailer,
            plot: 'Blender Foundation · 2010 · CC BY 3.0',
            thumbnail: poster('sintel'),
          },
        ],
      },
    ],
  },
];

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

export const demoChannels = sampleChannels;
export const demoMovies = sampleMovies;
export const demoSeries = sampleSeries;
