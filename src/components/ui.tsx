import { useEffect, useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { avatarSrc, initials } from '../lib/utils';

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card empty">
      <div className="big">⚠️</div>
      <p>{message}</p>
      {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry}>Dobara try karein</button>}
    </div>
  );
}

export function Empty({ icon = '📭', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="card empty">
      <div className="big">{icon}</div>
      <p className="bold" style={{ color: 'var(--text)' }}>{title}</p>
      {children}
    </div>
  );
}

/** Renders loading / error / content for a useLoad() result. */
export function Loadable<T>({ state, children }: {
  state: { data: T | null; error: string | null; loading: boolean; reload: () => void };
  children: (data: T) => ReactNode;
}) {
  if (state.loading && state.data == null) return <Spinner />;
  if (state.error && state.data == null) return <ErrorBox message={state.error} onRetry={state.reload} />;
  if (state.data == null) return null;
  return <>{children(state.data)}</>;
}

export function Avatar({ pic, name, size }: { pic?: string | null; name?: string | null; size?: 'lg' }) {
  const src = avatarSrc(pic);
  return (
    <div className={'avatar' + (size === 'lg' ? ' avatar-lg' : '')}>
      {src ? <img src={src} alt="" /> : initials(name)}
    </div>
  );
}

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="card modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Rajasthan Exams` : 'Rajasthan Exams';
  }, [title]);
}

// Small inline icons (no icon library needed)
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const Icon = {
  home: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>,
  live: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="3" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" /></svg>,
  news: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M4 4h13v16H6a2 2 0 0 1-2-2zM17 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h5" /></svg>,
  community: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" /></svg>,
  user: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
  bell: () => <svg width="20" height="20" viewBox="0 0 24 24" {...P}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" /></svg>,
  trophy: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>,
  chart: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  heart: ({ filled }: { filled?: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" {...P} fill={filled ? 'currentColor' : 'none'}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /></svg>,
  eye: () => <svg width="18" height="18" viewBox="0 0 24 24" {...P}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  back: () => <svg width="20" height="20" viewBox="0 0 24 24" {...P}><path d="M15 18l-6-6 6-6" /></svg>,
  clock: () => <svg width="16" height="16" viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  lock: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
  search: () => <svg width="18" height="18" viewBox="0 0 24 24" {...P}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  arrow: () => <svg width="16" height="16" viewBox="0 0 24 24" {...P}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" /></svg>,
  target: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>,
  clipboard: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></svg>,
  star: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></svg>,
  gift: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13M12 8S10.5 3 8 3.5 7 8 12 8zM12 8s1.5-5 4-4.5S17 8 12 8z" /></svg>,
  check: () => <svg width="16" height="16" viewBox="0 0 24 24" {...P}><path d="m5 12 5 5 9-10" /></svg>,
  layers: () => <svg width="22" height="22" viewBox="0 0 24 24" {...P}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></svg>,
  calendar: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
};

/** Light outline of a Hawa Mahal style facade, drawn as rows of small arched windows. */
export function HawaMahal({ className = 'hero-art' }: { className?: string }) {
  const rows = [3, 5, 7, 9, 11, 13];
  const w = 18, h = 20;
  const width = 13 * w;
  const parts: ReactNode[] = [];
  rows.forEach((count, r) => {
    const y = 10 + r * h;
    const x0 = (width - count * w) / 2;
    for (let i = 0; i < count; i++) {
      const x = x0 + i * w;
      parts.push(<path key={`${r}-${i}`} d={`M${x + 3} ${y + h - 2}V${y + 8}a${w / 2 - 3} ${w / 2 - 3} 0 0 1 ${w - 6} 0V${y + h - 2}`} />);
    }
    parts.push(<path key={`l${r}`} d={`M${x0} ${y + h}H${x0 + count * w}`} />);
  });
  return (
    <svg className={className} viewBox={`0 0 ${width} ${10 + rows.length * h + 6}`} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d={`M${width / 2} 0v10M${width / 2 - 6} 10h12`} />
        {parts}
      </g>
    </svg>
  );
}

/** Gradient page banner used at the top of every inner page. */
export function PageHeader({ icon, title, subtitle, actions, children }: {
  icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode;
}) {
  return (
    <section className="page-head">
      <div className="page-head-text">
        <div className="row" style={{ gap: 12 }}>
          {icon && <span className="page-head-icon">{icon}</span>}
          <h1>{title}</h1>
        </div>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
      <HawaMahal className="page-head-art" />
    </section>
  );
}

/** Small icon + label + big number card. */
export function StatCard({ icon, tint, label, value }: { icon: ReactNode; tint: string; label: string; value: ReactNode }) {
  return (
    <div className="card stat-card">
      <div className={`stat-icon ${tint}`}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}

/** Back link shown above detail pages. */
export function BackLink({ to, label, onClick }: { to?: string; label: string; onClick?: () => void }) {
  if (onClick) return <button className="back-link" onClick={onClick}><Icon.back /> {label}</button>;
  return <Link to={to || '/'} className="back-link"><Icon.back /> {label}</Link>;
}

/** Small saffron camel-and-fort emblem used next to the brand name. */
export function Emblem({ size = 44 }: { size?: number }) {
  // Each emblem needs its own gradient id; a shared id breaks when another copy is hidden.
  const gid = 'emb' + useId().replace(/:/g, '');
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 100 62" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc15e" />
          <stop offset="1" stopColor="#ff8a1f" />
        </linearGradient>
      </defs>
      {/* fort */}
      <path fill={`url(#${gid})`} d="M38 52V24h4v-6h4v6h6v-10l4-6 4 6v10h6v-6h4v6h4v28z" />
      <path fill="#1b2559" opacity=".55" d="M53 52v-9a3 3 0 0 1 6 0v9zM44 34h4v5h-4zM64 34h4v5h-4z" />
      {/* camel */}
      <path fill={`url(#${gid})`} d="M6 52l2-12c-3-1-4-4-3-6 2 1 3 0 4-2l3-5c1-2 4-2 5 0l2 4c1-3 4-5 7-4 3 1 4 4 5 7l1 6h-3l-1 12h-3l-1-10h-6l-2 10h-3l1-10-4 0-2 10z" />
      <path fill={`url(#${gid})`} d="M0 55h100v3H0z" />
    </svg>
  );
}
