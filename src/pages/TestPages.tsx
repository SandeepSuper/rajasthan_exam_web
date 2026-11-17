import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Question, Test, TestResult } from '../lib/types';
import { formatDuration, liveStatus, parseServerDate, persistent, progressKey, resultKey, testTypeLabel } from '../lib/utils';
import { BackLink, ErrorBox, HawaMahal, Icon, Modal, PageHeader, Spinner, StatCard, usePageTitle } from '../components/ui';

type Lang = 'hi' | 'en';

interface Progress {
  answers: Record<string, number>;
  review: string[];
  visited: string[];
  index: number;
  endAt: number;      // ms timestamp when time runs out
  startedAt: number;
}

export interface SavedResult {
  test: Test;
  questions: Question[];
  answers: Record<string, number>;
  timeTaken: number;
  result: TestResult;
  at: number;
}

export function qText(q: Question, lang: Lang) {
  return (lang === 'hi' ? q.textHi || q.textEn : q.textEn || q.textHi) || '';
}
export function qOptions(q: Question, lang: Lang) {
  const hi = q.optionsHi?.filter(Boolean) || [];
  const en = q.optionsEn?.filter(Boolean) || [];
  return lang === 'hi' ? (hi.length ? q.optionsHi! : q.optionsEn || []) : (en.length ? q.optionsEn! : q.optionsHi || []);
}
export function qSolution(q: Question, lang: Lang) {
  return (lang === 'hi' ? q.solutionHi || q.solutionEn : q.solutionEn || q.solutionHi) || '';
}
function hasBothLanguages(qs: Question[]) {
  return qs.some(q => q.textHi) && qs.some(q => q.textEn);
}
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function TestPage() {
  const { testId = '' } = useParams();
  const nav = useNavigate();
  const { user, setCoins } = useAuth();
  const uid = user?.id ?? 'anon';

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState('');
  // 'loading' = fetching questions after Start; 'submitFailed' = time is up but submit failed (manual retry).
  const [phase, setPhase] = useState<'intro' | 'loading' | 'running' | 'submitting' | 'submitFailed'>('intro');
  const [lang, setLang] = useState<Lang>(() => persistent.get<Lang>('rex_lang') || 'hi');
  const [p, setP] = useState<Progress | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showPalette, setShowPalette] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [reportQ, setReportQ] = useState<Question | null>(null);
  const [submitError, setSubmitError] = useState('');
  const submitted = useRef(false);
  usePageTitle(test?.title || 'Test');

  useEffect(() => {
    let alive = true;
    api.test(testId)
      .then(t => { if (alive) setTest(t); })
      .catch(e => alive && setError((e as Error).message));
    return () => { alive = false; };
  }, [testId]);

  const saved = useMemo(() => persistent.get<Progress>(progressKey(uid, testId)), [uid, testId]);
  const canResume = !!saved && saved.endAt > Date.now();

  /** Fetches the questions (this starts the server-side clock) and begins the test. */
  async function start(resume: boolean) {
    if (!test) return;
    setPhase('loading');
    setError('');
    let qs: Question[];
    try {
      qs = await api.questions(testId);
    } catch (e) {
      setError((e as Error).message);
      setPhase('intro');
      return;
    }
    if (qs.length === 0) {
      setError('Is test mein abhi questions nahi hain.');
      setPhase('intro');
      return;
    }
    setQuestions(qs);
    if (!hasBothLanguages(qs)) setLang(qs.some(q => q.textHi) ? 'hi' : 'en');
    const t0 = Date.now();
    let endAt = t0 + test.durationMinutes * 60_000;
    // Live tests cannot run past their end time.
    const liveEnd = test.isLive ? parseServerDate(test.endsAt)?.getTime() : undefined;
    if (liveEnd && liveStatus(test) === 'live') endAt = Math.min(endAt, liveEnd);
    const next: Progress = resume && saved
      ? saved
      : { answers: {}, review: [], visited: [], index: 0, endAt, startedAt: t0 };
    setP(next);
    setPhase('running');
  }

  // Save progress so a refresh / closed tab can resume.
  useEffect(() => {
    if (p && phase === 'running') persistent.set(progressKey(uid, testId), p);
  }, [p, phase, uid, testId]);

  // Clock
  useEffect(() => {
    if (phase !== 'running' && phase !== 'submitFailed') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Warn before closing the tab mid-test
  useEffect(() => {
    if (phase !== 'running') return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [phase]);

  const submit = useCallback(async () => {
    if (!test || !questions || !p || submitted.current) return;
    submitted.current = true;
    setPhase('submitting');
    setConfirmSubmit(false);
    setSubmitError('');
    const timeTaken = Math.round((Math.min(Date.now(), p.endAt) - p.startedAt) / 1000);
    try {
      const result = await api.submit(test.id, p.answers, timeTaken);
      // Live tests send answers + explanations only after submit; merge them in for the result page.
      const withAnswers = questions.map(q => {
        const d = result.solutionDetails?.[q.id];
        return d ? { ...q, correctOptionIndex: d.correctOptionIndex, solutionHi: d.solutionHi, solutionEn: d.solutionEn } : q;
      });
      const record: SavedResult = { test, questions: withAnswers, answers: p.answers, timeTaken, result, at: Date.now() };
      persistent.set(resultKey(uid, test.id), record);
      persistent.remove(progressKey(uid, test.id));
      if (result.newTotalCoins) setCoins(result.newTotalCoins);
      nav(`/test/${test.id}/result`, { replace: true });
    } catch (e) {
      submitted.current = false;
      setSubmitError((e as Error).message);
      // Time is over: stop here and let the user retry, instead of re-submitting in a loop.
      setPhase(p.endAt <= Date.now() ? 'submitFailed' : 'running');
    }
  }, [test, questions, p, nav, setCoins, uid]);

  const remaining = p ? Math.max(0, Math.floor((p.endAt - now) / 1000)) : 0;
  useEffect(() => {
    if (phase === 'running' && p && remaining <= 0) submit();
  }, [remaining, phase, p, submit]);

  // Mark current question as visited
  const curId = questions && p ? questions[p.index]?.id : undefined;
  useEffect(() => {
    if (!curId) return;
    setP(prev => (prev && !prev.visited.includes(curId) ? { ...prev, visited: [...prev.visited, curId] } : prev));
  }, [curId]);

  if (error && !test) return <div className="container"><ErrorBox message={error} /></div>;
  if (!test) return <Spinner />;

  // ── Instructions ──
  if (phase === 'intro' || phase === 'loading' || !p || !questions) {
    const status = test.isLive ? liveStatus(test) : null;
    const qCount = questions?.length ?? test.totalQuestions;
    const marks = test.totalMarks ?? qCount * (test.marksPerQuestion || 1);
    return (
      <div className="container narrow">
        <BackLink label="Wapas" onClick={() => nav(-1)} />
        <PageHeader icon={<Icon.clipboard />} title={test.title} subtitle={testTypeLabel(test.type)} />
        <div className="stat-grid">
          <StatCard icon={<Icon.clipboard />} tint="tint-blue" label="Questions" value={qCount} />
          <StatCard icon={<Icon.clock />} tint="tint-violet" label="Minutes" value={test.durationMinutes} />
          <StatCard icon={<Icon.star />} tint="tint-green" label="Total marks" value={marks} />
          <StatCard icon={<Icon.target />} tint="tint-orange" label="Negative / galat" value={test.negativeMarks || 0} />
        </div>
        <div className="card mt">
          <h3>Instructions</h3>
          <ul className="muted" style={{ paddingLeft: 18 }}>
            <li>Har sahi jawab par {test.marksPerQuestion} marks milenge{test.negativeMarks > 0 ? `, galat jawab par ${test.negativeMarks} marks katenge` : ''}.</li>
            <li>Time khatam hone par test apne aap submit ho jayega.</li>
            <li>Kisi question ko baad mein dekhne ke liye "Review" mark karein.</li>
            {!test.allowPrevious && <li>Is test mein pichhle question par wapas nahi ja sakte.</li>}
            <li>Page refresh hone par aapka progress save rahega.</li>
          </ul>
          {error && <div className="alert alert-error mt">{error}</div>}
          {(!questions || hasBothLanguages(questions)) && (
            <div className="field mt">
              <label>Language</label>
              <div className="tabs">
                <button className={'tab' + (lang === 'hi' ? ' active' : '')} onClick={() => { setLang('hi'); persistent.set('rex_lang', 'hi'); }}>हिंदी</button>
                <button className={'tab' + (lang === 'en' ? ' active' : '')} onClick={() => { setLang('en'); persistent.set('rex_lang', 'en'); }}>English</button>
              </div>
            </div>
          )}
          {status === 'upcoming' ? (
            <div className="alert alert-info mt">Yeh live test abhi shuru nahi hua hai.</div>
          ) : (
            <div className="row wrap mt">
              {canResume && <button className="btn btn-success" disabled={phase === 'loading'} onClick={() => start(true)}>Resume karein</button>}
              <button className={'btn' + (canResume ? ' btn-ghost' : ' btn-grad')} disabled={phase === 'loading'} onClick={() => start(false)}>
                {phase === 'loading' ? 'Questions load ho rahe hain…' : canResume ? 'Naye sire se shuru' : <><Icon.play /> Test shuru karein</>}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Running ──
  const q = questions[p.index];
  const opts = qOptions(q, lang);
  const selected = p.answers[q.id];
  const answeredCount = Object.keys(p.answers).length;
  const isLast = p.index === questions.length - 1;

  const go = (i: number) => {
    if (i < 0 || i >= questions.length) return;
    if (!test.allowPrevious && i < p.index) return;
    setP({ ...p, index: i });
    setShowPalette(false);
    window.scrollTo({ top: 0 });
  };
  const choose = (i: number) => setP({ ...p, answers: { ...p.answers, [q.id]: i } });
  const clear = () => { const a = { ...p.answers }; delete a[q.id]; setP({ ...p, answers: a }); };
  const toggleReview = () => setP({
    ...p,
    review: p.review.includes(q.id) ? p.review.filter(x => x !== q.id) : [...p.review, q.id],
  });

  const palClass = (qq: Question, i: number) => {
    let c = 'pal';
    if (p.review.includes(qq.id)) c += ' review';
    else if (p.answers[qq.id] !== undefined) c += ' answered';
    else if (p.visited.includes(qq.id)) c += ' skipped';
    if (i === p.index) c += ' current';
    return c;
  };

  return (
    <div className="exam-shell">
      <div className="exam-top">
        <div className="title">{test.title}</div>
        <span className="q-progress">{answeredCount}/{questions.length} answered</span>
        {hasBothLanguages(questions) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { const l = lang === 'hi' ? 'en' : 'hi'; setLang(l); persistent.set('rex_lang', l); }}>
            {lang === 'hi' ? 'English' : 'हिंदी'}
          </button>
        )}
        <span className={'timer' + (remaining < 60 ? ' low' : '')}>⏱ {formatDuration(remaining)}</span>
      </div>

      <div className="exam-body">
        <div>
          {submitError && <div className="alert alert-error">Submit nahi hua: {submitError}</div>}
          <div className="card">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <span className="bold">Question {p.index + 1} / {questions.length}</span>
              <div className="row">
                {q.subject && <span className="badge">{q.subject}</span>}
                <button className="link-btn small muted" onClick={() => setReportQ(q)}>⚑ Report</button>
              </div>
            </div>
            <div className="q-text">{qText(q, lang)}</div>
            {opts.map((o, i) => (
              <button key={i} className={'option' + (selected === i ? ' selected' : '')} onClick={() => choose(i)}>
                <span className="key">{KEYS[i]}</span><span>{o}</span>
              </button>
            ))}
          </div>
          <div className="row wrap mt">
            <button className="btn btn-ghost btn-sm" onClick={toggleReview}>
              {p.review.includes(q.id) ? '★ Review hataayein' : '☆ Review ke liye mark'}
            </button>
            {selected !== undefined && <button className="btn btn-ghost btn-sm" onClick={clear}>Answer clear karein</button>}
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowPalette(s => !s)}>
              Sabhi questions ({answeredCount}/{questions.length})
            </button>
          </div>
        </div>

        <aside className={'palette-panel' + (showPalette ? ' open' : '')}>
          <div className="card">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <span className="bold">Question palette</span>
              <span className="small muted">{answeredCount} answered</span>
            </div>
            <div className="palette">
              {questions.map((qq, i) => (
                <button key={qq.id} className={palClass(qq, i)} onClick={() => go(i)}
                  disabled={!test.allowPrevious && i < p.index}>{i + 1}</button>
              ))}
            </div>
            <div className="legend">
              <span style={{ ['--c' as string]: 'var(--success)' }}>Answered</span>
              <span style={{ ['--c' as string]: 'var(--review)' }}>Review</span>
              <span style={{ ['--c' as string]: 'var(--danger)' }}>Skipped</span>
              <span style={{ ['--c' as string]: 'var(--border)' }}>Not visited</span>
            </div>
            <button className="btn btn-success btn-block mt" onClick={() => setConfirmSubmit(true)}>Test submit karein</button>
          </div>
        </aside>
      </div>

      <div className="exam-actions">
        <button className="btn btn-ghost" onClick={() => go(p.index - 1)} disabled={p.index === 0 || !test.allowPrevious}>← Previous</button>
        {isLast
          ? <button className="btn btn-success" onClick={() => setConfirmSubmit(true)}>Submit</button>
          : <button className="btn btn-grad" onClick={() => go(p.index + 1)}>{selected !== undefined ? 'Save & Next →' : 'Next →'}</button>}
      </div>

      {(confirmSubmit || phase === 'submitting' || phase === 'submitFailed') && (
        <Modal onClose={() => phase === 'running' && setConfirmSubmit(false)}>
          {phase === 'submitting' ? (
            <div className="center"><Spinner /><p>Submit ho raha hai…</p></div>
          ) : phase === 'submitFailed' ? (
            <div className="center">
              <div style={{ fontSize: '2.4rem' }}>⏰</div>
              <h2>Time khatam, lekin submit nahi hua</h2>
              <p className="muted">{submitError || 'Internet check karein.'} Aapke answers save hain. Internet aane par dobara submit karein.</p>
              <button className="btn btn-grad" onClick={submit}>Dobara submit karein</button>
            </div>
          ) : (
            <>
              <h2>Test submit karein?</h2>
              <div className="grid-sm mt">
                <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>{answeredCount}</div><div className="lbl">Answered</div></div>
                <div className="stat"><div className="num" style={{ color: 'var(--danger)' }}>{questions.length - answeredCount}</div><div className="lbl">Baaki</div></div>
                <div className="stat"><div className="num" style={{ color: 'var(--review)' }}>{p.review.length}</div><div className="lbl">Review</div></div>
              </div>
              <p className="muted small mt">Submit karne ke baad answers badal nahi sakte. Bacha hua time: {formatDuration(remaining)}</p>
              <div className="row mt" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setConfirmSubmit(false)}>Wapas jayein</button>
                <button className="btn btn-success" onClick={submit}>Haan, submit</button>
              </div>
            </>
          )}
        </Modal>
      )}

      {reportQ && <ReportDialog testId={test.id} question={reportQ} onClose={() => setReportQ(null)} />}
    </div>
  );
}

const BUG_TYPES = ['Wrong Answer', 'Wrong Question', 'Typo / Spelling', 'Translation Issue', 'Other'];

export function ReportDialog({ testId, question, onClose }: { testId: string; question: Question; onClose: () => void }) {
  const [type, setType] = useState(BUG_TYPES[0]);
  const [desc, setDesc] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');

  async function send() {
    setState('busy');
    setErr('');
    try {
      await api.report({ testId, questionId: question.id, bugType: type, description: desc.trim() || undefined });
      setState('done');
    } catch (e) {
      setErr((e as Error).message);
      setState('idle');
    }
  }

  return (
    <Modal onClose={onClose}>
      {state === 'done' ? (
        <div className="center">
          <div style={{ fontSize: '2.5rem' }}>🙏</div>
          <h2>Report bhej diya</h2>
          <p className="muted">Hamari team ise check karegi.</p>
          <button className="btn" onClick={onClose}>Theek hai</button>
        </div>
      ) : (
        <>
          <h2>Question report karein</h2>
          {err && <div className="alert alert-error">{err}</div>}
          <div className="field">
            <label>Problem kya hai?</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              {BUG_TYPES.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Details (optional)</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Sahi answer ya galti batayein…" />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={send} disabled={state === 'busy'}>Report bhejein</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Result ───────────────────────────────────────────────

export function ResultPage() {
  const { testId = '' } = useParams();
  const { user } = useAuth();
  const data = useMemo(() => persistent.get<SavedResult>(resultKey(user?.id ?? 'anon', testId)), [user?.id, testId]);
  const [lang, setLang] = useState<Lang>(() => persistent.get<Lang>('rex_lang') || 'hi');
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');
  const [reportQ, setReportQ] = useState<Question | null>(null);
  usePageTitle('Result');

  if (!data) {
    return (
      <div className="card empty narrow" style={{ margin: '0 auto' }}>
        <div className="big">📄</div>
        <p>Is test ka result is browser mein save nahi hai.</p>
        <Link to={`/test/${testId}`} className="btn">Test dobara dein</Link>
      </div>
    );
  }

  const { test, questions, answers, timeTaken, result } = data;
  const correctOf = (q: Question) => result.solutions?.[q.id] ?? q.correctOptionIndex;
  const statusOf = (q: Question) => answers[q.id] === undefined ? 'skipped' : answers[q.id] === correctOf(q) ? 'correct' : 'wrong';
  const counts = { correct: 0, wrong: 0, skipped: 0 };
  questions.forEach(q => { counts[statusOf(q)]++; });
  const totalMarks = test.totalMarks ?? questions.length * (test.marksPerQuestion || 1);
  const pct = totalMarks > 0 ? Math.max(0, Math.round((result.score / totalMarks) * 100)) : 0;
  const shown = questions.map((q, i) => ({ q, i })).filter(({ q }) => filter === 'all' || statusOf(q) === filter);

  return (
    <div className="narrow" style={{ margin: '0 auto' }}>
      <section className="result-hero">
        <div className="score-ring score-ring-light" style={{ ['--p' as string]: pct }}>
          <div>
            <div>
              <div style={{ fontSize: '1.7rem', fontWeight: 800 }}>{Math.round(result.score * 100) / 100}</div>
              <div className="tiny muted">/ {totalMarks}</div>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <div className="small" style={{ opacity: .9 }}>Test complete 🎉</div>
          <h1>{test.title}</h1>
          {result.coinsEarned > 0 && <div className="coin-pill" style={{ marginTop: 4 }}><span className="coin" /> +{result.coinsEarned} coins kamaaye</div>}
          <div className="row wrap" style={{ marginTop: 14, gap: 8 }}>
            <Link to={`/leaderboard?testId=${test.id}`} className="btn btn-accent"><Icon.trophy /> Rank dekhein</Link>
            <Link to={`/test/${test.id}`} className="btn btn-outline-light">Dobara dein</Link>
            <Link to="/" className="btn btn-outline-light">Home</Link>
          </div>
        </div>
        <HawaMahal className="page-head-art" />
      </section>
      {(result.message || result.countedForRank === false) && (
        <div className="alert alert-info mt">{result.message || 'Yeh attempt sirf practice hai, rank aur coins par asar nahi hoga.'}</div>
      )}
      <div className="stat-grid stat-grid-5">
        <StatCard icon={<Icon.check />} tint="tint-green" label="Sahi" value={counts.correct} />
        <StatCard icon={<span style={{ fontWeight: 800 }}>✕</span>} tint="tint-red" label="Galat" value={counts.wrong} />
        <StatCard icon={<Icon.back />} tint="tint-blue" label="Chhode" value={counts.skipped} />
        <StatCard icon={<Icon.target />} tint="tint-violet" label="Accuracy" value={Math.round(result.accuracy) + '%'} />
        <StatCard icon={<Icon.clock />} tint="tint-orange" label="Time" value={formatDuration(timeTaken)} />
      </div>

      <div className="section-title">
        <h2>Solutions</h2>
        {questions.some(q => q.textHi) && questions.some(q => q.textEn) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}>{lang === 'hi' ? 'English' : 'हिंदी'}</button>
        )}
      </div>
      <div className="tabs mb">
        {(['all', 'correct', 'wrong', 'skipped'] as const).map(f => (
          <button key={f} className={'tab' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
            {{ all: 'Sabhi', correct: 'Sahi', wrong: 'Galat', skipped: 'Chhode' }[f]} ({f === 'all' ? questions.length : counts[f]})
          </button>
        ))}
      </div>
      <div className="stack">
        {shown.map(({ q, i }) => {
          const correct = correctOf(q);
          const mine = answers[q.id];
          const sol = qSolution(q, lang);
          return (
            <div key={q.id} className={'card sol-card sol-' + statusOf(q)}>
              <div className="row-between" style={{ marginBottom: 8 }}>
                <span className="bold">Q{i + 1}</span>
                <div className="row">
                  <span className={'badge ' + ({ correct: 'badge-success', wrong: 'badge-danger', skipped: '' }[statusOf(q)])}>
                    {{ correct: 'Sahi', wrong: 'Galat', skipped: 'Skipped' }[statusOf(q)]}
                  </span>
                  <button className="link-btn small muted" onClick={() => setReportQ(q)}>⚑ Report</button>
                </div>
              </div>
              <div className="q-text">{qText(q, lang)}</div>
              {qOptions(q, lang).map((o, oi) => (
                <button key={oi} disabled className={'option' + (oi === correct ? ' correct' : oi === mine ? ' wrong' : '')}>
                  <span className="key">{KEYS[oi]}</span><span>{o}</span>
                </button>
              ))}
              {sol && <div className="solution"><strong>Vyakhya: </strong>{sol}</div>}
            </div>
          );
        })}
      </div>
      {reportQ && <ReportDialog testId={test.id} question={reportQ} onClose={() => setReportQ(null)} />}
    </div>
  );
}
