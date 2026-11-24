import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ATTRIBUTION } from '../../../shared/gameData.js';

export function Footer({ light = false }) {
  return (
    <footer className={`mt-8 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[11px] leading-snug ${light ? 'text-white/75' : 'text-ink-soft/80'}`}>
      {ATTRIBUTION}
    </footer>
  );
}

/** Full-height mobile screen with a centered column and the mandatory footer. */
export function Screen({ children, className = '', style, light = false, wide = false }) {
  return (
    <div className={`flex min-h-dvh flex-col ${light ? '' : 'bg-sunset'} ${className}`} style={style}>
      <main className={`mx-auto flex w-full flex-1 flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] ${wide ? 'max-w-5xl' : 'max-w-md'}`}>
        {children}
        <Footer light={light} />
      </main>
    </div>
  );
}

const VARIANTS = {
  primary: 'bg-coral text-white shadow-[0_6px_0_var(--color-coral-deep)] active:translate-y-[4px] active:shadow-[0_2px_0_var(--color-coral-deep)] disabled:bg-coral/40 disabled:shadow-none',
  white: 'bg-white text-ink shadow-[0_6px_0_rgb(0_0_0/0.18)] active:translate-y-[4px] active:shadow-[0_2px_0_rgb(0_0_0/0.18)]',
  ghost: 'bg-white/70 text-ink ring-2 ring-ink/10 active:bg-white',
};

export function Button({ variant = 'primary', to, className = '', children, loading, disabled, ...props }) {
  const cls = `inline-flex w-full min-h-14 items-center justify-center gap-2 rounded-2xl px-6 py-3 font-display text-xl font-bold transition-[transform,box-shadow] duration-100 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`;
  if (to) return <Link to={to} className={cls} {...props}>{children}</Link>;
  return (
    <button type="button" className={cls} disabled={disabled || loading} {...props}>
      {loading ? <Spinner /> : children}
    </button>
  );
}

export function Spinner({ className = '' }) {
  return <span className={`inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-current border-r-transparent ${className}`} aria-label="Loading" />;
}

export function Card({ className = '', children, style }) {
  return <div className={`rounded-3xl bg-white p-5 shadow-[0_10px_30px_-12px_rgb(43_29_20/0.25)] ${className}`} style={style}>{children}</div>;
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700">{children}</p>;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-ink-soft">
        <div className="anim-float text-6xl">🏝️</div>
        <p className="font-semibold">{label}</p>
      </div>
    </Screen>
  );
}

export function MemberList({ members, light = false }) {
  return (
    <ul className="flex flex-col gap-2">
      {members.map((m, i) => (
        <li
          key={m.id}
          className={`anim-rise flex items-center gap-3 rounded-2xl px-4 py-3 ${light ? 'bg-white/20 text-white' : 'bg-sand'}`}
          style={{ animationDelay: `${0.5 + i * 0.15}s` }}
        >
          <span className="text-3xl">{m.avatar}</span>
          <span className="text-lg font-bold">{m.nickname}</span>
          {m.isMe && <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${light ? 'bg-white/30' : 'bg-white'}`}>you</span>}
        </li>
      ))}
    </ul>
  );
}

const CONFETTI_COLORS = ['#FF5A36', '#FFC53D', '#0EA5A0', '#7C3AED', '#DB2777', '#FFFFFF'];

export function Confetti({ count = 48 }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2.2 + Math.random() * 1.6,
    size: 6 + Math.random() * 8,
    drift: `${(Math.random() - 0.5) * 120}px`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: Math.random() > 0.5,
  })), [count]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-4 block"
          style={{
            left: `${p.left}%`, width: p.size, height: p.size * (p.round ? 1 : 0.5),
            background: p.color, borderRadius: p.round ? '50%' : 2, '--drift': p.drift,
            animation: `fall ${p.duration}s cubic-bezier(.3,.6,.6,1) ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
