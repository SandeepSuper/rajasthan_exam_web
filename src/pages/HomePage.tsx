import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Exam, NewsItem, Performance, Test } from '../lib/types';
import {
  discountedPrice, formatDate, formatDuration, liveStatus, parseServerDate, rupees, useLoad,
} from '../lib/utils';
import { Empty, HawaMahal, Icon, Loadable, Spinner, StatCard, usePageTitle } from '../components/ui';

/* ── Shared pieces ─────────────────────────────────────────── */

/** Re-renders every second so countdowns stay current. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const EXAM_TINTS = ['tint-orange', 'tint-blue', 'tint-green', 'tint-violet'];
const EXAM_EMOJI: [RegExp, string][] = [
  [/ldc|clerk/i, '📝'],
  [/computer|anudesh|it\b/i, '💻'],
  [/patwar|land|revenue/i, '📍'],
  [/reet|teacher|shikshak/i, '🎓'],
  [/police|constable/i, '🛡️'],
  [/gk|general/i, '🌍'],
];
function examEmoji(title: string) {
  return EXAM_EMOJI.find(([re]) => re.test(title))?.[1] ?? '📚';
}

function SectionTitle({ icon, title, to, linkLabel = 'View All' }: { icon: ReactNode; title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="section-title">
      <h2 className="row" style={{ gap: '.5rem' }}>{icon}{title}</h2>
      {to && <Link to={to} className="small bold row" style={{ gap: 4 }}>{linkLabel} <Icon.arrow /></Link>}
    </div>
  );
}

/* ── Hero ──────────────────────────────────────────────────── */

function Hero({ name, perf, liveNow }: { name: string | null; perf: Performance | null; liveNow: Test | undefined }) {
  let subline = 'RSMSSB, REET, Patwari, LDC aur sabhi Rajasthan exams ki taiyari ek jagah.';
  if (name && perf) {
    subline = perf.totalTests > 0
      ? `Aap ${perf.totalTests} tests de chuke hain. Aise hi lage rahiye!`
      : 'Aaj apna pehla test dekar shuruaat karein.';
  }
  return (
    <section className="hero-v2">
      <div className="hero-text">
        <h1>{name ? `Namaste, ${name}` : 'Rajasthan Exams'}</h1>
        <p>{subline}</p>
        <div className="row wrap" style={{ gap: '.75rem', marginTop: 18 }}>
          {name ? (
            <>
              {liveNow ? (
                <Link to={`/test/${liveNow.id}`} className="btn btn-accent"><Icon.play /> Join Live Test</Link>
              ) : (
                <a href="#exams" className="btn btn-accent"><Icon.play /> Start Practice</a>
              )}
              <Link to="/performance" className="btn btn-outline-light"><Icon.chart /> My Performance</Link>
            </>
          ) : (
            <>
              <Link to="/signup" className="btn btn-accent"><Icon.play /> Free account banayein</Link>
              <Link to="/login" className="btn btn-outline-light">Login</Link>
            </>
          )}
        </div>
      </div>
      <div className="hero-sun" />
      <HawaMahal />
    </section>
  );
}

/* ── Stat cards ────────────────────────────────────────────── */

function Stats({ perf, coins }: { perf: Performance; coins: number }) {
  return (
    <div className="stat-grid">
      <StatCard icon={<Icon.clipboard />} tint="tint-blue" label="Tests Taken" value={perf.totalTests} />
      <StatCard icon={<Icon.chart />} tint="tint-green" label="Avg Accuracy" value={`${Math.round(perf.avgAccuracy)}%`} />
      <StatCard icon={<Icon.star />} tint="tint-orange" label="Best Score" value={Math.round(perf.bestScore * 100) / 100} />
      <StatCard icon={<span className="coin coin-lg" />} tint="tint-violet" label="Coins" value={coins} />
    </div>
  );
}

/* ── Live tests ────────────────────────────────────────────── */

function LiveCard({ test, now }: { test: Test; now: number }) {
  const status = liveStatus(test, now);
  const start = parseServerDate(test.startsAt)?.getTime();
  const end = parseServerDate(test.endsAt)?.getTime();
  const countdown = status === 'upcoming' && start
    ? `Starts in ${formatDuration((start - now) / 1000)}`
    : end ? `Ends in ${formatDuration((end - now) / 1000)}` : null;

  return (
    <div className="card live-card">
      <div className="live-thumb">📝</div>
      <div className="live-body">
        {status === 'live'
          ? <span className="badge badge-danger"><span className="live-dot" /> LIVE</span>
          : <span className="badge badge-warning">UPCOMING</span>}
        <h3>{test.title}</h3>
        <div className="muted small">{test.totalQuestions} Qs • {test.durationMinutes} min</div>
        <div className="live-foot">
          {countdown && <span className="countdown"><Icon.clock /> {countdown}</span>}
          {status === 'live' ? (
            <Link to={`/test/${test.id}`} className="btn btn-grad btn-sm">
              {test.isAttempted ? 'Phir se do' : 'Join Now'} <Icon.arrow />
            </Link>
          ) : (
            <span className="small muted">{formatDate(test.startsAt, true)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Exams ─────────────────────────────────────────────────── */

function PopularExamCard({ exam, i }: { exam: Exam; i: number }) {
  const price = discountedPrice(exam);
  let pill: ReactNode;
  if (exam.isPurchased) pill = <span className="price-pill pill-green">✓ Unlocked</span>;
  else if (exam.isPremium && exam.price > 0) pill = <span className="price-pill pill-orange">{rupees(price)}</span>;
  else pill = <span className="price-pill pill-green">Free</span>;

  return (
    <Link to={`/exam/${exam.id}`} className={`exam-tile ${EXAM_TINTS[i % EXAM_TINTS.length]}`}>
      <div className="exam-tile-icon">
        {exam.iconUrl ? <img src={exam.iconUrl} alt="" /> : <span>{examEmoji(exam.title)}</span>}
      </div>
      <div className="exam-tile-body">
        <h3>{exam.title}</h3>
        <div className="muted small">{exam.testCount} Tests</div>
        <div className="row" style={{ gap: 6, marginTop: 10 }}>
          {pill}
          {!exam.isPurchased && exam.discountPercent > 0 && <span className="badge badge-accent">{exam.discountPercent}% off</span>}
        </div>
      </div>
    </Link>
  );
}

/* ── Right column ──────────────────────────────────────────── */

function ProgressCard({ perf }: { perf: Performance }) {
  const pct = Math.max(0, Math.min(100, Math.round(perf.avgAccuracy)));
  const bars = perf.weeklyAccuracies.slice(-7);
  const dates = perf.weeklyDates.slice(-7);
  return (
    <div className="card">
      <h3 className="row" style={{ gap: '.5rem' }}><span className="title-icon"><Icon.target /></span> Your Progress</h3>
      <div className="progress-top">
        <div className="ring" style={{ ['--p' as string]: pct }}>
          <div>{pct}%</div>
        </div>
        <div>
          <div className="bold">Average Accuracy</div>
          <div className="muted small">{perf.totalTests} tests • {Math.round(perf.totalTimeSecs / 60)} min padhai</div>
        </div>
      </div>
      {bars.length > 0 ? (
        <>
          <div className="bold small" style={{ marginTop: 14 }}>Recent Tests</div>
          <div className="mini-bars">
            {bars.map((a, i) => (
              <div key={i} className="mini-col" title={`${dates[i] || ''}: ${Math.round(a)}%`}>
                <span className="mini-val">{Math.round(a)}%</span>
                <div className="mini-bar" style={{ height: `${Math.max(4, Math.min(100, a))}%` }} />
                <span className="mini-lbl">{(dates[i] || '').slice(5)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted small" style={{ marginTop: 14 }}>Test dene ke baad yahan aapka chart dikhega.</p>
      )}
    </div>
  );
}

function GuestCard() {
  return (
    <div className="card guest-card">
      <h3>Apni taiyari track karein</h3>
      <p className="muted small">Free account banayein aur apni accuracy, best score aur progress chart dekhein.</p>
      <Link to="/signup" className="btn btn-grad btn-block">Free Signup <Icon.arrow /></Link>
      <Link to="/login" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>Login</Link>
    </div>
  );
}

function NewsCard({ items }: { items: NewsItem[] }) {
  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 6 }}>
        <h3 className="row" style={{ gap: '.5rem', margin: 0 }}><span className="title-icon"><Icon.news /></span> Current Affairs</h3>
        <Link to="/current-affairs" className="small bold row" style={{ gap: 4 }}>View All <Icon.arrow /></Link>
      </div>
      {items.length === 0 ? <p className="muted small">Abhi koi news nahi hai.</p> : items.slice(0, 3).map(n => (
        <Link key={n.id} to="/current-affairs" className="news-row">
          {n.imageUrl ? <img src={n.imageUrl} alt="" /> : <div className="news-ph">📰</div>}
          <div style={{ minWidth: 0 }}>
            <div className="news-title">{n.titleHi || n.titleEn}</div>
            <div className="tiny muted row" style={{ gap: 4 }}><Icon.calendar /> {formatDate(n.date)}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */

export function HomePage() {
  usePageTitle('');
  const { user } = useAuth();
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim().toLowerCase();
  const now = useNow();

  const exams = useLoad(() => (user ? api.exams() : Promise.resolve([] as Exam[])), [user?.id]);
  const perf = useLoad(() => (user ? api.performance() : Promise.resolve(null)), [user?.id]);
  const live = useLoad(api.liveTests);
  const news = useLoad(api.news);

  const liveList = (live.data || []).filter(t => liveStatus(t, now) !== 'ended');
  const liveNow = liveList.find(t => liveStatus(t, now) === 'live');
  const examList = (exams.data || []).filter(e =>
    !q || e.title.toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q));

  return (
    <div className="home-grid">
      <div className="home-main">
        <Hero name={user ? user.name?.split(' ')[0] || 'Student' : null} perf={perf.data} liveNow={liveNow} />

        {user && perf.data && <Stats perf={perf.data} coins={user.coins} />}

        {liveList.length > 0 && (
          <>
            <SectionTitle icon={<span className="live-icon"><Icon.live /></span>} title="Live Now" to="/live" />
            <div className="live-grid">
              {liveList.slice(0, 4).map(t => <LiveCard key={t.id} test={t} now={now} />)}
            </div>
          </>
        )}

        <div id="exams" />
        <SectionTitle icon={<span className="title-icon"><Icon.layers /></span>} title={q ? `"${params.get('q')}" ke results` : 'Popular Exams'} />
        {!user ? (
          <Empty icon="🔒" title="Exams dekhne ke liye login karein">
            <Link to="/login" className="btn btn-sm">Login</Link>
          </Empty>
        ) : (
          <Loadable state={exams}>
            {() => examList.length === 0
              ? <Empty title={q ? 'Is naam ka koi exam nahi mila' : 'Abhi koi exam nahi hai'}>{q && <Link to="/" className="btn btn-ghost btn-sm">Sab exams dekhein</Link>}</Empty>
              : <div className="exam-grid">{examList.map((e, i) => <PopularExamCard key={e.id} exam={e} i={i} />)}</div>}
          </Loadable>
        )}
      </div>

      <aside className="home-side">
        {user ? (perf.data ? <ProgressCard perf={perf.data} /> : perf.loading ? <div className="card"><Spinner /></div> : null) : <GuestCard />}
        <Loadable state={news}>{list => <NewsCard items={list} />}</Loadable>
      </aside>
    </div>
  );
}
