import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, useLoad } from '../lib/utils';
import { Avatar, Empty, HawaMahal, Icon, Loadable, Modal, PageHeader, StatCard, usePageTitle } from '../components/ui';

const AVATARS = Array.from({ length: 10 }, (_, i) => `avatar_${i + 1}`);

export function ProfilePage() {
  usePageTitle('Profile');
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  if (!user) return null;

  const links = [
    { to: '/performance', icon: <Icon.chart />, label: 'Meri performance' },
    { to: '/leaderboard', icon: <Icon.trophy />, label: 'Top rankers' },
    { to: '/referral', icon: <Icon.gift />, label: 'Refer karein, coins kamayein' },
    { to: '/notifications', icon: <Icon.bell />, label: 'Notifications' },
  ];

  return (
    <div className="narrow" style={{ margin: '0 auto' }}>
      <section className="profile-hero">
        <div className="profile-avatar"><Avatar pic={user.profilePicture} name={user.name} size="lg" /></div>
        <div style={{ minWidth: 0, flex: 1, position: 'relative', zIndex: 1 }}>
          <h1>{user.name || 'Student'}</h1>
          <div className="small" style={{ opacity: .9 }}>{user.email}</div>
          {user.mobile && <div className="small" style={{ opacity: .9 }}>{user.mobile}</div>}
          <button className="btn btn-outline-light btn-sm" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>Profile edit karein</button>
        </div>
        <HawaMahal className="page-head-art" />
      </section>

      <div className="stat-grid stat-grid-2">
        <StatCard icon={<span className="coin coin-lg" />} tint="tint-orange" label="Coins" value={user.coins} />
        <StatCard icon={<Icon.gift />} tint="tint-violet" label="Referral code" value={<span style={{ fontSize: '1.05rem' }}>{user.referCode || '—'}</span>} />
      </div>

      <div className="link-grid mt">
        {links.map((l, i) => (
          <Link key={l.to} to={l.to} className="link-tile">
            <span className={'stat-icon ' + ['tint-blue', 'tint-orange', 'tint-violet', 'tint-green'][i % 4]}>{l.icon}</span>
            <span style={{ flex: 1 }} className="bold">{l.label}</span>
            <Icon.arrow />
          </Link>
        ))}
      </div>

      <div className="card mt">
        <a href="/privacy-policy.html" className="list-item" style={{ color: 'var(--text)' }} target="_blank" rel="noreferrer">Privacy Policy</a>
        <a href="/support.html" className="list-item" style={{ color: 'var(--text)' }} target="_blank" rel="noreferrer">Help & Support</a>
      </div>

      <button className="btn btn-ghost btn-block mt logout-btn" onClick={() => { signOut(); nav('/login'); }}>Logout</button>

      {editing && <EditProfile onClose={() => setEditing(false)} />}
    </div>
  );
}

function EditProfile({ onClose }: { onClose: () => void }) {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [pic, setPic] = useState(user?.profilePicture || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!user) return null;

  async function save() {
    if (!user) return;
    if (!name.trim()) { setErr('Naam khaali nahi ho sakta.'); return; }
    if (mobile && !/^[6-9]\d{9}$/.test(mobile)) { setErr('Sahi 10-digit mobile number daalein.'); return; }
    setBusy(true);
    setErr('');
    try {
      // One request saves everything, so a failure can never leave the profile half-updated.
      await api.updateProfile({
        name: name.trim(),
        email: user.email || '',
        profilePicture: pic || null,
        updateMobile: (mobile || null) !== (user.mobile || null),
        mobile: mobile || null,
      });
      await refresh();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>Profile edit karein</h2>
      {err && <div className="alert alert-error">{err}</div>}
      <div className="field">
        <label>Avatar</label>
        <div className="avatar-pick">
          {AVATARS.map(a => (
            <button key={a} className={pic === a ? 'sel' : ''} onClick={() => setPic(a)} aria-label={a}>
              <img src={`/avatars/${a}.png`} alt="" />
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="pname">Naam</label>
        <input id="pname" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pmob">Mobile (optional)</label>
        <input id="pmob" inputMode="numeric" maxLength={10} value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-grad" onClick={save} disabled={busy}>{busy ? 'Save ho raha hai…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

export function ReferralPage() {
  usePageTitle('Refer & Earn');
  const info = useLoad(api.referral);
  const config = useLoad(api.config);
  const mine = useLoad(api.myReferrals);
  const top = useLoad(api.topReferrers);
  const [copied, setCopied] = useState(false);

  const code = info.data?.referCode || '';
  const link = `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`;
  const shareText = `Rajasthan Exams par free mock tests aur live tests! Mera referral code ${code} use karein aur bonus coins paayein: ${link}`;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: 'Rajasthan Exams', text: shareText, url: link }); } catch { /* cancelled */ }
    } else {
      copy(shareText);
    }
  }

  return (
    <div className="narrow" style={{ margin: '0 auto' }}>
      <PageHeader
        icon={<Icon.gift />}
        title="Refer karein, coins kamayein"
        subtitle={<>Har dost ke join karne par aapko <strong>{config.data?.referrerCoinReward ?? 50}</strong> coins aur dost ko <strong>{config.data?.refereeCoinReward ?? 20}</strong> coins milenge.</>}
      />

      <Loadable state={info}>
        {r => (
          <div className="card mt">
            <div className="copy-box">
              <code>{r.referCode}</code>
              <button className="btn btn-sm btn-accent" onClick={() => copy(r.referCode)}>{copied ? 'Copied ✓' : 'Copy'}</button>
            </div>
            <div className="row wrap mt">
              <button className="btn btn-grad" onClick={share}>Link share karein</button>
              <a className="btn btn-success" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
            <div className="stat-grid stat-grid-2">
              <StatCard icon={<Icon.community />} tint="tint-blue" label="Dost joined" value={r.referredCount} />
              <StatCard icon={<span className="coin coin-lg" />} tint="tint-orange" label="Coins kamaaye" value={r.coinsEarned} />
            </div>
          </div>
        )}
      </Loadable>

      <h2 className="mt-lg">Mere referrals</h2>
      <Loadable state={mine}>
        {list => list.length === 0 ? <Empty icon="👥" title="Abhi tak koi dost join nahi hua" /> : (
          <div className="card">
            {list.map((u, i) => (
              <div key={i} className="list-item">
                <Avatar pic={u.avatarId} name={u.name} />
                <div style={{ flex: 1 }}>
                  <div className="bold">{u.name}</div>
                  <div className="tiny muted">Joined {formatDate(u.joinedAt)}</div>
                </div>
                <span className="coin-pill">+{u.coinsEarned}</span>
              </div>
            ))}
          </div>
        )}
      </Loadable>

      <h2 className="mt-lg">Top referrers</h2>
      <Loadable state={top}>
        {list => list.length === 0 ? <Empty title="Abhi koi data nahi" /> : (
          <div className="card">
            {list.map((u, i) => (
              <div key={i} className="list-item">
                <span className="rank-num">{i + 1}</span>
                <Avatar pic={u.avatarId} name={u.name} />
                <span className="bold" style={{ flex: 1 }}>{u.name}</span>
                <span className="muted small">{u.referredCount} referrals</span>
              </div>
            ))}
          </div>
        )}
      </Loadable>
    </div>
  );
}
