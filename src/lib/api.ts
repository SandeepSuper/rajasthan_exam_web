import type {
  ApiMessage, AppConfig, AppNotification, AuthResponse, CoinPreview, CommunityComment,
  CommunityPost, CreateOrderResponse, Exam, LeaderboardEntry, NewsItem, Performance,
  Question, ReferralInfo, ReferredUser, Test, TestResult, TopReferrer, UserProfile,
} from './types';

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

// The login lives in an HttpOnly cookie set by the backend, so no script on the page can read it.
// Remove the token older versions of the site kept in localStorage.
try { localStorage.removeItem('rex_token'); } catch { /* storage blocked */ }

/** True while the app believes a user is signed in (decides whether a 401 means "session ended"). */
let signedIn = false;
export function setSignedIn(v: boolean) { signedIn = v; }

/** Called when the server says our token is no longer valid (e.g. logged in elsewhere). */
let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(fn: () => void) { onUnauthorized = fn; }

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown, query?: Record<string, string | undefined>): Promise<T> {
  let url = BASE + path;
  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, v); });
    const s = qs.toString();
    if (s) url += '?' + s;
  }
  // "X-Client: web" makes the backend keep the website's login separate from the Android app's,
  // and is required before the backend accepts the login cookie (blocks cross-site requests).
  const headers: Record<string, string> = { 'X-Client': 'web' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method, headers, credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Internet connection check karein aur dobara try karein.');
  }

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    if (res.status === 401 && signedIn) onUnauthorized();
    let msg = '';
    if (typeof data === 'string') msg = data;
    else if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      msg = String(d.message ?? d.error ?? '');
    }
    throw new ApiError(res.status, msg || defaultMessage(res.status));
  }
  return data as T;
}

function defaultMessage(status: number) {
  if (status === 401) return 'Session expire ho gaya. Kripya dobara login karein.';
  if (status === 403) return 'Aapko is cheez ki permission nahi hai.';
  if (status === 404) return 'Yeh cheez nahi mili.';
  if (status === 429) return 'Bahut zyada requests. Thodi der baad try karein.';
  if (status >= 500) return 'Server mein dikkat hai. Thodi der baad try karein.';
  return 'Kuch galat ho gaya. Dobara try karein.';
}

export const api = {
  // Auth
  register: (b: { name: string; email: string; password: string; referredByCode?: string }) =>
    request<ApiMessage>('POST', '/auth/register', b),
  sendEmailOtp: (email: string) => request<ApiMessage>('POST', '/auth/send-email-otp', { email }),
  verifyEmailOtp: (email: string, otp: string) => request<AuthResponse>('POST', '/auth/verify-email-otp', { email, otp }),
  login: (email: string, password: string) => request<AuthResponse>('POST', '/auth/login', { email, password }),
  forgotPassword: (email: string) => request<ApiMessage>('POST', '/auth/forgot-password', { email }),
  resetPassword: (email: string, otp: string, newPassword: string) =>
    request<ApiMessage>('POST', '/auth/reset-password', { email, otp, newPassword }),
  googleLogin: (idToken: string, referredByCode?: string) =>
    request<AuthResponse>('POST', '/auth/google', { idToken, referredByCode }),
  logout: () => request<ApiMessage>('POST', '/auth/logout'),
  /** Saves name, avatar and (with updateMobile) mobile in one request. */
  updateProfile: (b: { name: string; email: string; profilePicture?: string | null; updateMobile?: boolean; mobile?: string | null }) =>
    request<ApiMessage>('POST', '/auth/update-profile', b),

  // User
  profile: () => request<UserProfile>('GET', '/users/profile'),
  referral: () => request<ReferralInfo>('GET', '/users/referral'),
  myReferrals: () => request<ReferredUser[]>('GET', '/users/my-referrals'),
  topReferrers: () => request<TopReferrer[]>('GET', '/users/top-referrers'),
  config: () => request<AppConfig>('GET', '/config'),

  // Content
  exams: () => request<Exam[]>('GET', '/tests/exams'),
  tests: (examId: string) => request<Test[]>('GET', '/tests', undefined, { examId }),
  test: (testId: string) => request<Test>('GET', `/tests/${testId}`),
  liveTests: () => request<Test[]>('GET', '/tests/live'),
  questions: (testId: string) => request<Question[]>('GET', '/tests/questions', undefined, { testId }),
  submit: (testId: string, answers: Record<string, number>, timeTaken: number) =>
    request<TestResult>('POST', '/tests/submit', { testId, answers, timeTaken }),
  performance: () => request<Performance>('GET', '/tests/performance'),
  report: (b: { testId: string; questionId: string; bugType: string; description?: string }) =>
    request<unknown>('POST', '/reports', b),
  leaderboard: (testId?: string) => request<LeaderboardEntry[]>('GET', '/leaderboard', undefined, { testId }),

  // Payments
  coinPreview: (examId: string) => request<CoinPreview>('GET', '/payment/coin-preview', undefined, { examId }),
  createOrder: (examId: string, useCoins: boolean) =>
    request<CreateOrderResponse>('POST', '/payment/create-order', { examId, useCoins }),
  verifyPayment: (b: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    request<{ success: boolean; message: string }>('POST', '/payment/verify', b),

  // News & notifications
  news: () => request<NewsItem[]>('GET', '/news'),
  notifications: () => request<AppNotification[]>('GET', '/notifications'),
  markAllRead: () => request<unknown>('PUT', '/notifications/mark-all-read'),

  // Community
  posts: (userId?: string, examId?: string) => request<CommunityPost[]>('GET', '/community/posts', undefined, { userId, examId }),
  createPost: (b: { userId: string; userName: string; userProfilePicture: string | null; content: string; subject: string; category: string; examId?: string | null }) =>
    request<unknown>('POST', '/community/posts', b),
  comments: (postId: string) => request<CommunityComment[]>('GET', `/community/posts/${postId}/comments`),
  addComment: (postId: string, b: { userId: string; userName: string; userProfilePicture: string | null; content: string }) =>
    request<CommunityComment>('POST', `/community/posts/${postId}/comments`, b),
  viewPost: (postId: string) => request<unknown>('PUT', `/community/posts/${postId}/view`),
  toggleLike: (postId: string, userId: string) =>
    request<boolean>('PUT', `/community/posts/${postId}/like`, undefined, { userId }),
};
