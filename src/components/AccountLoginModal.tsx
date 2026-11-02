import { useState } from 'react';
import { XtreamAccount, Channel, Movie, Series } from '../types';
import {
  Tv,
  Link as LinkIcon,
  FileText,
  User,
  Lock,
  Globe,
  Tag,
  Eye,
  EyeOff,
  Check,
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Upload,
  FileCheck2,
} from 'lucide-react';
import { detectXtreamFromM3uUrl, loadXtreamAccount, type XtreamCredentials, type XtreamLoadProgress } from '../lib/xtreamApi';
import { classifyM3UEntries, fetchM3UFromUrl, groupSeriesFromEntries, m3uEntryToChannel, m3uEntryToMovie, parseM3U, readM3UFile } from '../lib/m3uParser';
import { ZenditLogo } from './ZenditLogo';

type TabKind = 'xtream' | 'm3u_url' | 'm3u_file';

interface LoadedData {
  channels: Channel[];
  movies: Movie[];
  series: Series[];
}

interface AccountLoginModalProps {
  currentAccount: XtreamAccount | null;
  liveStreamFormat: '.ts' | '.m3u8' | '.mpd';
  onSaveAccount: (account: XtreamAccount, data: LoadedData) => void;
  onUseDemoContent: () => void;
  onClose?: () => void;
  variant?: 'modal' | 'fullscreen';
}

type LoadStage = { key: 'auth' | 'channels' | 'movies' | 'series'; count: number | null };

const STAGE_LABELS: Record<LoadStage['key'], string> = {
  auth: 'Hesaba bağlanılıyor',
  channels: 'Kanallar indiriliyor',
  movies: 'Filmler indiriliyor',
  series: 'Diziler indiriliyor',
};

export function AccountLoginModal({
  currentAccount,
  liveStreamFormat,
  onSaveAccount,
  onUseDemoContent,
  onClose,
  variant = 'modal',
}: AccountLoginModalProps) {
  const [activeTab, setActiveTab] = useState<TabKind>(
    currentAccount && currentAccount.type !== 'demo' ? (currentAccount.type as TabKind) : 'xtream'
  );

  const [profileName, setProfileName] = useState(currentAccount?.type !== 'demo' ? currentAccount?.name || '' : '');
  const [serverUrl, setServerUrl] = useState(currentAccount?.type === 'xtream' ? currentAccount.serverUrl : '');
  const [username, setUsername] = useState(currentAccount?.type === 'xtream' ? currentAccount.username : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [m3uUrl, setM3uUrl] = useState(currentAccount?.type === 'm3u_url' ? currentAccount.serverUrl : '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadStage, setLoadStage] = useState<LoadStage>({ key: 'auth', count: null });
  const [error, setError] = useState<string | null>(null);

  const handleXtreamProgress = (p: XtreamLoadProgress) => {
    switch (p.stage) {
      case 'auth':
        setLoadStage({ key: 'auth', count: null });
        break;
      case 'live':
        setLoadStage({ key: 'channels', count: null });
        break;
      case 'movies':
        setLoadStage({ key: 'channels', count: p.channelsLoaded });
        setTimeout(() => setLoadStage({ key: 'movies', count: null }), 500);
        break;
      case 'series':
        setLoadStage({ key: 'movies', count: p.moviesLoaded });
        setTimeout(() => setLoadStage({ key: 'series', count: null }), 500);
        break;
      case 'done':
        setLoadStage({ key: 'series', count: p.seriesLoaded });
        break;
    }
  };

  const handleSubmitXtream = async () => {
    if (!serverUrl.trim() || !username.trim()) {
      setError('Sunucu adresi ve kullanıcı adı gerekli.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setLoadStage({ key: 'auth', count: null });
    try {
      const creds: XtreamCredentials = { serverUrl: serverUrl.trim(), username: username.trim(), password };
      const result = await loadXtreamAccount(creds, liveStreamFormat, handleXtreamProgress);
      const account: XtreamAccount = {
        id: currentAccount?.id || `acc_${Date.now()}`,
        name: profileName.trim() || username.trim() || 'Xtream Hesabı',
        serverUrl: serverUrl.trim(),
        username: username.trim(),
        password,
        type: 'xtream',
        isActive: true,
        expiryDate: result.meta.expiryDate || undefined,
        status: 'active',
        channelsCount: result.channels.length,
        moviesCount: result.movies.length,
        seriesCount: result.series.length,
      };
      setTimeout(() => onSaveAccount(account, result), 350);
    } catch (err: any) {
      setError(err?.message || 'Bağlantı kurulamadı. Bilgileri kontrol edip tekrar deneyin.');
      setIsLoading(false);
    }
  };

  const handleSubmitM3uUrl = async () => {
    if (!m3uUrl.trim()) {
      setError('M3U adresi gerekli.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setLoadStage({ key: 'auth', count: null });

    // Most real-world "M3U links" are actually an Xtream panel's
    // M3U-generation endpoint with the login embedded in the URL. When
    // that's the case, use the real Xtream API instead - it gives accurate
    // series/season/episode data, ratings and EPG straight from the panel
    // instead of guessing groupings from a flat episode list. If the panel
    // turns out not to expose that API, fall straight through to the plain
    // M3U download below, exactly like it would if no Xtream shape had been
    // detected at all.
    const detected = detectXtreamFromM3uUrl(m3uUrl);
    if (detected) {
      try {
        const result = await loadXtreamAccount(detected, liveStreamFormat, handleXtreamProgress);
        const account: XtreamAccount = {
          id: currentAccount?.id || `acc_${Date.now()}`,
          name: profileName.trim() || detected.username || 'Xtream Hesabı',
          serverUrl: detected.serverUrl,
          username: detected.username,
          password: detected.password,
          type: 'xtream',
          isActive: true,
          expiryDate: result.meta.expiryDate || undefined,
          status: 'active',
          channelsCount: result.channels.length,
          moviesCount: result.movies.length,
          seriesCount: result.series.length,
        };
        setTimeout(() => onSaveAccount(account, result), 350);
        return;
      } catch {
        // URL looked Xtream-shaped but the panel didn't actually respond as
        // one (wrong creds, API disabled, etc.) - fall through below.
      }
    }

    setLoadStage({ key: 'channels', count: null });
    try {
      const text = await fetchM3UFromUrl(m3uUrl.trim());
      const { channelEntries, vodEntries } = classifyM3UEntries(parseM3U(text));
      const channels = channelEntries.map(m3uEntryToChannel);
      const { movieEntries, seriesList } = groupSeriesFromEntries(vodEntries);
      const movies = movieEntries.map(m3uEntryToMovie);
      setLoadStage({ key: 'channels', count: channels.length });
      const account: XtreamAccount = {
        id: currentAccount?.id || `acc_${Date.now()}`,
        name: profileName.trim() || 'M3U Listesi',
        serverUrl: m3uUrl.trim(),
        username: '',
        type: 'm3u_url',
        isActive: true,
        status: 'active',
        channelsCount: channels.length,
        moviesCount: movies.length,
        seriesCount: seriesList.length,
      };
      setTimeout(() => onSaveAccount(account, { channels, movies, series: seriesList }), 350);
    } catch (err: any) {
      setError(err?.message || 'M3U listesi işlenemedi.');
      setIsLoading(false);
    }
  };

  const handleSubmitM3uFile = async () => {
    if (!selectedFile) {
      setError('Bir M3U dosyası seçin.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setLoadStage({ key: 'channels', count: null });
    try {
      const text = await readM3UFile(selectedFile);
      const { channelEntries, vodEntries } = classifyM3UEntries(parseM3U(text));
      const channels = channelEntries.map(m3uEntryToChannel);
      const { movieEntries, seriesList } = groupSeriesFromEntries(vodEntries);
      const movies = movieEntries.map(m3uEntryToMovie);
      setLoadStage({ key: 'channels', count: channels.length });
      const account: XtreamAccount = {
        id: currentAccount?.id || `acc_${Date.now()}`,
        name: profileName.trim() || selectedFile.name,
        serverUrl: selectedFile.name,
        username: '',
        type: 'm3u_file',
        isActive: true,
        status: 'active',
        channelsCount: channels.length,
        moviesCount: movies.length,
        seriesCount: seriesList.length,
      };
      setTimeout(() => onSaveAccount(account, { channels, movies, series: seriesList }), 350);
    } catch (err: any) {
      setError(err?.message || 'Dosya işlenemedi.');
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (activeTab === 'xtream') handleSubmitXtream();
    else if (activeTab === 'm3u_url') handleSubmitM3uUrl();
    else handleSubmitM3uFile();
  };

  const canSubmit =
    activeTab === 'xtream'
      ? serverUrl.trim().length > 0 && username.trim().length > 0
      : activeTab === 'm3u_url'
      ? m3uUrl.trim().length > 0
      : !!selectedFile;

  return (
    <div
      id="zendit-account-modal"
      className={
        variant === 'fullscreen'
          ? 'fixed inset-0 z-50 bg-[#1B1938] flex flex-col items-center justify-center p-6 overflow-y-auto'
          : 'fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4'
      }
    >
      {variant === 'fullscreen' && !isLoading && (
        <div className="mb-8">
          <ZenditLogo size="xl" showText />
        </div>
      )}

      {isLoading ? (
        <div className="w-full max-w-sm bg-[#221F45] rounded-2xl p-6 flex flex-col items-center justify-between min-h-[420px]">
          <div className="text-center pt-2">
            {variant === 'fullscreen' && (
              <div className="mb-5">
                <ZenditLogo size="lg" />
              </div>
            )}
            <h2 className="text-zinc-500 text-sm">Veriler indiriliyor</h2>
          </div>

          <div className="w-full bg-[#2A2750] rounded-xl p-6 flex flex-col items-center justify-center my-auto">
            {loadStage.count !== null ? (
              <span className="text-3xl font-medium text-white">{loadStage.count.toLocaleString('tr-TR')}</span>
            ) : (
              <Loader2 className="w-8 h-8 text-[#FF5B3D] animate-spin mb-1" />
            )}
            <span className="text-zinc-500 text-xs mt-2">{STAGE_LABELS[loadStage.key]}</span>

            {loadStage.count !== null && (
              <span className="mt-4 flex items-center gap-1.5 text-emerald-400 text-xs">
                <Check className="w-3.5 h-3.5" />
                Yüklendi
              </span>
            )}
          </div>

          <button onClick={() => setIsLoading(false)} className="text-xs text-zinc-500 hover:text-white pb-2">
            İptal
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md bg-[#221F45] rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white text-base font-medium">
                {variant === 'fullscreen' ? 'Hesabınızı bağlayın' : 'Hesap yönetimi'}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">Xtream / M3U sunucu kimlik bilgileri</p>
            </div>
            {onClose && (
              <button onClick={onClose} className="p-1.5 rounded-full text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-5">
            <button
              onClick={() => {
                setActiveTab('xtream');
                setError(null);
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors ${
                activeTab === 'xtream' ? 'bg-[#FF5B3D]/15 text-[#FF5B3D]' : 'bg-[#2A2750] text-zinc-500'
              }`}
            >
              <Tv className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Xtream</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('m3u_url');
                setError(null);
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors ${
                activeTab === 'm3u_url' ? 'bg-[#FF5B3D]/15 text-[#FF5B3D]' : 'bg-[#2A2750] text-zinc-500'
              }`}
            >
              <LinkIcon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">M3U URL</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('m3u_file');
                setError(null);
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors ${
                activeTab === 'm3u_file' ? 'bg-[#FF5B3D]/15 text-[#FF5B3D]' : 'bg-[#2A2750] text-zinc-500'
              }`}
            >
              <FileText className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">M3U Dosya</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 bg-red-950/30 text-red-300 text-xs rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Liste adı (isteğe bağlı)</label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Örn. Ev aboneliğim"
                  className="w-full bg-[#2A2750] text-white text-sm pl-9 pr-4 py-2.5 rounded-lg border-none focus:outline-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            {activeTab === 'xtream' && (
              <>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Sunucu URL</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://sunucu-adresi:port"
                      className="w-full bg-[#2A2750] text-white text-sm pl-9 pr-4 py-2.5 rounded-lg border-none focus:outline-none placeholder:text-zinc-600 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Kullanıcı adı</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="kullanici_adi"
                      className="w-full bg-[#2A2750] text-white text-sm pl-9 pr-4 py-2.5 rounded-lg border-none focus:outline-none placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Şifre</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#2A2750] text-white text-sm pl-9 pr-10 py-2.5 rounded-lg border-none focus:outline-none placeholder:text-zinc-600 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'm3u_url' && (
              <div>
                <label className="text-xs text-zinc-500 block mb-1">M3U adresi</label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="text"
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    placeholder="http://sunucu-adresi/liste.m3u8"
                    className="w-full bg-[#2A2750] text-white text-sm pl-9 pr-4 py-2.5 rounded-lg border-none focus:outline-none placeholder:text-zinc-600 font-mono"
                  />
                </div>
              </div>
            )}

            {activeTab === 'm3u_file' && (
              <div>
                <label className="text-xs text-zinc-500 block mb-1">M3U dosyası</label>
                <label
                  htmlFor="m3u-file-input"
                  className="flex items-center gap-3 w-full bg-[#2A2750] text-sm pl-4 pr-4 py-3.5 rounded-lg border border-dashed border-white/10 cursor-pointer"
                >
                  {selectedFile ? (
                    <>
                      <FileCheck2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-zinc-300 truncate">{selectedFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-zinc-600 shrink-0" />
                      <span className="text-zinc-600">.m3u / .m3u8 dosyası seçin</span>
                    </>
                  )}
                </label>
                <input
                  id="m3u-file-input"
                  type="file"
                  accept=".m3u,.m3u8,text/plain"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={() => onUseDemoContent()} className="text-xs text-[#FF5B3D] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Demo içerikle görüntüle</span>
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-transparent hover:bg-white/5 text-zinc-500 hover:text-white text-sm"
              >
                İptal
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmit}
              className="flex-1 py-2.5 rounded-lg bg-[#FF5B3D] disabled:bg-[#34315E] text-[#FFFFFF] disabled:text-zinc-600 text-sm font-medium disabled:cursor-not-allowed"
            >
              {variant === 'fullscreen' ? 'Bağlan' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
