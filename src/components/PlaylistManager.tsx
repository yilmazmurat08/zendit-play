import { useEffect, useRef, useState } from 'react';
import { Check, FileText, Link as LinkIcon, Loader2, Pencil, Plus, Trash2, Tv, X } from 'lucide-react';
import type { XtreamAccount } from '../types';

export const MAX_PLAYLISTS = 4;

interface PlaylistManagerProps {
  accounts: XtreamAccount[];
  activeId: string | null;
  /** Id of the playlist being switched to (shows a spinner on its card). */
  switchingId: string | null;
  onSwitch: (account: XtreamAccount) => void;
  onAdd: () => void;
  onEdit: (account: XtreamAccount) => void;
  onDelete: (account: XtreamAccount) => void;
  onClose: () => void;
}

const TYPE_LABEL: Record<XtreamAccount['type'], string> = {
  xtream: 'Xtream Codes',
  m3u_url: 'M3U adresi',
  m3u_file: 'M3U dosyası',
};

const TYPE_ICON = { xtream: Tv, m3u_url: LinkIcon, m3u_file: FileText } as const;

function counts(a: XtreamAccount): string {
  const n = (v?: number) => (v || 0).toLocaleString('tr-TR');
  return `${n(a.channelsCount)} kanal · ${n(a.moviesCount)} film · ${n(a.seriesCount)} dizi`;
}

/** Up to four playlists: switch between them in one press, add, edit or delete (with confirmation). */
export function PlaylistManager({ accounts, activeId, switchingId, onSwitch, onAdd, onEdit, onDelete, onClose }: PlaylistManagerProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true });
  }, []);

  const slots: (XtreamAccount | null)[] = Array.from({ length: MAX_PLAYLISTS }, (_, i) => accounts[i] || null);
  const busy = switchingId !== null;

  return (
    <div data-nav-layer className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Listelerim"
        className="glass bg-surface/95 w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Listelerim</h2>
            <p className="text-xs text-white/60">En fazla {MAX_PLAYLISTS} liste. Bir listeye basarak hemen geçin.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="tv-focus-ring w-10 h-10 rounded-full bg-white/[0.08] text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {slots.map((acc, i) => {
            if (!acc) {
              return (
                <button
                  key={`empty-${i}`}
                  ref={i === 0 ? firstRef : undefined}
                  type="button"
                  onClick={onAdd}
                  disabled={busy}
                  className="tv-focus-ring min-h-[8.5rem] rounded-2xl border-2 border-dashed border-white/15 text-white/70 flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-7 h-7" />
                  <span className="text-sm font-semibold">Liste ekle</span>
                  <span className="text-[11px] text-white/45">Boş yuva {i + 1}</span>
                </button>
              );
            }
            const active = acc.id === activeId;
            const Icon = TYPE_ICON[acc.type] || Tv;
            const confirming = confirmId === acc.id;
            return (
              <div
                key={acc.id}
                className={`rounded-2xl p-4 flex flex-col gap-3 ${active ? 'bg-brand/15 ring-2 ring-brand/70' : 'bg-white/[0.06]'}`}
              >
                <button
                  ref={i === 0 ? firstRef : undefined}
                  type="button"
                  onClick={() => !active && onSwitch(acc)}
                  disabled={busy}
                  className="tv-focus-ring -m-1 p-1 rounded-xl flex items-start gap-3 text-left disabled:opacity-70"
                >
                  <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${active ? 'bg-brand text-white' : 'bg-white/10 text-white/80'}`}>
                    {switchingId === acc.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">{acc.name || TYPE_LABEL[acc.type]}</span>
                      {active && (
                        <span className="shrink-0 flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                          <Check className="w-3 h-3" /> Açık
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] text-white/55 truncate">{TYPE_LABEL[acc.type]}</span>
                    <span className="block mt-1 text-[11px] text-white/70 truncate">{counts(acc)}</span>
                    {!active && (
                      <span className="block mt-1 text-[11px] font-semibold text-brand">
                        {switchingId === acc.id ? 'Geçiliyor…' : 'Bu listeye geç'}
                      </span>
                    )}
                  </span>
                </button>

                {confirming ? (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-[11px] font-semibold text-amber-300">Bu liste silinsin mi?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmId(null);
                        onDelete(acc);
                      }}
                      className="tv-focus-ring rounded-full bg-alert px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Evet, sil
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="tv-focus-ring rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Vazgeç
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(acc)}
                      disabled={busy}
                      className="tv-focus-ring flex items-center gap-1.5 rounded-full bg-white/[0.09] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(acc.id)}
                      disabled={busy}
                      className="tv-focus-ring flex items-center gap-1.5 rounded-full bg-white/[0.09] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Sil
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
