// Shapes of the JSON the backend returns. Mirrors the Android app's DTOs.

export interface AuthResponse {
  token: string;
  userId: string;
  name: string | null;
  email: string | null;
  profilePicture: string | null;
  isPremium: boolean;
  isNewUser: boolean;
  coins: number;
  referCode: string | null;
}

export interface ApiMessage {
  message: string;
  success: boolean;
}

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  mobile: string | null;
  profilePicture: string | null;
  coins: number;
  referCode: string | null;
  isPremium: boolean;
}

export interface Exam {
  id: string;
  title: string;
  category: string;
  iconUrl: string | null;
  testCount: number;
  languageSupported: 'HINDI' | 'ENGLISH' | 'BOTH' | string;
  marksPerQuestion: number;
  isPremium: boolean;
  price: number;
  discountPercent: number;
  isPurchased: boolean;
}

export type TestType = 'MOCK' | 'TOPIC' | 'PYQ' | 'FULL' | 'DAILY_QUIZ';

export interface Test {
  id: string;
  title: string;
  type: TestType;
  durationMinutes: number;
  totalQuestions: number;
  isPremium: boolean;
  isLive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  allowPrevious: boolean;
  sectionLock: boolean;
  negativeMarks: number;
  marksPerQuestion: number;
  totalMarks: number | null;
  isAttempted: boolean;
}

export interface Question {
  id: string;
  textHi: string | null;
  textEn: string | null;
  optionsHi: string[] | null;
  optionsEn: string[] | null;
  correctOptionIndex: number;   // -1 while a live test is running (answers hidden)
  solutionHi: string | null;
  solutionEn: string | null;
  subject: string | null;
  marksPerQuestion: number | null;
  negativeMarks: number | null;
}

export interface SolutionDetail {
  correctOptionIndex: number;
  solutionHi: string | null;
  solutionEn: string | null;
}

export interface TestResult {
  attemptId: string | null;      // null when the attempt was practice only
  solutionDetails?: Record<string, SolutionDetail>;
  countedForRank?: boolean;      // false for live-test retakes / late attempts
  message?: string | null;
  score: number;
  totalQuestions: number;
  accuracy: number;
  correctAnswers: number;
  coinsEarned: number;
  newTotalCoins: number;
  solutions: Record<string, number>;
}

export interface Performance {
  totalTests: number;
  avgAccuracy: number;
  bestScore: number;
  totalTimeSecs: number;
  weeklyScores: number[];
  weeklyAccuracies: number[];
  weeklyDates: string[];
  weakTopics: string[];
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  rank: number;
  score: number;
  totalMarks: number;
  timeTaken: number;
  coins: number;
  exam: string | null;
  avatarUrl: string | null;
}

export interface NewsItem {
  id: string;
  titleHi: string;
  titleEn: string | null;
  descHi: string | null;
  descEn: string | null;
  date: string;
  imageUrl: string | null;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string | null;
  isRead: boolean;
  iconType: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userProfilePicture: string | null;
  content: string;
  subject: string;
  category: string;
  examId: string | null;
  upvotes: number;
  commentCount: number;
  viewCount: number;
  isLiked: boolean;
  verifiedAnswer: string | null;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userProfilePicture: string | null;
  content: string;
  createdAt: string;
}

export interface CoinPreview {
  userCoins: number;
  coinValue: number;
  maxUsableCoins: number;
  discountAmount: number;
  basePrice: number;
  finalPrice: number;
  maxCoinDiscountPercent: number;
}

export interface CreateOrderResponse {
  free?: boolean;
  success?: boolean;
  message?: string;
  orderId?: string;
  amount?: number;
  key?: string;
  examName?: string;
  description?: string;
  coinsUsed?: number;
  coinDiscount?: number;
}

export interface ReferralInfo {
  referCode: string;
  referredCount: number;
  coinsEarned: number;
}

export interface TopReferrer {
  name: string;
  referredCount: number;
  avatarId: string | null;
}

export interface ReferredUser {
  name: string;
  joinedAt: string;
  avatarId: string | null;
  coinsEarned: number;
}

export interface AppConfig {
  playStoreUrl: string;
  referrerCoinReward: number;
  refereeCoinReward: number;
  shareMessage: string;
}
