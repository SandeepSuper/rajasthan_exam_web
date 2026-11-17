import { Link } from 'react-router-dom';
import type { Test, TestType } from '../lib/types';
import { useAuth } from '../lib/auth';
import { formatDate, liveStatus, persistent, resultKey, testTypeLabel } from '../lib/utils';
import { Icon } from './ui';

/** A saved result exists in this browser for this test (written by the result page). */
export function hasLocalResult(userId: string | undefined, testId: string) {
  return !!userId && !!persistent.get(resultKey(userId, testId));
}

const TYPE_LOOK: Record<TestType, { emoji: string; tint: string }> = {
  MOCK: { emoji: '📝', tint: 'thumb-blue' },
  TOPIC: { emoji: '🎯', tint: 'thumb-green' },
  FULL: { emoji: '📚', tint: 'thumb-violet' },
  PYQ: { emoji: '📜', tint: 'thumb-orange' },
  DAILY_QUIZ: { emoji: '⚡', tint: 'thumb-pink' },
};

export function TestCard({ test, locked, buyHref }: { test: Test; locked?: boolean; buyHref?: string }) {
  const { user } = useAuth();
  const status = test.isLive ? liveStatus(test) : null;
  const marks = test.totalMarks ?? test.totalQuestions * (test.marksPerQuestion || 1);
  const look = TYPE_LOOK[test.type] ?? TYPE_LOOK.MOCK;

  let action: JSX.Element;
  if (status === 'upcoming') {
    action = <span className="countdown countdown-warn"><Icon.clock /> Starts {formatDate(test.startsAt, true)}</span>;
  } else if (locked) {
    action = <Link to={buyHref || '#'} className="btn btn-accent btn-sm"><Icon.lock /> Unlock</Link>;
  } else if (test.isAttempted && hasLocalResult(user?.id, test.id)) {
    action = (
      <div className="row">
        <Link to={`/test/${test.id}/result`} className="btn btn-ghost btn-sm">Result</Link>
        {status !== 'ended' && <Link to={`/test/${test.id}`} className="btn btn-grad btn-sm">Phir se do</Link>}
      </div>
    );
  } else if (status === 'ended' && !test.isAttempted) {
    action = <Link to={`/test/${test.id}`} className="btn btn-ghost btn-sm">Practice karein</Link>;
  } else {
    action = (
      <Link to={`/test/${test.id}`} className="btn btn-grad btn-sm">
        {test.isAttempted ? 'Phir se do' : status === 'live' ? 'Join Now' : 'Start karein'} <Icon.arrow />
      </Link>
    );
  }

  return (
    <div className={'card test-card' + (locked ? ' is-locked' : '')}>
      <div className={`test-thumb ${look.tint}`}>{locked ? '🔒' : look.emoji}</div>
      <div className="test-main">
        <div className="row wrap" style={{ gap: '.35rem', marginBottom: 4 }}>
          {status === 'live' && <span className="badge badge-danger"><span className="live-dot" /> LIVE</span>}
          {status === 'ended' && <span className="badge">Ended</span>}
          <span className="badge badge-primary">{testTypeLabel(test.type)}</span>
          {test.isPremium ? <span className="badge badge-accent">Premium</span> : <span className="badge badge-success">Free</span>}
          {test.isAttempted && <span className="badge badge-success">✓ Attempted</span>}
        </div>
        <h3>{test.title}</h3>
        <div className="muted small row wrap" style={{ gap: '.9rem' }}>
          <span>{test.totalQuestions} Qs</span>
          <span className="row" style={{ gap: 4 }}><Icon.clock /> {test.durationMinutes} min</span>
          <span>{marks} Marks</span>
          {test.negativeMarks > 0 && <span>−{test.negativeMarks} negative</span>}
        </div>
        <div className="test-foot">
          {test.isLive && test.endsAt && status === 'live'
            ? <span className="countdown"><Icon.clock /> Ends {formatDate(test.endsAt, true)}</span>
            : <span />}
          {action}
        </div>
      </div>
    </div>
  );
}
