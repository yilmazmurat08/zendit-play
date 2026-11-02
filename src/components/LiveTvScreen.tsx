import { useEffect, useMemo, useState } from 'react';
import { Channel, XtreamAccount } from '../types';
import { Heart, Tv } from 'lucide-react';
import { useVirtualList } from '../lib/useVirtualList';
import { CATEGORY_ADDED, CATEGORY_FAVORITES, CATEGORY_RECENT, DeviceInfo, useIsTv } from '../lib/tv';
import { CategoryPanel, Footer, LegendKey, PosterImage } from './TvUi';
import { LivePreview } from './LivePreview';

interface LiveTvScreenProps {
  channels: Channel[];
  recentIds: string[];
  initialCategory?: string;
  searchQuery?: string;
  isPlayerOpen: boolean;
  account: XtreamAccount | null;
  device: DeviceInfo;
  onPlayChannel: (channel: Channel) => void;
  onPreviewChannel: (channel: Channel) => void;
  onToggleFavorite: (id: string) => void;
  /** Narrow landscape stage (phone held sideways): wider channel column. */
  compact?: boolean;
}

const ALL_CHANNELS = 'Tüm Kanallar';

// TV remote color keys (Android TV / HbbTV key names and key codes).
const COLOR_KEYS: Record<string, 'red' | 'green' | 'yellow' | 'blue'> = {
  ColorF0Red: 'red',
  ColorF1Green: 'green',
  ColorF2Yellow: 'yellow',
  ColorF3Blue: 'blue',
  '403': 'red',
  '404': 'green',
  '405': 'yellow',
  '406': 'blue',
};

export function LiveTvScreen({
  channels,
  recentIds,
  initialCategory,
  searchQuery = '',
  isPlayerOpen,
  account,
  device,
  onPlayChannel,
  onPreviewChannel,
  onToggleFavorite,
  compact = false,
}: LiveTvScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || ALL_CHANNELS);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'number' | 'name'>('number');
  const [showCategories, setShowCategories] = useState(true);
  const isTv = useIsTv();

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    channels.forEach((ch) => {
      const cat = ch.category?.trim();
      if (cat) counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    const sorted = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, 'tr'));
    return [
      { name: CATEGORY_RECENT },
      { name: CATEGORY_ADDED },
      { name: CATEGORY_FAVORITES },
      { name: ALL_CHANNELS, count: channels.length },
      ...sorted.map((name) => ({ name, count: counts.get(name) || 0 })),
    ];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    let list: Channel[];
    if (selectedCategory === CATEGORY_RECENT) {
      const map = new Map(channels.map((c) => [c.id, c]));
      list = recentIds.map((id) => map.get(id)).filter((c): c is Channel => Boolean(c));
    } else if (selectedCategory === CATEGORY_ADDED) {
      list = channels.slice(-60).reverse();
    } else if (selectedCategory === CATEGORY_FAVORITES) {
      list = channels.filter((c) => c.isFavorite);
    } else if (selectedCategory === ALL_CHANNELS) {
      list = channels;
    } else {
      list = channels.filter((c) => c.category?.trim() === selectedCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (ch) => ch.name.toLowerCase().includes(q) || ch.currentShow.toLowerCase().includes(q) || ch.category.toLowerCase().includes(q)
      );
    }
    if (sortMode === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    return list;
  }, [channels, recentIds, selectedCategory, searchQuery, sortMode]);

  const previewChannel = useMemo(() => channels.find((c) => c.id === previewId) || null, [channels, previewId]);

  const rowHeight = isTv ? 73 : 64;
  const { containerRef, totalHeight, offsetY, startIndex, endIndex } = useVirtualList(filteredChannels.length, rowHeight, 6);
  const visibleChannels = filteredChannels.slice(startIndex, endIndex);

  const handleChannelClick = (ch: Channel) => {
    if (ch.id === previewId) {
      onPlayChannel(ch);
      return;
    }
    setPreviewId(ch.id);
    onPreviewChannel(ch);
  };

  const focusedOrPreviewChannel = (): Channel | null => {
    const id = (document.activeElement as HTMLElement | null)?.dataset?.channelId;
    return (id && channels.find((c) => c.id === id)) || previewChannel;
  };

  const runColorAction = (color: 'red' | 'green' | 'yellow' | 'blue') => {
    if (color === 'red') {
      const ch = focusedOrPreviewChannel();
      if (ch) onPlayChannel(ch);
    } else if (color === 'green') {
      const ch = focusedOrPreviewChannel();
      if (ch) onToggleFavorite(ch.id);
    } else if (color === 'yellow') {
      setShowCategories((v) => !v);
    } else {
      setSortMode((m) => (m === 'number' ? 'name' : 'number'));
    }
  };

  useEffect(() => {
    if (isPlayerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const color = COLOR_KEYS[e.key] || COLOR_KEYS[String(e.keyCode)];
      if (!color) return;
      e.preventDefault();
      runColorAction(color);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const epgProgress = Math.min(100, Math.max(0, previewChannel?.progress || 0));

  return (
    <div id="zendit-live-tv-screen" className="h-full flex flex-col">
      <div
        className={`flex-1 min-h-0 flex flex-col gap-3 px-4 tv:grid tv:gap-[1.5rem] tv:px-[5rem] ${
          showCategories
            ? compact
              ? 'tv:grid-cols-[22fr_38fr_40fr]'
              : 'tv:grid-cols-[24fr_28fr_48fr]'
            : compact
            ? 'tv:grid-cols-[45fr_55fr]'
            : 'tv:grid-cols-[34fr_66fr]'
        }`}
      >
        {showCategories && <CategoryPanel items={categories} selected={selectedCategory} onSelect={setSelectedCategory} />}

        {/* Channel list */}
        <div className="glass flex-1 tv:flex-none min-h-[16rem] tv:min-h-0 rounded-2xl tv:rounded-[2rem] p-2 tv:p-[0.9rem] flex flex-col">
          <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            {filteredChannels.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-white/55 px-6 py-10">
                <Tv className="w-7 h-7 tv:w-[3rem] tv:h-[3rem]" />
                <p className="text-sm tv:text-[1.15rem]">
                  {channels.length === 0 ? 'Henüz kanal listesi yok.' : 'Bu kategoride veya aramada kanal bulunamadı.'}
                </p>
              </div>
            ) : (
              <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${offsetY}px)` }}>
                  {visibleChannels.map((ch, i) => {
                    const isPreview = ch.id === previewId;
                    return (
                      <div key={ch.id} style={{ height: rowHeight }} className="py-[3px] tv:py-[0.3rem]">
                        <button
                          type="button"
                          data-channel-id={ch.id}
                          onClick={() => handleChannelClick(ch)}
                          className={`tv-focus w-full h-full flex items-center gap-3 tv:gap-[1rem] rounded-xl tv:rounded-[1rem] px-3 tv:px-[1rem] text-left ${
                            isPreview ? 'bg-brand/35 text-white' : 'text-white'
                          }`}
                        >
                          <span className="w-7 tv:w-[2.4rem] shrink-0 text-sm tv:text-[1.25rem] font-bold tabular-nums">
                            {String(ch.number || startIndex + i + 1).padStart(2, '0')}
                          </span>
                          <span className="w-9 h-9 tv:w-[2.8rem] tv:h-[2.8rem] shrink-0 rounded-lg tv:rounded-[0.6rem] overflow-hidden bg-white/10">
                            <PosterImage src={ch.logo} />
                          </span>
                          <span className="flex-1 min-w-0 text-sm tv:text-[1.3rem] font-semibold truncate">{ch.name}</span>
                          {ch.isFavorite && <Heart className="w-3.5 h-3.5 tv:w-[1.2rem] tv:h-[1.2rem] shrink-0" fill="currentColor" />}
                          {isPreview && <span className="w-1.5 h-1.5 tv:w-[0.5rem] tv:h-[0.5rem] shrink-0 rounded-full bg-white" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview + EPG */}
        <div className="order-first tv:order-none min-h-0 flex flex-col gap-3 tv:gap-[1.5rem]">
          <LivePreview
            channel={previewChannel}
            active={!isPlayerOpen}
            onOpenFullscreen={() => previewChannel && onPlayChannel(previewChannel)}
          />
          <div className="glass hidden tv:block flex-1 min-h-0 rounded-[1.75rem] p-[1.6rem] overflow-y-auto no-scrollbar">
            {!previewChannel ? (
              <p className="text-[1.15rem] font-semibold text-white/85">Kanal seçildiğinde yayın akışı burada görünür.</p>
            ) : !previewChannel.currentShow ? (
              <p className="text-[1.15rem] font-semibold text-white/85">EPG verisi yok</p>
            ) : (
              <div className="space-y-[1.25rem]">
                <div className="flex items-center gap-[1rem]">
                  <span className="w-[3.25rem] h-[3.25rem] rounded-[0.8rem] overflow-hidden bg-white/10 shrink-0">
                    <PosterImage src={previewChannel.logo} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[1.35rem] font-bold truncate">{previewChannel.name}</div>
                    <div className="text-[0.95rem] text-white/60 truncate">{previewChannel.category}</div>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[0.9rem] font-bold uppercase tracking-wider text-brand">Şimdi</span>
                    {(previewChannel.epgStart || previewChannel.epgEnd) && (
                      <span className="text-[0.95rem] font-semibold text-white/70 tabular-nums">
                        {previewChannel.epgStart} - {previewChannel.epgEnd}
                      </span>
                    )}
                  </div>
                  <div className="text-[1.3rem] font-semibold mt-[0.3rem]">{previewChannel.currentShow}</div>
                  <div className="mt-[0.7rem] h-[0.35rem] rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full bg-brand" style={{ width: `${epgProgress}%` }} />
                  </div>
                </div>
                {previewChannel.nextShow && (
                  <div>
                    <span className="text-[0.9rem] font-bold uppercase tracking-wider text-white/55">Sonra</span>
                    <div className="text-[1.15rem] font-semibold text-white/85 mt-[0.3rem]">{previewChannel.nextShow}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer account={account} device={device}>
        <LegendKey color="red" label="Tam Ekran" onClick={() => runColorAction('red')} />
        <LegendKey color="blue" label={sortMode === 'number' ? 'A-Z Sırala' : 'Numaraya Göre'} onClick={() => runColorAction('blue')} />
        <LegendKey color="yellow" label="Görünüm" onClick={() => runColorAction('yellow')} />
        <LegendKey color="green" label="Favori" onClick={() => runColorAction('green')} />
      </Footer>
    </div>
  );
}
