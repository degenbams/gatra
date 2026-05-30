This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Gatra only needs these public Supabase keys in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not add or expose a `service_role` key in the frontend.

## Supabase Database Updates

Run `supabase-income-entries.sql` in the Supabase SQL Editor before using the Pemasukan Tambahan feature. The script creates `income_entries`, enables RLS, adds per-user policies, and attaches the `updated_at` trigger.

## Supabase Auth Setup

### Development

For local testing, Supabase email verification can hit the default email sender rate limit. To avoid blocked register tests:

- Open Supabase Dashboard > Authentication > Providers > Email.
- Turn off `Confirm email` while testing locally.
- Keep using the normal email/password register form in Gatra.

With `Confirm email` off, Supabase can return a session immediately and Gatra redirects the user to `/dashboard`.

### Production

Before deploying to real users:

- Turn `Confirm email` back on if email verification is required.
- Configure custom SMTP, such as Resend, SendGrid, Mailgun, or another SMTP provider, so verification emails do not depend on the default Supabase email sender.
- Set the Supabase Auth `Site URL` to the production Vercel domain.
- Add the production redirect URL, for example `https://your-domain.vercel.app/auth/callback`, to Supabase Auth Redirect URLs.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
