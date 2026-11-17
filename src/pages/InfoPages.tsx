import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, timeAgo, useLoad } from '../lib/utils';
import { Empty, Icon, Loadable, PageHeader, usePageTitle } from '../components/ui';

export function CurrentAffairsPage() {
  usePageTitle('Current Affairs');
  const news = useLoad(api.news);
  const [lang, setLang] = useState<'hi' | 'en'>('hi');
  const [q, setQ] = useState('');

  return (
    <div className="narrow" style={{ margin: '0 auto' }}>
      <PageHeader
        icon={<Icon.news />}
        title="Current Affairs"
        subtitle="Rajasthan aur desh ki zaroori khabrein, exam ke hisaab se."
        actions={
          <div className="seg">
            <button className={lang === 'hi' ? 'on' : ''} onClick={() => setLang('hi')}>हिंदी</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
          </div>
        }
      />
      <div className="search search-block mt mb">
        <Icon.search />
        <input placeholder="News search karein…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <Loadable state={news}>
        {list => {
          const ql = q.trim().toLowerCase();
          const shown = list
            .filter(n => !ql || [n.titleHi, n.titleEn, n.descHi, n.descEn].some(s => s?.toLowerCase().includes(ql)))
            .sort((a, b) => b.date.localeCompare(a.date));
          if (shown.length === 0) return <Empty title="Koi news nahi mili" />;
          let lastDate = '';
          return (
            <div>
              {shown.map(n => {
                const title = lang === 'en' ? n.titleEn || n.titleHi : n.titleHi || n.titleEn;
                const desc = lang === 'en' ? n.descEn || n.descHi : n.descHi || n.descEn;
                const header = n.date !== lastDate ? (lastDate = n.date, <div key={'d' + n.date} className="date-chip"><Icon.calendar /> {formatDate(n.date)}</div>) : null;
                return (
                  <div key={n.id}>
                    {header}
                    <article className="card news-card">
                      {n.imageUrl && <img className="news-img" src={n.imageUrl} alt="" loading="lazy" />}
                      <h3>{title}</h3>
                      {desc && <p className="muted" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{desc}</p>}
                    </article>
                  </div>
                );
              })}
            </div>
          );
        }}
      </Loadable>
    </div>
  );
}

const NOTIF_ICON: Record<string, string> = { info: 'ℹ️', test: '📝', live: '🔴', news: '📰', offer: '🎁', result: '🏆', warning: '⚠️' };

export function NotificationsPage() {
  usePageTitle('Notifications');
  const { user } = useAuth();
  const notifs = useLoad(api.notifications);

  useEffect(() => {
    if (user) api.markAllRead().catch(() => {});
  }, [user]);

  return (
    <div className="narrow" style={{ margin: '0 auto' }}>
      <PageHeader icon={<Icon.bell />} title="Notifications" subtitle="Naye tests, results aur offers ki jaankari." />
      <div className="mt" />
      <Loadable state={notifs}>
        {list => list.length === 0 ? <Empty icon="🔕" title="Koi notification nahi hai" /> : (
          <div className="card">
            {[...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(n => (
              <div key={n.id} className={'list-item' + (n.isRead ? '' : ' unread')} style={{ alignItems: 'flex-start' }}>
                <span className="notif-icon">{NOTIF_ICON[n.iconType] || 'ℹ️'}</span>
                <div style={{ flex: 1 }}>
                  <div className="bold">{n.title}</div>
                  <div className="muted small" style={{ whiteSpace: 'pre-wrap' }}>{n.message}</div>
                  {n.createdAt && <div className="tiny muted">{timeAgo(n.createdAt)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Loadable>
    </div>
  );
}

export function NotFoundPage() {
  usePageTitle('Page nahi mila');
  return (
    <div className="narrow" style={{ margin: '40px auto' }}>
      <Empty icon="🧭" title="Yeh page nahi mila">
        <a href="/" className="btn btn-grad mt">Home par jayein</a>
      </Empty>
    </div>
  );
}
