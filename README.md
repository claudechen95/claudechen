# claudechen.me

Personal website. An AI version of me answers questions about who I am and what I'm building.

## Stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS
- **AI:** Anthropic Claude (claude-sonnet-4-6) with tool use
- **Database:** Upstash Redis (guestbook entries)
- **Storage:** Vercel Blob (guestbook photos)
- **Analytics:** PostHog
- **Deployment:** Vercel

## Features

- Chat with an AI version of me — asks about my background, work, and what I'm building
- Voice input via microphone
- Photo display, calendar booking, and guestbook tools
- Guestbook with polaroid-style photo wall

## Dev

```bash
npm install
npm run dev     # localhost:3131
npm run deploy  # git push → Vercel
```

## Env vars

```
personalwebsite_KV_REST_API_URL
personalwebsite_KV_REST_API_TOKEN
BLOB_READ_WRITE_TOKEN
BLOB_STORE_ID
ANTHROPIC_API_KEY
ADMIN_SECRET
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
```
