import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Delete, Lock, LockOpen, Search, ShieldCheck } from 'lucide-react';
import type { ParentalConfig } from '../types';
import { categoryKey, isAdultText, isCategoryRestricted, pinWaitMs, recordPinResult, type ParentalKind } from '../lib/parental';

const PIN_LENGTH = 4;

export interface CategoryCount {
  name: string;
  count: number;
}

export interface PinPromptOptions {
  mode: 'create' | 'verify';
  title: string;
  message: string;
}

interface PinDialogProps extends PinPromptOptions {
  /** Checks a PIN in verify mode. */
  verify?: (pin: string) => boolean;
  onDone: (pin: string) => void;
  onCancel: () => void;
}

/** 4-digit PIN pad (touch, keyboard and TV remote). `create` asks twice; `verify` rate-limits wrong tries. */
export function PinDialog({ mode, title, message, verify, onDone, onCancel }: PinDialogProps) {
  const [digits, setDigits] = useState(''),
    [step, setStep] = useState('first'),
    [firstPin, setFirstPin] = useState(''),
    [error, setError] = useState(''),
    [shakeKey, setShakeKey] = useState(0),
    [waitMs, setWaitMs] = useState(() => (mode === 'verify' ? pinWaitMs() : 0)),
    firstKeyRef = useRef<HTMLButtonElement>(null),
    [isTouch] = useState(() => {
      var se;
      return typeof window < 'u' && !!((se = window.matchMedia) != null && se.call(window, '(pointer: coarse)').matches);
    });
  (useEffect(() => {
    firstKeyRef.current?.focus();
  }, []),
    useEffect(() => {
      if (waitMs <= 0) return;
      const se = setInterval(() => setWaitMs(pinWaitMs()), 500);
      return () => clearInterval(se);
    }, [waitMs > 0]));
  const fail = (se) => {
      (setError(se), setDigits(''), setShakeKey((ie) => ie + 1));
    },
    submit = (se) => {
      if (mode === 'verify') {
        const ie = !!(verify != null && verify(se));
        if ((recordPinResult(ie), ie)) {
          onDone(se);
          return;
        }
        const ee = pinWaitMs();
        (setWaitMs(ee), fail(ee > 0 ? 'Çok fazla hatalı deneme.' : 'Şifre yanlış, tekrar deneyin.'));
        return;
      }
      if (step === 'first') {
        (setFirstPin(se), setStep('confirm'), setDigits(''), setError(''));
        return;
      }
      if (se === firstPin) {
        onDone(se);
        return;
      }
      (setStep('first'), setFirstPin(''), fail('Şifreler eşleşmedi. Baştan girin.'));
    },
    locked = waitMs > 0,
    press = (se) => {
      if (locked || digits.length >= PIN_LENGTH) return;
      const ie = digits + se;
      (setError(''), setDigits(ie), ie.length === PIN_LENGTH && setTimeout(() => submit(ie), 150));
    },
    erase = () => setDigits((se) => se.slice(0, -1)),
    actionsRef = useRef({ press, erase, onCancel });
  ((actionsRef.current = { press, erase, onCancel }),
    useEffect(() => {
      const se = (ie) => {
        const ee = actionsRef.current;
        let le = true;
        (/^[0-9]$/.test(ie.key)
          ? ee.press(ie.key)
          : ie.key === 'Backspace' || ie.key === 'Delete'
            ? ee.erase()
            : ['Escape', 'GoBack', 'BrowserBack'].includes(ie.key)
              ? ee.onCancel()
              : (le = false),
          le && (ie.preventDefault(), ie.stopImmediatePropagation()));
      };
      return (window.addEventListener('keydown', se, true), () => window.removeEventListener('keydown', se, true));
    }, []));
  const heading = mode === 'create' ? (step === 'first' ? title : 'Şifreyi tekrar girin') : title,
    hint = mode === 'create' && step === 'confirm' ? 'Onaylamak için aynı 4 haneyi bir kez daha girin.' : message,
    keyClass =
      'tv-focus-ring w-[4.75rem] h-14 [@media(max-height:420px)]:h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] font-bold text-white flex items-center justify-center disabled:opacity-40',
    digitClass = `${keyClass} text-xl`;
  return (
    <div data-nav-layer className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="glass bg-surface/95 rounded-3xl p-6 [@media(max-height:420px)]:p-4 flex flex-col [@media(max-height:560px)]:flex-row items-center gap-6 [@media(max-height:560px)]:gap-10 max-w-full"
      >
        <div className="flex flex-col items-center text-center w-[17rem] max-w-full">
          <span className="w-12 h-12 [@media(max-height:420px)]:w-10 [@media(max-height:420px)]:h-10 rounded-2xl bg-brand/15 text-brand flex items-center justify-center">
            {mode === 'create' ? <ShieldCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </span>
          <h2 className="mt-3 text-lg font-bold text-white">{heading}</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/65">{hint}</p>
          <div
            key={shakeKey}
            className={`mt-5 [@media(max-height:420px)]:mt-3 flex gap-3 ${shakeKey ? 'pin-shake' : ''}`}
            aria-live="polite"
          >
            {Array.from({ length: PIN_LENGTH }, (se, ie) => (
              <span
                key={ie}
                className={`w-11 h-12 rounded-xl border-2 flex items-center justify-center ${ie < digits.length ? 'border-brand bg-brand/15' : 'border-white/20 bg-black/20'}`}
              >
                {ie < digits.length && <span className="w-3 h-3 rounded-full bg-white" />}
              </span>
            ))}
          </div>
          <p className={`mt-3 min-h-[1.25rem] text-xs font-semibold ${error || locked ? 'text-amber-300' : 'text-white/45'}`}>
            {locked
              ? `${error ? error + ' ' : ''}${Math.ceil(waitMs / 1e3)} sn sonra tekrar deneyin.`
              : error || (isTouch ? '' : 'Kumandanın rakam tuşlarını da kullanabilirsiniz.')}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2.5 [@media(max-height:420px)]:gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((se) => (
            <button
              key={se}
              ref={se === '1' ? firstKeyRef : void 0}
              type="button"
              disabled={locked}
              onClick={() => press(se)}
              className={digitClass}
            >
              {se}
            </button>
          ))}
          <button type="button" onClick={onCancel} className={`${keyClass} text-sm`}>
            Vazgeç
          </button>
          <button type="button" disabled={locked} onClick={() => press('0')} className={digitClass}>
            0
          </button>
          <button type="button" onClick={erase} aria-label="Sil" className={digitClass}>
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
const KIND_TABS: { kind: ParentalKind; label: string }[] = [
  { kind: 'live', label: 'Canlı TV' },
  { kind: 'movie', label: 'Filmler' },
  { kind: 'series', label: 'Diziler' },
];
interface ParentalCategoryEditorProps {
  config: ParentalConfig;
  categories: Record<ParentalKind, CategoryCount[]>;
  onChange: (overrides: ParentalConfig['overrides']) => void;
  onClose: () => void;
}

/** Full-screen list to lock / unlock categories by hand. */
export function ParentalCategoryEditor({ config, categories, onChange, onClose }: ParentalCategoryEditorProps) {
  const [kind, setKind] = useState<ParentalKind>('live'),
    [query, setQuery] = useState(''),
    [onlyLocked, setOnlyLocked] = useState(false),
    backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    backRef.current?.focus();
  }, []);
  const lockedCount = (b) => categories[b].filter((T) => isCategoryRestricted(config, b, T.name)).length,
    visible = useMemo(() => {
      const b = query.trim().toLocaleLowerCase('tr-TR');
      return categories[kind].filter(
        (T) =>
          (!b || T.name.toLocaleLowerCase('tr-TR').includes(b)) && (!onlyLocked || isCategoryRestricted(config, kind, T.name)),
      );
    }, [categories, kind, query, onlyLocked, config]),
    toggle = (b) => {
      const T = categoryKey(kind, b),
        A = { ...config.overrides },
        k = isCategoryRestricted(config, kind, b);
      (!k === isAdultText(b) ? delete A[T] : (A[T] = !k), onChange(A));
    };
  return (
    <div data-nav-layer className="app-bg fixed inset-0 z-[60] overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-4">
        <div className="flex items-center gap-3">
          <button
            ref={backRef}
            type="button"
            onClick={onClose}
            aria-label="Geri"
            className="tv-focus-ring w-10 h-10 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] text-white flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-wide text-white">Kilitli kategoriler</h1>
            <p className="text-xs text-white/55">
              Adında XXX, Adult, +18, Yetişkin, Erotik gibi ifadeler geçenler otomatik kilitlenir. Buradan istediğiniz kategoriyi
              kilitleyebilir veya kilidini kaldırabilirsiniz.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist">
          {KIND_TABS.map((b) => (
            <button
              key={b.kind}
              type="button"
              role="tab"
              aria-selected={kind === b.kind}
              onClick={() => setKind(b.kind)}
              className={`tv-focus-ring rounded-full px-4 py-2 text-xs font-bold ${kind === b.kind ? 'bg-brand text-white' : 'bg-white/[0.07] text-white/80 hover:bg-white/[0.13]'}`}
            >
              {b.label}
              {' · '}
              {lockedCount(b.kind)}
              {' kilitli'}
            </button>
          ))}
          <button
            type="button"
            role="switch"
            aria-checked={onlyLocked}
            onClick={() => setOnlyLocked((b) => !b)}
            className={`tv-focus-ring rounded-full px-4 py-2 text-xs font-bold ${onlyLocked ? 'bg-lilac text-white' : 'bg-white/[0.07] text-white/80 hover:bg-white/[0.13]'}`}
          >
            Yalnızca kilitliler
          </button>
        </div>
        <label className="flex items-center gap-2 rounded-xl bg-black/25 border border-white/10 px-3.5 focus-within:border-brand">
          <Search className="w-4 h-4 text-white/45 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(b) => setQuery(b.target.value)}
            placeholder="Kategori ara"
            className="tv-focus-ring flex-1 min-w-0 bg-transparent py-2.5 text-sm text-white placeholder:text-white/35 outline-none"
          />
        </label>
        <div className="glass rounded-3xl divide-y divide-white/[0.07] overflow-hidden">
          {visible.length === 0 && <p className="px-5 py-6 text-sm text-white/55">Kategori bulunamadı.</p>}
          {visible.map((b) => {
            const T = isCategoryRestricted(config, kind, b.name),
              A = config.overrides[categoryKey(kind, b.name)] === void 0;
            return (
              <button
                key={b.name}
                type="button"
                role="switch"
                aria-checked={T}
                onClick={() => toggle(b.name)}
                className="tv-focus-row w-full px-4 py-3 sm:px-5 flex items-center gap-3 text-left hover:bg-white/[0.03]"
              >
                <span
                  className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${T ? 'bg-brand/20 text-brand' : 'bg-white/[0.06] text-white/40'}`}
                >
                  {T ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white truncate">{b.name}</span>
                  <span className="block text-[11px] text-white/50">
                    {b.count.toLocaleString('tr-TR')}
                    {' içerik'}
                    {T && A ? ' · otomatik algılandı' : A ? '' : ' · elle ayarlandı'}
                  </span>
                </span>
                <span className={`relative w-12 h-7 shrink-0 rounded-full transition-colors ${T ? 'bg-brand' : 'bg-white/15'}`}>
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${T ? 'translate-x-5' : ''}`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
