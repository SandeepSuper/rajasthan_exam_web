import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { CreateOrderResponse, Exam, TestType } from '../lib/types';
import { TEST_TYPES, discountedPrice, liveStatus, rupees, useLoad } from '../lib/utils';
import { BackLink, Empty, ErrorBox, Icon, Loadable, PageHeader, Spinner, StatCard, usePageTitle } from '../components/ui';
import { TestCard } from '../components/TestCard';

function useExam(examId: string) {
  const { user } = useAuth();
  return useLoad(async () => {
    const all = await api.exams();
    const exam = all.find(e => e.id === examId);
    if (!exam) throw new Error('Yeh exam nahi mila.');
    return exam;
  }, [examId, user?.id]);
}

export function ExamDetailPage() {
  const { examId = '' } = useParams();
  const exam = useExam(examId);
  const tests = useLoad(() => api.tests(examId), [examId]);
  const [tab, setTab] = useState<TestType | 'ALL'>('ALL');
  usePageTitle(exam.data?.title || 'Exam');

  if (exam.loading && !exam.data) return <Spinner />;
  if (exam.error || !exam.data) return <ErrorBox message={exam.error || 'Exam nahi mila'} onRetry={exam.reload} />;
  const e = exam.data;
  const locked = e.isPremium && !e.isPurchased;

  const list = tests.data || [];
  const types = TEST_TYPES.filter(t => list.some(x => x.type === t.type));
  const shown = list
    .filter(t => tab === 'ALL' || t.type === tab)
    .sort((a, b) => Number(a.isPremium) - Number(b.isPremium));

  return (
    <>
      <BackLink to="/" label="Home" />
      <PageHeader
        icon={e.iconUrl ? <img src={e.iconUrl} alt="" /> : <span style={{ fontSize: '1.6rem' }}>📚</span>}
        title={e.title}
        subtitle={`${e.category} · ${e.testCount} tests · ${e.languageSupported === 'BOTH' ? 'Hindi + English' : e.languageSupported}`}
        actions={locked ? (
          <div className="buy-box">
            <div className="small" style={{ opacity: .9 }}>Sabhi premium tests unlock karein</div>
            <div className="row" style={{ gap: 8, margin: '4px 0 10px' }}>
              <span className="buy-price">{rupees(discountedPrice(e))}</span>
              {e.discountPercent > 0 && <span className="price-old" style={{ color: 'rgba(255,255,255,.75)' }}>{rupees(e.price)}</span>}
              {e.discountPercent > 0 && <span className="badge badge-accent">{e.discountPercent}% off</span>}
            </div>
            <Link to={`/exam/${e.id}/buy`} className="btn btn-accent btn-block">Abhi kharidein <Icon.arrow /></Link>
          </div>
        ) : e.isPurchased ? <span className="badge badge-success" style={{ fontSize: '.85rem', padding: '.4rem .8rem' }}>✓ Unlocked</span> : undefined}
      />

      <div className="stat-grid">
        <StatCard icon={<Icon.clipboard />} tint="tint-blue" label="Total Tests" value={list.length} />
        <StatCard icon={<Icon.check />} tint="tint-green" label="Free Tests" value={list.filter(t => !t.isPremium).length} />
        <StatCard icon={<Icon.star />} tint="tint-orange" label="Attempted" value={list.filter(t => t.isAttempted).length} />
        <StatCard icon={<Icon.live />} tint="tint-violet" label="Live Tests" value={list.filter(t => t.isLive).length} />
      </div>

      <div className="tabs mt">
        <button className={'tab' + (tab === 'ALL' ? ' active' : '')} onClick={() => setTab('ALL')}>Sabhi ({list.length})</button>
        {types.map(t => (
          <button key={t.type} className={'tab' + (tab === t.type ? ' active' : '')} onClick={() => setTab(t.type)}>
            {t.label} ({list.filter(x => x.type === t.type).length})
          </button>
        ))}
      </div>

      <div className="test-grid mt">
        <Loadable state={tests}>
          {() => shown.length === 0 ? <Empty title="Is section mein abhi koi test nahi hai" /> : (
            <>
              {shown.map(t => (
                <TestCard key={t.id} test={t} locked={t.isPremium && !e.isPurchased && !t.isLive} buyHref={`/exam/${e.id}/buy`} />
              ))}
            </>
          )}
        </Loadable>
      </div>
    </>
  );
}

export function LiveTestsPage() {
  usePageTitle('Live Tests');
  const { user } = useAuth();
  const live = useLoad(() => (user ? api.liveTests() : Promise.resolve([])), [user?.id]);
  const [tab, setTab] = useState<'now' | 'done'>('now');

  return (
    <>
      <PageHeader
        icon={<Icon.live />}
        title="Live Tests"
        subtitle="Ek tay samay par sab students ke saath test dein aur apni rank dekhein."
      />
      <div className="tabs mt">
        <button className={'tab' + (tab === 'now' ? ' active' : '')} onClick={() => setTab('now')}>Live & Upcoming</button>
        <button className={'tab' + (tab === 'done' ? ' active' : '')} onClick={() => setTab('done')}>Completed</button>
      </div>
      <div className="test-grid mt">
        {!user ? (
          <Empty icon="🔒" title="Live tests dekhne ke liye login karein">
            <Link to="/login" className="btn btn-grad btn-sm">Login</Link>
          </Empty>
        ) : <Loadable state={live}>
          {list => {
            const shown = list
              .filter(t => (tab === 'now' ? liveStatus(t) !== 'ended' && !t.isAttempted : liveStatus(t) === 'ended' || t.isAttempted))
              .sort((a, b) => (a.startsAt || '').localeCompare(b.startsAt || '') * (tab === 'now' ? 1 : -1));
            return shown.length === 0
              ? <Empty icon="📡" title={tab === 'now' ? 'Abhi koi live test nahi hai' : 'Koi completed live test nahi'} />
              : <>{shown.map(t => <TestCard key={t.id} test={t} />)}</>;
          }}
        </Loadable>}
      </div>
    </>
  );
}

// ── Purchase ─────────────────────────────────────────────

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Payment page load nahi hua. Internet check karein.'));
    document.body.appendChild(s);
  });
}

export function PurchasePage() {
  const { examId = '' } = useParams();
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const exam = useExam(examId);
  const preview = useLoad(() => api.coinPreview(examId), [examId]);
  const [useCoins, setUseCoins] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  usePageTitle('Exam kharidein');

  if (exam.loading && !exam.data) return <Spinner />;
  if (exam.error || !exam.data) return <ErrorBox message={exam.error || 'Exam nahi mila'} onRetry={exam.reload} />;
  const e: Exam = exam.data;

  if (done || e.isPurchased) {
    return (
      <div className="card center narrow success-card" style={{ margin: '0 auto' }}>
        <div style={{ fontSize: '3rem' }}>🎉</div>
        <h2>{e.title} unlock ho gaya!</h2>
        <p className="muted">Ab aap sabhi premium tests de sakte hain.</p>
        <Link to={`/exam/${e.id}`} className="btn">Tests dekhein</Link>
      </div>
    );
  }

  const p = preview.data;
  const base = p?.basePrice ?? discountedPrice(e);
  const coinsAllowed = !!p && p.maxUsableCoins > 0;
  const final = useCoins && p ? p.finalPrice : base;

  async function pay() {
    setError('');
    setBusy(true);
    try {
      const order: CreateOrderResponse = await api.createOrder(e.id, useCoins && coinsAllowed);
      if (order.free) {
        await refresh();
        setDone(true);
        return;
      }
      await loadRazorpay();
      const rz = new window.Razorpay!({
        key: order.key,
        amount: order.amount,
        currency: 'INR',
        name: 'Rajasthan Exams',
        description: order.description || e.title,
        order_id: order.orderId,
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.mobile || '' },
        theme: { color: '#4169E1' },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const v = await api.verifyPayment(r);
            if (v.success === false) throw new Error(v.message || 'Payment verify nahi hua');
            await refresh();
            setDone(true);
          } catch (err) {
            setError('Payment ho gaya lekin verify nahi hua. Support se sampark karein. ' + (err as Error).message);
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rz.on('payment.failed', () => { setError('Payment fail ho gaya. Dobara try karein.'); setBusy(false); });
      rz.open();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="narrow" style={{ margin: '0 auto' }}>
      <BackLink label="Wapas" onClick={() => nav(-1)} />
      <PageHeader
        icon={<span style={{ fontSize: '1.5rem' }}>🛒</span>}
        title={e.title}
        subtitle="Is exam ke sabhi premium mock tests, PYQ aur topic tests unlock karein."
      />
      <div className="card mt">
        <h3 style={{ marginBottom: 4 }}>Order summary</h3>
        <div className="list-item"><span style={{ flex: 1 }}>Price</span><span>{rupees(e.price)}</span></div>
        {e.discountPercent > 0 && (
          <div className="list-item"><span style={{ flex: 1 }}>Discount ({e.discountPercent}%)</span><span style={{ color: 'var(--success)' }}>−{rupees(e.price - base)}</span></div>
        )}
        {coinsAllowed && (
          <label className="list-item" style={{ cursor: 'pointer', fontWeight: 400 }}>
            <input type="checkbox" checked={useCoins} onChange={ev => setUseCoins(ev.target.checked)} style={{ width: 18, height: 18 }} />
            <span style={{ flex: 1 }}>{p!.maxUsableCoins} coins use karein <span className="muted small">(aapke paas {p!.userCoins})</span></span>
            <span style={{ color: 'var(--success)' }}>−{rupees(p!.discountAmount)}</span>
          </label>
        )}
        {p && !coinsAllowed && p.userCoins > 0 && (
          <p className="tiny muted mt">Aapke paas {p.userCoins} coins hain. Coins use karne ke liye kam se kam 500 coins chahiye.</p>
        )}
        <div className="list-item bold" style={{ fontSize: '1.15rem' }}>
          <span style={{ flex: 1 }}>Total</span><span>{rupees(final)}</span>
        </div>

        {error && <div className="alert alert-error mt">{error}</div>}
        <button className="btn btn-accent btn-block mt" onClick={pay} disabled={busy}>
          {busy ? 'Process ho raha hai…' : `${rupees(final)} pay karein`}
        </button>
        <p className="tiny muted center mt">Secure payment Razorpay ke through. UPI, card, net banking sab chalega.</p>
      </div>
    </div>
  );
}
