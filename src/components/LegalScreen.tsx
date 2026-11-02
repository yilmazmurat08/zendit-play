import { useEffect, useRef } from 'react';
import { ArrowLeft, FileText, Mail, ShieldCheck } from 'lucide-react';
import { CONTACT_EMAIL, DEVELOPER, LEGAL_DOCS, LEGAL_UPDATED, type LegalDocId } from '../lib/legal';

/** Terms of Use / Privacy Policy reader (Settings > Hakkında). Every block is focusable for the TV remote. */
export function LegalScreen({ doc, onBack, onOpen }: { doc: LegalDocId; onBack: () => void; onOpen: (doc: LegalDocId) => void }) {
  const content = LEGAL_DOCS[doc],
    other = doc === 'terms' ? 'privacy' : 'terms',
    titleRef = useRef<HTMLButtonElement | null>(null);
  // Focus the back button (TV remote) and scroll to the top whenever the document changes.
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    titleRef.current?.closest('[data-nav-layer]')?.scrollTo(0, 0);
  }, [doc]);
  const DocIcon = doc === 'terms' ? FileText : ShieldCheck,
    OtherIcon = other === 'terms' ? FileText : ShieldCheck;
  return (
    <div id="zendit-legal-screen" className="max-w-3xl mx-auto px-4 py-5 pb-16 space-y-4">
      <div className="flex items-center gap-3">
        <button
          ref={titleRef}
          type="button"
          onClick={onBack}
          aria-label="Geri"
          className="tv-focus-ring w-10 h-10 shrink-0 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] text-white flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="w-10 h-10 shrink-0 rounded-xl bg-brand/15 text-brand flex items-center justify-center">
          <DocIcon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-wide text-white truncate">{content.title}</h1>
          <p className="text-xs text-white/55">
            Son güncelleme: {LEGAL_UPDATED} · {DEVELOPER}
          </p>
        </div>
      </div>
      <section tabIndex={0} className="glass rounded-2xl p-4 sm:p-5 outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <p className="text-sm leading-relaxed text-white/85">{content.intro}</p>
      </section>
      {content.sections.map((section) => (
        <section
          key={section.heading}
          tabIndex={0}
          className="glass rounded-2xl p-4 sm:p-5 outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <h2 className="text-sm font-bold text-white">{section.heading}</h2>
          <div className="mt-2 space-y-2">
            {section.body.map((line, i) =>
              line.startsWith('• ') ? (
                <p key={i} className="flex gap-2 text-sm leading-relaxed text-white/75">
                  <span className="mt-[0.55em] w-1.5 h-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{line.slice(2)}</span>
                </p>
              ) : (
                <p key={i} className="text-sm leading-relaxed text-white/75">
                  {line}
                </p>
              ),
            )}
          </div>
        </section>
      ))}
      <div className="flex flex-wrap gap-2.5 pt-1">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="tv-focus-ring inline-flex items-center gap-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] px-4 py-2 text-sm font-semibold text-white"
        >
          <Mail className="w-4 h-4" /> {CONTACT_EMAIL}
        </a>
        <button
          type="button"
          onClick={() => onOpen(other)}
          className="tv-focus-ring inline-flex items-center gap-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] px-4 py-2 text-sm font-semibold text-white"
        >
          <OtherIcon className="w-4 h-4" /> {LEGAL_DOCS[other].title}
        </button>
      </div>
    </div>
  );
}
