import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearStoredLists, LIST_KEYS } from '../lib/listStore';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

const RELOAD_FLAG = 'zendit_recovered_at';

/**
 * Last line of defence: a render error anywhere in the tree would otherwise leave a blank screen
 * (and on TV a remote that does nothing). The first failure reloads the app quietly; if it fails
 * again within a minute the viewer gets a plain recovery screen instead of a reload loop.
 * Saved accounts, lists and settings are not touched.
 */
export class ErrorBoundary extends Component<Props, State> {
  declare readonly props: Props;
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Zendit: render error', error, info.componentStack);
    try {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
      if (Date.now() - last > 60000) {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
        window.location.reload();
      }
    } catch {
      // sessionStorage unavailable: fall through to the recovery screen.
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="app-bg fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 px-6 text-center text-white">
        <h1 className="text-xl font-bold">Bir sorun oluştu</h1>
        <p className="max-w-md text-sm text-white/70">
          Ekran yüklenirken beklenmeyen bir hata oldu. Hesabınız, listeleriniz ve ayarlarınız yerinde duruyor.
        </p>
        <button
          type="button"
          autoFocus
          onClick={() => window.location.reload()}
          className="tv-focus-ring rounded-full bg-brand px-6 py-3 text-sm font-bold text-white"
        >
          Yeniden başlat
        </button>
        <button
          type="button"
          onClick={async () => {
            // Last resort when a restart does not help: drop the downloaded lists (they are fetched
            // again from the provider on the next start). The account and settings stay.
            await clearStoredLists().catch(() => {});
            try {
              for (const key of LIST_KEYS) localStorage.removeItem(key);
            } catch {
              // ignore
            }
            window.location.reload();
          }}
          className="tv-focus-ring rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white/85"
        >
          Listeleri yeniden indir (favoriler sıfırlanır)
        </button>
      </div>
    );
  }
}
