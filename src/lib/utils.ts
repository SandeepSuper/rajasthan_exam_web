import { useCallback, useEffect, useState } from 'react';
import type { Exam, Test, TestType } from './types';

export const TEST_TYPES: { type: TestType; label: string; hint: string }[] = [
  { type: 'MOCK', label: 'Mock Tests', hint: 'Full-length practice' },
  { type: 'TOPIC', label: 'Topic Tests', hint: 'Subject-wise practice' },
  { type: 'FULL', label: 'Full Tests', hint: 'Complete syllabus' },
  { type: 'PYQ', label: 'Previous Year Papers', hint: 'Old official papers' },
  { type: 'DAILY_QUIZ', label: 'Daily Quiz', hint: 'Short daily practice' },
];

export function testTypeLabel(t: TestType) {
  return TEST_TYPES.find(x => x.type === t)?.label ?? t;
}

/** Profile pictures are either "avatar_N" (bundled image) or a full URL. */
export function avatarSrc(pic: string | null | undefined): string | null {
  if (!pic) return null;
  if (/^avatar_\d+$/.test(pic)) return `/avatars/${pic}.png`;
  if (pic.startsWith('http') || pic.startsWith('/')) return pic;
  return null;
}

export function initials(name: string | null | undefined) {
  const parts = (name || 'S').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? 'S') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/**
 * Backend sends LocalDateTime without a timezone; those times are India time (IST, +05:30).
 * Parse them as IST explicitly so users in other timezones see the right live-test times.
 */
export function parseServerDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(s);
  const isDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s);
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const iso = hasZone ? s : isDateTime ? s + '+05:30' : isDateOnly ? s + 'T00:00:00+05:30' : s;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(s: string | null | undefined, withTime = false) {
  const d = parseServerDate(s);
  if (!d) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

export function timeAgo(s: string | null | undefined) {
  const d = parseServerDate(s);
  if (!d) return '';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'abhi';
  if (sec < 3600) return `${Math.floor(sec / 60)} min pehle`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} ghante pehle`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)} din pehle`;
  return formatDate(s);
}

export function formatDuration(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}

export function rupees(n: number) {
  return '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
}

export function discountedPrice(exam: Exam) {
  const p = exam.price || 0;
  const d = exam.discountPercent || 0;
  return Math.round(p * (100 - d)) / 100;
}

export type LiveStatus = 'upcoming' | 'live' | 'ended';
export function liveStatus(t: Test, now = Date.now()): LiveStatus {
  const start = parseServerDate(t.startsAt)?.getTime();
  const end = parseServerDate(t.endsAt)?.getTime();
  if (start && now < start) return 'upcoming';
  if (end && now > end) return 'ended';
  return 'live';
}

/** Simple data loader hook: returns { data, error, loading, reload }. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    run()
      .then(d => { if (!cancelled) setData(d); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [run]);

  useEffect(() => reload(), [reload]);
  return { data, error, loading, reload, setData };
}

/** Per-browser storage helpers that never throw. */
export const store = {
  get<T>(key: string): T | null {
    try { const v = sessionStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
  },
  set(key: string, value: unknown) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
  remove(key: string) {
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
  },
};

export const persistent = {
  get<T>(key: string): T | null {
    try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
  remove(key: string) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

/**
 * Browser-saved test progress and results are kept per user, so on a shared computer one
 * student can never resume or see another student's attempt.
 */
export const progressKey = (userId: string, testId: string) => `rex_progress_${userId}_${testId}`;
export const resultKey = (userId: string, testId: string) => `rex_result_${userId}_${testId}`;
