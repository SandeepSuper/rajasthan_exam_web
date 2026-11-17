import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { GoogleButton } from '../components/GoogleButton';
import { Emblem, HawaMahal, Icon, usePageTitle } from '../components/ui';
import { persistent } from '../lib/utils';

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  usePageTitle(title);
  return (
    <div className="auth-split">
      <aside className="auth-art">
        <Link to="/" className="side-brand" style={{ alignItems: 'flex-start' }}>
          <Emblem size={72} />
          <span>Rajasthan Exams</span>
        </Link>
        <h2>Rajasthan ke sabhi sarkari exams ki smart taiyari</h2>
        <ul>
          <li><Icon.check /> RSMSSB, REET, Patwari, LDC ke mock tests</li>
          <li><Icon.check /> Live tests aur state-level ranking</li>
          <li><Icon.check /> Hindi + English questions, detailed solutions</li>
          <li><Icon.check /> Daily current affairs aur doubt community</li>
        </ul>
        <HawaMahal className="auth-art-mahal" />
      </aside>
      <div className="auth-wrap">
        <header className="auth-mobile-head">
          <Link to="/" className="auth-mobile-brand">
            <Emblem size={52} />
            <span>Rajasthan Exams</span>
          </Link>
          <p>Rajasthan ke sabhi sarkari exams ki smart taiyari</p>
          <HawaMahal className="auth-mobile-mahal" />
        </header>
        <div className="card auth-card">
          <div className="auth-logo">
            <img src="/logo.png" alt="Rajasthan Exams" />
            <h1 style={{ margin: 0 }}>{title}</h1>
            {subtitle && <p className="muted small center" style={{ margin: 0 }}>{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function useAfterLogin() {
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from || '/';
  return () => nav(from, { replace: true });
}

/** Referral code from a shared link (?ref=CODE) is remembered until signup. */
function useReferralCode(): [string, (v: string) => void] {
  const [params] = useSearchParams();
  const fromUrl = params.get('ref');
  if (fromUrl) persistent.set('rex_ref', fromUrl);
  const [code, setCode] = useState<string>(fromUrl || persistent.get<string>('rex_ref') || '');
  return [code, setCode];
}

export function LoginPage() {
  const { signIn } = useAuth();
  const done = useAfterLogin();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refCode] = useReferralCode();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      signIn(await api.login(email.trim(), password));
      done();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 400
        ? 'Email ya password galat hai, ya aapka email abhi verify nahi hua hai.'
        : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google(idToken: string) {
    setError('');
    try {
      signIn(await api.googleLogin(idToken, refCode || undefined));
      persistent.remove('rex_ref');
      done();
    } catch (err) {
      setError('Google login nahi hua: ' + (err as Error).message);
    }
  }

  async function verifyInstead() {
    if (!email.trim()) { setError('Pehle apna email daalein.'); return; }
    setBusy(true);
    try {
      await api.sendEmailOtp(email.trim());
      nav(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Login" subtitle="Rajasthan ke sabhi sarkari exams ki taiyari">
      {error && (
        <div className="alert alert-error">
          {error}
          {error.includes('verify') && (
            <div className="mt" style={{ marginTop: 6 }}>
              <button className="link-btn" onClick={verifyInstead} type="button">Email verify karne ke liye OTP bhejein</button>
            </div>
          )}
        </div>
      )}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <div className="row-between">
            <label htmlFor="pw">Password</label>
            <Link to="/forgot-password" className="small">Password bhool gaye?</Link>
          </div>
          <input id="pw" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-grad btn-block" disabled={busy}>{busy ? 'Login ho raha hai…' : 'Login'}</button>
      </form>
      <GoogleButton onToken={google} />
      <p className="center small mt">
        Naya account? <Link to="/signup" state={loc.state}>Sign up karein</Link>
      </p>
    </AuthShell>
  );
}

export function SignupPage() {
  const nav = useNavigate();
  const { signIn } = useAuth();
  const done = useAfterLogin();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [refCode, setRefCode] = useReferralCode();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password kam se kam 6 characters ka hona chahiye.'); return; }
    setBusy(true);
    try {
      await api.register({ name: name.trim(), email: email.trim(), password, referredByCode: refCode.trim() || undefined });
      persistent.remove('rex_ref');
      nav(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google(idToken: string) {
    try {
      signIn(await api.googleLogin(idToken, refCode.trim() || undefined));
      persistent.remove('rex_ref');
      done();
    } catch (err) {
      setError('Google login nahi hua: ' + (err as Error).message);
    }
  }

  return (
    <AuthShell title="Account banayein" subtitle="Free mock tests, live tests aur current affairs">
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="name">Naam</label>
          <input id="name" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ref">Referral code (optional)</label>
          <input id="ref" value={refCode} onChange={e => setRefCode(e.target.value.toUpperCase())} placeholder="RAJ-XXXXXX" />
        </div>
        <button className="btn btn-grad btn-block" disabled={busy}>{busy ? 'OTP bheja ja raha hai…' : 'Sign up'}</button>
      </form>
      <GoogleButton onToken={google} />
      <p className="center small mt">Pehle se account hai? <Link to="/login">Login karein</Link></p>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const { signIn } = useAuth();
  const done = useAfterLogin();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(`${email} par 6-digit OTP bheja gaya hai.`);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      signIn(await api.verifyEmailOtp(email, otp.trim()));
      done();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? 'OTP galat hai ya expire ho gaya.' : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    try {
      await api.sendEmailOtp(email);
      setInfo('Naya OTP bhej diya gaya hai. Spam folder bhi check karein.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AuthShell title="Email verify karein">
      {info && <div className="alert alert-info">{info}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="otp">OTP</label>
          <input id="otp" className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
        </div>
        <button className="btn btn-grad btn-block" disabled={busy || otp.length !== 6}>{busy ? 'Verify ho raha hai…' : 'Verify karein'}</button>
      </form>
      <p className="center small mt">
        OTP nahi mila? <button className="link-btn" onClick={resend}>Dobara bhejein</button>
      </p>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api.forgotPassword(email.trim());
      setInfo(r.message);
      setStep('reset');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password kam se kam 6 characters ka hona chahiye.'); return; }
    setBusy(true);
    try {
      await api.resetPassword(email.trim(), otp.trim(), password);
      nav('/login', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Password reset" subtitle={step === 'email' ? 'Apna registered email daalein' : undefined}>
      {info && <div className="alert alert-info">{info}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {step === 'email' ? (
        <form onSubmit={sendOtp}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-grad btn-block" disabled={busy}>{busy ? 'Bheja ja raha hai…' : 'OTP bhejein'}</button>
        </form>
      ) : (
        <form onSubmit={reset}>
          <div className="field">
            <label htmlFor="otp">OTP</label>
            <input id="otp" className="otp-input" inputMode="numeric" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="field">
            <label htmlFor="pw">Naya password</label>
            <input id="pw" type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-grad btn-block" disabled={busy}>{busy ? 'Save ho raha hai…' : 'Password badlein'}</button>
        </form>
      )}
      <p className="center small mt"><Link to="/login">Login par wapas jayein</Link></p>
    </AuthShell>
  );
}
