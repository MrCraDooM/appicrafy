# AppicraFy

AI-powered mobile app generator. Describe your app idea and instantly get a complete React Native + Expo project ready to run.

## Tech Stack

- React 18 + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- Supabase (Auth + Database + Edge Functions)
- Paddle (Billing)

## Local Development

```sh
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your values
cp .env.example .env

# 3. Start dev server
npm run dev
```

## Environment Variables

See [.env.example](.env.example) for all required variables.

## Deploy

- **Frontend**: Vercel (auto-detects Vite, uses `dist/` output)
- **Backend**: Supabase Edge Functions (`supabase functions deploy`)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 8080 |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
