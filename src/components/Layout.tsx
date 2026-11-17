import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Avatar, Emblem, Icon, Spinner } from './ui';

const NAV = [
  { to: '/', label: 'Home', icon: Icon.home, end: true },
  { to: '/live', label: 'Live Tests', icon: Icon.live },
  { to: '/performance', label: 'Performance', icon: Icon.chart },
  { to: '/current-affairs', label: 'Current Affairs', icon: Icon.news },
  { to: '/community', label: 'Community', icon: Icon.community },
  { to: '/leaderboard', label: 'Rankers', icon: Icon.trophy },
  { to: '/profile', label: 'Profile', icon: Icon.user },
];

const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: Icon.home, end: true },
  { to: '/live', label: 'Live', icon: Icon.live },
  { to: '/current-affairs', label: 'News', icon: Icon.news },
  { to: '/community', label: 'Community', icon: Icon.community },
  { to: '/profile', label: 'Profile', icon: Icon.user },
];

/** Search box in the top bar. Searching filters the exam list on the home page. */
function SearchBox() {
  const [params] = useSearchParams();
  const loc = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState(loc.pathname === '/' ? params.get('q') || '' : '');

  useEffect(() => {
    if (loc.pathname !== '/') setQ('');
  }, [loc.pathname]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/?q=${encodeURIComponent(term)}#exams` : '/');
  };

  return (
    <form className="search" onSubmit={submit} role="search">
      <Icon.search />
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search exams, tests..."
        aria-label="Search exams"
      />
    </form>
  );
}

export function AppLayout() {
  const { user } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="side-brand">
          <Emblem size={64} />
          <span>Rajasthan Exams</span>
        </Link>
        <nav className="side-nav">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <n.icon />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-promo">
          <div className="side-promo-title"><Icon.gift /> Refer &amp; Earn</div>
          <ul>
            <li><Icon.check /> Dosto ko invite karein</li>
            <li><Icon.check /> Har referral par coins</li>
            <li><Icon.check /> Coins se exam sasta</li>
          </ul>
          <Link to="/referral" className="btn btn-accent btn-block">Invite karein <Icon.arrow /></Link>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <Link to="/" className="brand mobile-only">
            <img src="/logo.png" alt="" />
            <span>Rajasthan Exams</span>
          </Link>
          <SearchBox />
          <div className="header-right">
            {user && <span className="coin-pill" title="Aapke coins"><span className="coin" /> {user.coins}</span>}
            <Link to="/notifications" className="icon-btn" aria-label="Notifications"><Icon.bell /></Link>
            {user ? (
              <Link to="/profile" className="hide-mobile" aria-label="Profile">
                <Avatar pic={user.profilePicture} name={user.name} />
              </Link>
            ) : (
              <Link to="/login" className="btn btn-sm">Login</Link>
            )}
          </div>
        </header>
        <main className="container">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav">
        {MOBILE_NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <n.icon />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Sends logged-out visitors to /login, remembering where they wanted to go. */
export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading && !user) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return children;
}

/** Keeps logged-in users away from login/signup screens. */
export function GuestOnly({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from || '/';
  if (user) return <Navigate to={from} replace />;
  return children;
}
