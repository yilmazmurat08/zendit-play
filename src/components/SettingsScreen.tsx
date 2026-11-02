import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  ChartColumn,
  Check,
  ChevronRight,
  FileText,
  HardDrive,
  History,
  Loader2,
  Lock,
  LockOpen,
  LogOut,
  Mail,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { AppSettings, ParentalConfig, PlayerChoice, XtreamAccount } from '../types';
import { DeviceInfo, getSubscription } from '../lib/tv';
import { useEpgStatus } from '../lib/epg';
import { isNativeApp, NativePlayer, type InstalledPlayers, type NativeDeviceInfo } from '../lib/nativePlayer';
import { DEFAULT_PARENTAL, isCategoryRestricted, newPinConfig } from '../lib/parental';
import { CONTACT_EMAIL, DEVELOPER, LEGAL_DOCS, LEGAL_UPDATED, type LegalDocId } from '../lib/legal';
import type { CategoryCount, PinPromptOptions } from './ParentalControl';

interface Option<T> {
  value: T;
  label: string;
}

interface SettingsScreenProps {
  settings: AppSettings;
  account: XtreamAccount | null;
  deviceIds: DeviceInfo;
  isRefreshing: boolean;
  onUpdateSettings: (settings: AppSettings) => void;
  onRefreshLists: () => void;
  onRefreshEpg: () => void;
  onClearHistory: () => void | Promise<void>;
  onClearCache: () => void | Promise<void>;
  onClearData: () => void | Promise<void>;
  onOpenAccount: () => void;
  onOpenAnalytics?: () => void;
  onBack?: () => void;
  /** Ebeveyn denetimi: PIN entered in this session. */
  parentalUnlocked: boolean;
  parentalCategories: Record<'live' | 'movie' | 'series', CategoryCount[]>;
  /** Shows the PIN pad; resolves the entered PIN (create) or whether it was correct (verify). */
  onAskPin: (options: PinPromptOptions) => Promise<any>;
  onParentalUnlockedChange: (unlocked: boolean) => void;
  onOpenParentalCategories: () => void;
  onOpenLegal: (doc: LegalDocId) => void;
}

const PLAYER_OPTIONS: Option<PlayerChoice>[] = [
    { value: 'exo', label: 'Dahili oynatıcı' },
    { value: 'vlc', label: 'VLC' },
    { value: 'mx', label: 'MX Player' },
    { value: 'system', label: 'Her seferinde sor' },
  ],
  LANGUAGES: Option<string>[] = [
    { value: 'tr', label: 'Türkçe' },
    { value: 'en', label: 'İngilizce' },
    { value: 'de', label: 'Almanca' },
    { value: 'ar', label: 'Arapça' },
    { value: 'fr', label: 'Fransızca' },
  ],
  ASPECT_OPTIONS: Option<AppSettings['aspectMode']>[] = [
    { value: 'fit', label: 'Sığdır' },
    { value: 'fill', label: 'Doldur' },
    { value: 'zoom', label: 'Yakınlaştır' },
    { value: '16:9', label: '16:9' },
    { value: '4:3', label: '4:3' },
  ],
  ASPECT_HINTS: Record<string, string> = {
    fit: 'Görüntünün tamamı görünür, gerekirse kenarlarda siyah bant kalır.',
    fill: 'Ekranı tamamen doldurur, görüntü esneyebilir.',
    zoom: 'Ekranı doldurur, taşan kenarlar kırpılır.',
    '16:9': 'Görüntüyü geniş ekran oranında gösterir.',
    '4:3': 'Görüntüyü klasik TV oranında gösterir.',
  },
  SUBTITLE_SIZES: Option<number>[] = [
    { value: 0.8, label: 'Küçük' },
    { value: 1, label: 'Normal' },
    { value: 1.3, label: 'Büyük' },
    { value: 1.6, label: 'Çok büyük' },
  ];
export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(0, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
function formatTime(ms?: number) {
  if (!ms) return 'henüz yok';
  const ago = Date.now() - ms;
  return ago < 6e4
    ? 'az önce'
    : ago < 36e5
      ? `${Math.round(ago / 6e4)} dk önce`
      : ago < 864e5
        ? `${Math.round(ago / 36e5)} saat önce`
        : new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}
function localStorageBytes() {
  try {
    let a = 0;
    for (let e = 0; e < localStorage.length; e++) {
      const t = localStorage.key(e);
      t != null && t.startsWith('zendit_') && (a += (t.length + (localStorage.getItem(t) || '').length) * 2);
    }
    return a;
  } catch {
    return 0;
  }
}
function Section({ title, children }) {
  return (
    <section className="space-y-2.5">
      <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">{title}</h2>
      <div className="glass rounded-3xl divide-y divide-white/[0.07] overflow-hidden">{children}</div>
    </section>
  );
}
function Row({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3.5 sm:px-5 space-y-2.5">
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        {description && <div className="text-xs text-white/55 mt-0.5 leading-relaxed">{description}</div>}
      </div>
      {children}
    </div>
  );
}
function Choice<T extends string | number>({
  options,
  value,
  onChange,
  disabledHint,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabledHint?: (value: T) => string | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((r) => {
        const selected = r.value === value,
          hint = disabledHint?.(r.value);
        return (
          <button
            key={String(r.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(r.value)}
            className={`tv-focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${selected ? 'bg-brand text-white' : 'bg-white/[0.07] text-white/80 hover:bg-white/[0.13]'}`}
          >
            {selected && <Check className="w-3.5 h-3.5" />}
            {r.label}
            {hint && <span className={`font-medium ${selected ? 'text-white/80' : 'text-white/45'}`}>· {hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
function Toggle({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="tv-focus-row w-full px-4 py-3.5 sm:px-5 flex items-center justify-between gap-4 text-left hover:bg-white/[0.03]"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{label}</span>
        {description && <span className="block text-xs text-white/55 mt-0.5 leading-relaxed">{description}</span>}
      </span>
      <span className={`relative w-12 h-7 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-white/15'}`}>
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
    </button>
  );
}
function ActionButton({
  children,
  onClick,
  tone = 'default',
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
}) {
  const TONES = {
    default: 'bg-white/[0.08] text-white hover:bg-white/[0.14]',
    primary: 'bg-brand text-white hover:bg-brand-dark',
    danger: 'bg-alert/90 text-white hover:bg-alert',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tv-focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${TONES[tone]}`}
    >
      {children}
    </button>
  );
}
function ConfirmAction({
  icon,
  label,
  description,
  confirmText,
  actionLabel,
  onConfirm,
  danger = false,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  confirmText: string;
  actionLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  const [confirming, setConfirming] = useState(false),
    [status, setStatus] = useState('idle'),
    run = async () => {
      setStatus('working');
      try {
        await onConfirm();
      } finally {
        (setConfirming(false), setStatus('done'), setTimeout(() => setStatus('idle'), 2500));
      }
    };
  return (
    <div className="px-4 py-3.5 sm:px-5">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-white flex-1 min-w-[12rem]">{confirmText}</span>
          <ActionButton tone={danger ? 'danger' : 'primary'} onClick={run} disabled={status === 'working'}>
            {status === 'working' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {actionLabel}
          </ActionButton>
          <ActionButton onClick={() => setConfirming(false)}>Vazgeç</ActionButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="tv-focus-row w-[calc(100%+1rem)] -mx-2 px-2 py-1 rounded-xl flex items-center gap-3 text-left"
        >
          <span
            className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${danger ? 'bg-alert/15 text-alert' : 'bg-white/[0.07] text-white/80'}`}
          >
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">{label}</span>
            <span className="block text-xs text-white/55 mt-0.5">{status === 'done' ? 'Tamamlandı.' : description}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
        </button>
      )}
    </div>
  );
}
export function SettingsScreen({
  settings,
  account,
  deviceIds,
  isRefreshing,
  onUpdateSettings,
  onRefreshLists,
  onRefreshEpg,
  onClearHistory,
  onClearCache,
  onClearData,
  onOpenAccount,
  onOpenAnalytics,
  onBack,
  parentalUnlocked,
  parentalCategories,
  onAskPin,
  onParentalUnlockedChange,
  onOpenParentalCategories,
  onOpenLegal,
}: SettingsScreenProps) {
  const epg = useEpgStatus(),
    isNative = isNativeApp(),
    subscription = getSubscription(account),
    [players, setPlayers] = useState<InstalledPlayers | null>(null),
    [device, setDevice] = useState<NativeDeviceInfo | null>(null),
    [epgUrlDraft, setEpgUrlDraft] = useState(settings.epgUrl),
    [storageBytes, setStorageBytes] = useState(localStorageBytes);
  // Everything the WebView stores (IndexedDB lists, localStorage), when the browser can tell.
  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((estimate) => {
        if (estimate.usage) setStorageBytes(estimate.usage);
      })
      .catch(() => {});
  }, []);
  const [parentalNotice, setParentalNotice] = useState(''),
    [resetOpen, setResetOpen] = useState(false),
    [resetPassword, setResetPassword] = useState('');
  useEffect(() => {
    isNative &&
      (NativePlayer.players()
        .then(setPlayers)
        .catch(() => setPlayers(null)),
      NativePlayer.deviceInfo()
        .then(setDevice)
        .catch(() => setDevice(null)));
  }, [isNative]);
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => onUpdateSettings({ ...settings, [key]: value }),
    playerNote = (v) => {
      if (players && ((v === 'vlc' && !players.vlc) || (v === 'mx' && !players.mx))) return 'yüklü değil';
    },
    parental = settings.parental,
    lockedCounts = (config: ParentalConfig) =>
      (['live', 'movie', 'series'] as const).map(
        (kind) => parentalCategories[kind].filter((cat) => isCategoryRestricted(config, kind, cat.name)).length,
      ),
    [lockedLive, lockedMovies, lockedSeries] = lockedCounts(parental.enabled ? parental : { ...parental, enabled: true }),
    lockedTotal = lockedLive + lockedMovies + lockedSeries,
    verifyPin = (v) => onAskPin({ mode: 'verify', title: 'Ebeveyn şifresi', message: v }),
    createPin = () =>
      onAskPin({ mode: 'create', title: 'Yeni şifre belirleyin', message: 'Ebeveyn denetimi için 4 haneli bir şifre girin.' }),
    enableParental = async () => {
      const v = await createPin();
      v &&
        (update('parental', newPinConfig(parental, v)),
        onParentalUnlockedChange(false),
        setParentalNotice('Ebeveyn denetimi açıldı. Yetişkin içerikler kilitlendi.'));
    },
    changePin = async () => {
      if (!(await verifyPin('Şifreyi değiştirmek için mevcut şifrenizi girin.'))) return;
      const v = await createPin();
      v && (update('parental', newPinConfig(parental, v)), setParentalNotice('Şifre değiştirildi.'));
    },
    disableParental = async () => {
      (await verifyPin('Ebeveyn denetimini kapatmak için şifrenizi girin.')) &&
        (update('parental', { ...DEFAULT_PARENTAL, overrides: parental.overrides }),
        onParentalUnlockedChange(false),
        setParentalNotice('Ebeveyn denetimi kapatıldı.'));
    },
    unlockNow = async () => {
      (await verifyPin('Kilitli içerikleri açmak için şifrenizi girin.')) &&
        (onParentalUnlockedChange(true), setParentalNotice(''));
    },
    resetWithAccountPassword = () => {
      if (!(account != null && account.password) || resetPassword !== account.password) {
        setParentalNotice('Hesap şifresi yanlış.');
        return;
      }
      (update('parental', { ...DEFAULT_PARENTAL, overrides: parental.overrides }),
        onParentalUnlockedChange(false),
        setResetOpen(false),
        setResetPassword(''),
        setParentalNotice('Ebeveyn şifresi sıfırlandı. Yeni bir şifre belirleyerek denetimi tekrar açabilirsiniz.'));
    },
    epgUrlValid = !epgUrlDraft.trim() || epgUrlDraft.split(',').every((v) => /^https?:\/\/\S+$/i.test(v.trim())),
    isXtream = account?.type === 'xtream',
    canRefreshLists = account?.type === 'xtream' || account?.type === 'm3u_url',
    epgSummary = settings.epgEnabled
      ? epg.state === 'loading'
        ? 'İndiriliyor…'
        : epg.state === 'ready'
          ? `${epg.channels.toLocaleString('tr-TR')} kanal · ${epg.programmes.toLocaleString('tr-TR')} program · ${formatTime(epg.updatedAt)}`
          : epg.state === 'error'
            ? epg.error
            : isNative
              ? 'Henüz indirilmedi'
              : 'Tarayıcı önizlemesinde yalnızca seçili kanalın akışı gösterilir.'
      : 'Kapalı';
  return (
    <div id="zendit-settings-screen" className="max-w-3xl mx-auto px-4 py-5 pb-28 space-y-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Geri"
            className="tv-focus-ring w-10 h-10 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] text-white flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-wide text-white">Ayarlar</h1>
          {account && <p className="text-xs text-white/55 truncate">{account.name}</p>}
        </div>
      </div>
      <Section title="Oynatıcı">
        <Row
          label="Canlı TV oynatıcısı"
          description="Kanallar bu oynatıcıda açılır. Dahili oynatıcıda kanal listesi, EPG ve kanal değiştirme bulunur."
        >
          <Choice
            options={PLAYER_OPTIONS}
            value={settings.changePlayerLive}
            onChange={(v) => update('changePlayerLive', v)}
            disabledHint={playerNote}
          />
        </Row>
        <Row
          label="Film ve dizi oynatıcısı"
          description="Kaldığın yerden devam ve otomatik sonraki bölüm yalnızca dahili oynatıcıda çalışır."
        >
          <Choice
            options={PLAYER_OPTIONS}
            value={settings.changePlayerVOD}
            onChange={(v) => update('changePlayerVOD', v)}
            disabledHint={playerNote}
          />
        </Row>
        <Row
          label="Arabellek"
          description={
            settings.bufferSize === 'low'
              ? 'Kanallar daha hızlı açılır; bağlantı dalgalanırsa takılma olabilir.'
              : settings.bufferSize === 'high'
                ? 'Yayın açılmadan önce daha fazla veri yüklenir; zayıf bağlantılarda takılmayı azaltır.'
                : 'Hız ve kararlılık dengesi. Çoğu bağlantı için önerilir.'
          }
        >
          <Choice
            options={[
              { value: 'low', label: 'Hızlı açılış' },
              { value: 'normal', label: 'Dengeli' },
              { value: 'high', label: 'Kesintisiz' },
            ]}
            value={settings.bufferSize}
            onChange={(v) => update('bufferSize', v)}
          />
        </Row>
        <Row label="Görüntü oranı" description={ASPECT_HINTS[settings.aspectMode]}>
          <Choice options={ASPECT_OPTIONS} value={settings.aspectMode} onChange={(v) => update('aspectMode', v)} />
        </Row>
        <Row
          label="Tercih edilen ses dili"
          description="Yayında birden fazla ses varsa önce bu dil seçilir. Oynatıcıda Ses düğmesiyle değiştirebilirsiniz."
        >
          <Choice
            options={[{ value: 'auto', label: 'Yayının varsayılanı' }, ...LANGUAGES]}
            value={settings.audioTrack}
            onChange={(v) => update('audioTrack', v)}
          />
        </Row>
        <Row label="Altyazı" description="Seçilen dilde altyazı varsa otomatik açılır.">
          <Choice
            options={[{ value: 'none', label: 'Kapalı' }, ...LANGUAGES]}
            value={settings.subtitleTrack}
            onChange={(v) => update('subtitleTrack', v)}
          />
        </Row>
        <Row label="Altyazı boyutu">
          <Choice options={SUBTITLE_SIZES} value={settings.subtitleScale} onChange={(v) => update('subtitleScale', v)} />
        </Row>
        <Toggle
          label="Kaldığın yerden devam et"
          description="Yarım kalan film ve bölümler kaldığı saniyeden başlar."
          checked={settings.resumePlayback}
          onChange={(v) => update('resumePlayback', v)}
        />
        <Toggle
          label="Sonraki bölümü otomatik oynat"
          description="Bölüm bitince 10 saniyelik geri sayımla sıradaki bölüm başlar."
          checked={settings.autoPlayNext}
          onChange={(v) => update('autoPlayNext', v)}
        />
        <Toggle
          label="Fragmanları uygulama içinde oynat"
          description="YouTube fragmanları uygulamadan çıkmadan, tam ekran oynatılır. Kapalıysa YouTube uygulamasında açılır."
          checked={settings.trailerInApp !== false}
          onChange={(v) => update('trailerInApp', v)}
        />
        <Toggle
          label="Donanım hızlandırma"
          description="Açık kalması önerilir. Görüntü bozuk, yeşil ya da donuk geliyorsa kapatıp deneyin."
          checked={settings.hardwareAcceleration}
          onChange={(v) => update('hardwareAcceleration', v)}
        />
      </Section>
      <Section title="Canlı TV ve EPG">
        <Row
          label="Canlı yayın biçimi"
          description={
            isXtream
              ? 'Kanal açılmıyor veya takılıyorsa diğer biçimi deneyin. Değişiklik hemen uygulanır.'
              : 'Yalnızca Xtream hesaplarında geçerlidir; M3U listeleri kendi bağlantılarını kullanır.'
          }
        >
          <Choice
            options={[
              { value: '.ts', label: 'MPEG-TS (.ts)' },
              { value: '.m3u8', label: 'HLS (.m3u8)' },
            ]}
            value={settings.liveStreamFormat === '.m3u8' ? '.m3u8' : '.ts'}
            onChange={(v) => update('liveStreamFormat', v)}
          />
        </Row>
        <Toggle
          label="Yayın akışı (EPG)"
          description="Kanal listesinde, önizlemede ve oynatıcıda şu an ve sonra ne olduğunu gösterir."
          checked={settings.epgEnabled}
          onChange={(v) => update('epgEnabled', v)}
        />
        {settings.epgEnabled && (
          <>
            <Row
              label="EPG durumu"
              description={<span className={epg.state === 'error' ? 'text-amber-300' : void 0}>{epgSummary}</span>}
            >
              <ActionButton onClick={onRefreshEpg} disabled={epg.state === 'loading' || !isNative}>
                {epg.state === 'loading' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CalendarClock className="w-3.5 h-3.5" />
                )}
                Şimdi güncelle
              </ActionButton>
            </Row>
            <Row
              label="Ek EPG adresi (XMLTV)"
              description="Sağlayıcının rehberi eksikse bir XMLTV adresi ekleyin (.xml veya .xml.gz). Birden fazla adresi virgülle ayırabilirsiniz."
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  inputMode="url"
                  value={epgUrlDraft}
                  onChange={(v) => setEpgUrlDraft(v.target.value)}
                  placeholder="https://ornek.com/epg.xml.gz"
                  className="tv-focus-ring flex-1 min-w-0 rounded-xl bg-black/25 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-brand"
                />
                <div className="flex gap-2">
                  <ActionButton
                    tone="primary"
                    onClick={() => update('epgUrl', epgUrlDraft.trim())}
                    disabled={!epgUrlValid || epgUrlDraft.trim() === settings.epgUrl}
                  >
                    Kaydet
                  </ActionButton>
                  {settings.epgUrl && (
                    <ActionButton
                      onClick={() => {
                        (setEpgUrlDraft(''), update('epgUrl', ''));
                      }}
                    >
                      Kaldır
                    </ActionButton>
                  )}
                </div>
              </div>
              {!epgUrlValid && <p className="text-xs text-amber-300">Adres http:// veya https:// ile başlamalı.</p>}
            </Row>
            <Row label="EPG saat düzeltmesi" description="Programlar gerçek saatten erken ya da geç görünüyorsa kaydırın.">
              <div className="flex items-center gap-3">
                <ActionButton onClick={() => update('epgOffsetHours', Math.max(-12, settings.epgOffsetHours - 1))}>
                  <Minus className="w-3.5 h-3.5" />
                </ActionButton>
                <span className="min-w-[5.5rem] text-center text-sm font-bold tabular-nums">
                  {settings.epgOffsetHours === 0
                    ? 'Düzeltme yok'
                    : `${settings.epgOffsetHours > 0 ? '+' : ''}${settings.epgOffsetHours} saat`}
                </span>
                <ActionButton onClick={() => update('epgOffsetHours', Math.min(12, settings.epgOffsetHours + 1))}>
                  <Plus className="w-3.5 h-3.5" />
                </ActionButton>
              </div>
            </Row>
          </>
        )}
      </Section>
      <Section title="Genel">
        <Row label="Açılış ekranı" description="Uygulama açıldığında gösterilecek ekran.">
          <Choice
            options={[
              { value: 'home', label: 'Ana sayfa' },
              { value: 'live', label: 'Canlı TV' },
              { value: 'last_channel', label: 'Son izlenen kanal' },
            ]}
            value={settings.startupBehavior}
            onChange={(v) => update('startupBehavior', v)}
          />
        </Row>
        <Toggle
          label="Listeleri otomatik güncelle"
          description="Kanal, film ve dizi listeleri günde bir kez, uygulama açılırken yenilenir. Favoriler korunur."
          checked={settings.autoRefresh}
          onChange={(v) => update('autoRefresh', v)}
        />
        <Row
          label="Listeler"
          description={
            canRefreshLists ? `Son güncelleme: ${formatTime(account?.lastRefreshAt)}` : 'Bu hesap türü sunucudan yenilenemez.'
          }
        >
          <ActionButton onClick={onRefreshLists} disabled={!canRefreshLists || isRefreshing}>
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Güncelleniyor…' : 'Şimdi güncelle'}
          </ActionButton>
        </Row>
      </Section>
      <Section title="Ebeveyn denetimi">
        {parental.enabled ? (
          <>
            <Row
              label={parentalUnlocked ? 'Açık · kilit şu an açık' : 'Açık · yetişkin içerik kilitli'}
              description={
                <>
                  {parentalUnlocked
                    ? 'Şifre girildi. Uygulama kapanınca veya "Şimdi kilitle" ile yeniden kilitlenir.'
                    : 'Kilitli içeriği açmak için şifre sorulur. Bir kez girilen şifre, uygulama kapanana kadar geçerlidir.'}
                  {parentalNotice && <span className="block mt-1 text-amber-300">{parentalNotice}</span>}
                </>
              }
            >
              {parentalUnlocked ? (
                <ActionButton tone="primary" onClick={() => onParentalUnlockedChange(false)}>
                  <Lock className="w-3.5 h-3.5" />
                  Şimdi kilitle
                </ActionButton>
              ) : (
                <ActionButton onClick={unlockNow}>
                  <LockOpen className="w-3.5 h-3.5" />
                  Kilidi aç
                </ActionButton>
              )}
            </Row>
            <Row
              label="Kilitli kategoriler"
              description={`Canlı TV: ${lockedLive} · Filmler: ${lockedMovies} · Diziler: ${lockedSeries}. Yetişkin kategoriler adından otomatik algılanır; istediğiniz kategoriyi elle kilitleyebilir veya açabilirsiniz.`}
            >
              <ActionButton onClick={onOpenParentalCategories}>
                <Lock className="w-3.5 h-3.5" />
                Kategorileri düzenle
              </ActionButton>
            </Row>
            <Row label="Şifre">
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={changePin}>Şifreyi değiştir</ActionButton>
                <ActionButton tone="danger" onClick={disableParental}>
                  Denetimi kapat
                </ActionButton>
                <ActionButton onClick={() => setResetOpen((v) => !v)}>Şifremi unuttum</ActionButton>
              </div>
              {resetOpen &&
                (isXtream && account != null && account.password ? (
                  <div className="space-y-2">
                    <p className="text-xs text-white/55">Xtream hesabınızın şifresini girin; ebeveyn şifresi sıfırlanır.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(v) => setResetPassword(v.target.value)}
                        placeholder="Hesap şifresi"
                        className="tv-focus-ring flex-1 min-w-0 rounded-xl bg-black/25 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-brand"
                      />
                      <ActionButton tone="primary" onClick={resetWithAccountPassword} disabled={!resetPassword}>
                        Sıfırla
                      </ActionButton>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/55">
                    Bu hesap türünde şifre, Veri bölümündeki "Hesaptan çık ve tüm verileri sil" ile sıfırlanır (hesabı yeniden
                    eklemeniz gerekir).
                  </p>
                ))}
            </Row>
          </>
        ) : (
          <Row
            label="Ebeveyn denetimi kapalı"
            description={
              <>
                Açıldığında yetişkin (+18) kanal, film ve diziler 4 haneli şifreyle kilitlenir: şifre girilene kadar posterleri
                bulanık görünür, kategorilerinde kilit işareti olur ve oynatıcıda kanal değiştirirken atlanır.
                {lockedTotal > 0 && ` Listenizde ${lockedTotal} yetişkin kategori algılandı.`}
                {parentalNotice && <span className="block mt-1 text-amber-300">{parentalNotice}</span>}
              </>
            }
          >
            <ActionButton tone="primary" onClick={enableParental}>
              <ShieldCheck className="w-3.5 h-3.5" />
              Şifre belirle ve aç
            </ActionButton>
          </Row>
        )}
      </Section>
      <Section title="Hesap ve cihaz">
        <div className="px-4 py-3.5 sm:px-5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {[
              ['Playlist', account?.name || '-'],
              [
                'Hesap türü',
                account
                  ? account.type === 'xtream'
                    ? 'Xtream Codes'
                    : account.type === 'demo'
                      ? 'Demo içerik'
                      : 'M3U listesi'
                  : '-',
              ],
              [
                'Abonelik bitişi',
                subscription.expiry +
                  (subscription.remaining && subscription.remaining !== subscription.expiry
                    ? ` · ${subscription.remaining}`
                    : ''),
              ],
              ['Aynı anda bağlantı', account != null && account.maxConnections ? String(account.maxConnections) : '-'],
              ['Cihaz ID', deviceIds.id],
              ['Cihaz PIN', deviceIds.pin],
              ['Cihaz', device ? `${device.manufacturer} ${device.model}` : isNative ? '-' : 'Tarayıcı'],
              ['Android', device ? `${device.androidVersion} (API ${device.sdk})` : '-'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-2">
                <dt className="text-white/55">{label}</dt>
                <dd className="font-semibold text-white text-right truncate tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Row label="Playlist / hesap" description="Başka bir Xtream hesabı veya M3U listesi ekleyin.">
          <ActionButton onClick={onOpenAccount}>
            <UserRound className="w-3.5 h-3.5" />
            Hesabı değiştir
          </ActionButton>
        </Row>
      </Section>
      <Section title="Veri">
        {onOpenAnalytics && (
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="tv-focus-row w-full px-4 py-3.5 sm:px-5 flex items-center gap-3 text-left hover:bg-white/[0.03]"
          >
            <span className="w-9 h-9 shrink-0 rounded-xl bg-brand/15 text-brand flex items-center justify-center">
              <ChartColumn className="w-5 h-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">İzleme istatistikleri</span>
              <span className="block text-xs text-white/55 mt-0.5">İzleme süreleri, en çok izlenen kanallar ve saatler</span>
            </span>
            <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
          </button>
        )}
        <ConfirmAction
          icon={<HardDrive className="w-5 h-5" />}
          label="Önbelleği temizle"
          description={`EPG rehberi ve görsel önbelleği (${formatBytes(epg.cacheBytes + (device?.webCacheBytes || 0))}). Listeler ve favoriler silinmez.`}
          confirmText="EPG ve görsel önbelleği silinsin mi?"
          actionLabel="Temizle"
          onConfirm={onClearCache}
        />
        <ConfirmAction
          icon={<History className="w-5 h-5" />}
          label="İzleme geçmişini sil"
          description="İstatistikler, son izlenenler ve kaldığın yerden devam bilgileri."
          confirmText="Tüm izleme geçmişi silinsin mi?"
          actionLabel="Sil"
          onConfirm={onClearHistory}
        />
        <ConfirmAction
          icon={<LogOut className="w-5 h-5" />}
          label="Hesaptan çık ve tüm verileri sil"
          description={`Hesap, listeler, favoriler ve ayarlar sıfırlanır (${formatBytes(storageBytes)}).`}
          confirmText="Her şey silinecek ve giriş ekranına dönülecek. Emin misiniz?"
          actionLabel="Tümünü sil"
          onConfirm={onClearData}
          danger
        />
      </Section>
      <Section title="Hakkında">
        {(['terms', 'privacy'] as const).map((doc) => (
          <button
            key={doc}
            type="button"
            onClick={() => onOpenLegal(doc)}
            className="tv-focus-row w-full px-4 py-3.5 sm:px-5 flex items-center gap-3 text-left hover:bg-white/[0.03]"
          >
            <span className="w-9 h-9 shrink-0 rounded-xl bg-white/[0.08] text-white/80 flex items-center justify-center">
              {doc === 'terms' ? <FileText className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">{LEGAL_DOCS[doc].title}</span>
              <span className="block text-xs text-white/55 mt-0.5">
                {doc === 'terms' ? 'Uygulamanın kullanım şartları' : 'Hangi bilgilerin nasıl kullanıldığı'} · Güncelleme:{' '}
                {LEGAL_UPDATED}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
          </button>
        ))}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="tv-focus-row w-full px-4 py-3.5 sm:px-5 flex items-center gap-3 text-left hover:bg-white/[0.03]"
        >
          <span className="w-9 h-9 shrink-0 rounded-xl bg-white/[0.08] text-white/80 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">İletişim</span>
            <span className="block text-xs text-white/55 mt-0.5 truncate">
              {DEVELOPER} · {CONTACT_EMAIL}
            </span>
          </span>
        </a>
      </Section>
      <p className="text-center text-[11px] text-white/40">
        Zendit Play {device?.appVersion || ''} · {DEVELOPER}
        {device ? ` · ${device.manufacturer} ${device.model} · Android ${device.androidVersion}` : ''}
      </p>
    </div>
  );
}
