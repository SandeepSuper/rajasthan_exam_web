import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDuration, useLoad } from '../lib/utils';
import { Avatar, Empty, Icon, Loadable, PageHeader, StatCard, usePageTitle } from '../components/ui';

export function LeaderboardPage() {
  const [params] = useSearchParams();
  const testId = params.get('testId') || undefined;
  const { user } = useAuth();
  const board = useLoad(() => api.leaderboard(testId), [testId]);
  const test = useLoad(() => (testId ? api.test(testId) : Promise.resolve(null)), [testId]);
  usePageTitle('Rankers');

  return (
    <div className="narrow" style={{ margin: '0 auto' }}>
      <PageHeader
        icon={<Icon.trophy />}
        title={testId ? 'Test Leaderboard' : 'Top Rankers'}
        subtitle={testId ? test.data?.title : 'Sabse zyada coins kamaane wale students'}
        actions={testId ? <Link to="/leaderboard" className="btn btn-outline-light btn-sm">Overall rankers <Icon.arrow /></Link> : undefined}
      />
      <div className="mt">
        <Loadable state={board}>
          {list => {
            if (list.length === 0) return <Empty icon="🏆" title="Abhi koi ranking nahi hai" />;
            const top3 = list.filter(e => e.rank <= 3).sort((a, b) => a.rank - b.rank);
            const order = [top3[1], top3[0], top3[2]].filter(Boolean);
            const scoreLabel = (s: number, total: number) => testId ? `${Math.round(s * 100) / 100}${total ? ' / ' + total : ''}` : <span className="coin-amt"><span className="coin" /> {s}</span>;
            return (
              <>
                {order.length === 3 && (
                  <div className="podium mb">
                    {order.map(e => (
                      <div key={e.userId} className={'p' + (e.rank === 1 ? ' first' : '')}>
                        <div style={{ fontSize: '1.8rem' }}>{['🥇', '🥈', '🥉'][e.rank - 1]}</div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}><Avatar pic={e.avatarUrl} name={e.name} size="lg" /></div>
                        <div className="bold small mt" style={{ marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                        <div className="small muted">{scoreLabel(e.score, e.totalMarks)}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="card">
                  {list.map(e => (
                    <div key={e.userId + e.rank} className={'list-item' + (e.userId === user?.id ? ' me' : '')}>
                      <span className="rank-num">{e.rank}</span>
                      <Avatar pic={e.avatarUrl} name={e.name} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="bold">{e.name}{e.userId === user?.id && <span className="badge badge-primary" style={{ marginLeft: 6 }}>Aap</span>}</div>
                        {testId && e.timeTaken > 0 && <div className="tiny muted">{formatDuration(e.timeTaken)}</div>}
                      </div>
                      <span className="bold">{scoreLabel(e.score, e.totalMarks)}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          }}
        </Loadable>
      </div>
    </div>
  );
}

export function PerformancePage() {
  usePageTitle('Performance');
  const perf = useLoad(api.performance);

  return (
    <div className="narrow" style={{ margin: '0 auto' }}>
      <PageHeader icon={<Icon.chart />} title="Meri Performance" subtitle="Aapki taiyari ka poora hisaab ek jagah." />
      <div className="mt" />
      <Loadable state={perf}>
        {p => p.totalTests === 0 ? (
          <Empty icon="📝" title="Abhi tak koi test nahi diya">
            <Link to="/" className="btn mt">Pehla test dein</Link>
          </Empty>
        ) : (
          <>
            <div className="stat-grid" style={{ marginTop: 0 }}>
              <StatCard icon={<Icon.clipboard />} tint="tint-blue" label="Tests diye" value={p.totalTests} />
              <StatCard icon={<Icon.target />} tint="tint-green" label="Avg accuracy" value={Math.round(p.avgAccuracy) + '%'} />
              <StatCard icon={<Icon.star />} tint="tint-orange" label="Best score" value={Math.round(p.bestScore * 100) / 100} />
              <StatCard icon={<Icon.clock />} tint="tint-violet" label="Minutes padhai" value={Math.round(p.totalTimeSecs / 60)} />
            </div>

            {p.weeklyAccuracies.length > 0 && (
              <div className="card mt">
                <h3>Pichhle {p.weeklyAccuracies.length} tests ki accuracy</h3>
                <div className="bars">
                  {p.weeklyAccuracies.map((a, i) => (
                    <div key={i} className="bar-col" title={`${p.weeklyDates[i]}: ${Math.round(a)}%`}>
                      <span className="bar-val">{Math.round(a)}%</span>
                      <div className={'bar ' + (a >= 60 ? 'bar-good' : a >= 35 ? 'bar-mid' : 'bar-low')} style={{ height: `${Math.max(2, Math.min(100, a))}%` }} />
                      <span className="bar-lbl">{(p.weeklyDates[i] || '').slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {p.weakTopics.length > 0 && (
              <div className="card mt">
                <h3>In tests par aur mehnat karein</h3>
                {p.weakTopics.map(t => <div key={t} className="list-item">📌 {t}</div>)}
              </div>
            )}
          </>
        )}
      </Loadable>
    </div>
  );
}
