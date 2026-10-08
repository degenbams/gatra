# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

General Indonesian personal-finance users — anyone with a recurring monthly income who needs to know whether they are still on track this month. No single segment was chosen; the owner deliberately left the audience open.

Inferred and unconfirmed: the strongest fit is a young salaried or freelance worker in Indonesia who gets paid monthly, spends in rupiah, tracks in their head, and wants a fast answer to "boleh jajan nggak hari ini?" rather than accounting-grade bookkeeping.

## Product Purpose

Gatra is a personal finance recap app. It records income and expenses, and turns them into a monthly picture: what came in, what went out, what is left, and whether the month is still healthy.

Success means the user opens it daily for a few seconds and knows where they stand, instead of reconstructing their finances from a banking app at the end of the month.

## Positioning

The mechanism a neighboring expense tracker could not truthfully copy: Gatra converts a monthly plan into a single **daily safe-spend number** ("jatah aman hari ini").

Most trackers answer "what did I spend?" after the fact. Gatra answers "how much can I still spend today?" before it happens, by deriving it from monthly income, a savings target, and category limits. That daily figure is the product's real output; the transaction list is only its input.

## Operating Context

- Used in rupiah, on mobile as the primary device (the README leads with a mobile screenshot), with desktop as a secondary surface.
- Daily-use rhythm: quick entry of a spend, then a glance at the daily allowance.
- Monthly rhythm: setting income, savings target, and category limits at the start of the month; reviewing a recap at the end.
- Indonesian language throughout, including dates and currency formatting.
- Auth is email + password via Supabase. Dashboard is behind auth.

## Capabilities and Constraints

Confirmed functionality:
- Auth: register, login, email callback, logout.
- Dashboard: monthly income (primary + additional), total spend, remaining money, remaining safe budget, financial status, today's safe allowance.
- Monthly setup: income, savings target, realistic preview, per-category limits.
- Transactions: create, edit, delete, filter by month/year.
- Income entries: create, edit, delete, filter by month/year.
- Recap: monthly insights, category breakdown, daily tracking, weekly tracking, transaction and income lists.
- Export monthly recap to PDF from the browser.

Technical constraints:
- Next.js App Router, TypeScript, Tailwind CSS v4, Supabase (Auth + Postgres + RLS), Recharts, jsPDF + autoTable.
- Only public Supabase keys are available client-side; no `service_role` key may reach the frontend.
- Data is isolated per user via RLS and `auth.uid()`.

Explicitly undecided: visual direction was left entirely to the implementer by the owner ("bebas").

## Brand Commitments

- The name **Gatra** is fixed.
- The tagline **"Rekap keuanganmu, tersusun jelas."** exists and is in use.
- No logo mark, no brand palette, and no typographic commitment exist yet. Nothing visual is binding.

## Evidence on Hand

- Real product copy in Indonesian across all screens (see `app/` and `components/`).
- README describes the feature set and deployment (production at gatra.cash).
- Two screenshots are referenced in the README (`gatra-login-desktop.png`, `gatra-monthly-setup-mobile.png`) but are **not present in the repository** — treat them as absent.
- No testimonials, no customer names, no benchmarks, no usage numbers, no press. Future work must not fabricate any of these.
- No real user data may be used in any demo or screenshot.

## Product Principles

1. **Answer the daily question first.** The safe-to-spend number outranks any report; every surface should make it reachable in one glance.
2. **Input should cost seconds.** Recording a spend is a chore the user tolerates to get the answer — keep it short and low-friction.
3. **Calm, not gamified.** Money anxiety is the context. The interface should reduce it; no confetti, no streak pressure, no hype.
4. **Show the arithmetic.** The user should be able to see how the daily number was derived; a number nobody can trace is a number nobody trusts.
5. **Rupiah and Indonesian first.** Formatting, dates, and wording are native, never translated as an afterthought.

## Accessibility & Inclusion

No product-specific accessibility requirement was established by the owner. Baseline expectation: WCAG 2.1 AA for text contrast and keyboard operability, consistent with the contrast work already merged on the auth surfaces.
