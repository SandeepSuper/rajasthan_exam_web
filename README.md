# Rajasthan Exams — Web App

This is the website version of the Rajasthan Exams Android app. It uses the same backend (`../backend`) and the same user accounts.

The Android app is unchanged. A user can stay logged in on both the phone and the website at the same time.

## Run on your computer

```bash
npm install
cp .env.example .env.local   # then edit: set VITE_DEV_API_TARGET to your backend
npm run dev                  # opens http://localhost:5173
```

## Build for the server

```bash
npm run build                # output goes to dist/
```

Copy `dist/` to the server. Then follow `deploy/nginx-web.conf` so nginx serves the website and the API from the same domain.

## Settings (.env.local)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Where the browser sends API calls. Keep `/api` when the site and API share a domain. |
| `VITE_DEV_API_TARGET` | Dev only: the backend that `npm run dev` forwards `/api` calls to. |
| `VITE_GOOGLE_CLIENT_ID` | The Web OAuth client ID (the same one as the backend's `GOOGLE_CLIENT_ID`). Add the site URL to "Authorized JavaScript origins" in Google Cloud. Leave it empty to hide the Google button. |

If the website is on a **different** domain from the API, set `CORS_ALLOWED_ORIGINS=https://your-site.com` on the backend.

## Pages

| URL | Page |
|---|---|
| `/` | Home: exams, live tests, news |
| `/exam/:id` | Exam tests, filtered by type |
| `/exam/:id/buy` | Razorpay payment, with coin discount |
| `/test/:id` | Instructions, then the test (timer, palette, Hindi/English, review mark, resume after refresh) |
| `/test/:id/result` | Score and solutions |
| `/live` | Live tests |
| `/leaderboard` | Rankers |
| `/performance` | Performance |
| `/current-affairs` | Current affairs |
| `/notifications` | Notifications |
| `/community` | Community doubts and answers |
| `/profile` | Profile |
| `/referral` | Referral |
| `/login`, `/signup`, `/verify-email`, `/forgot-password` | Login, signup, email OTP and password reset |

Anyone can browse exams, tests, live tests and news without logging in. Taking a test, buying, community, rankers and profile need a login.
