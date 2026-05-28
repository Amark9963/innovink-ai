# Innovink

Innovink is an enterprise-grade platform for running innovation programs end to end.

The product is built around one operating rule:

**AI drafts. Humans approve. Deterministic services execute.**

It is designed for hackathons, innovation challenges, accelerators, open calls, student competitions, grants, and related enterprise programs.

## What Innovink Does

Program managers use an AI workspace to:
- create a structured program brief
- generate an execution plan
- prepare approval packets
- execute approved setup into the live platform
- review generated operational assets
- monitor execution and live operations

The broader platform supports:
- public landing pages
- participant registration and submission flows
- judging setup and evaluation workflows
- communications and automation
- mentoring and matchmaking foundations
- sponsor-safe reporting
- enterprise governance and auditability

## Current Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Supabase Auth, Postgres, RLS, Storage, Realtime, Edge Functions
- Zod
- Vitest
- Playwright
- Resend
- Docker Compose
- Caddy

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Main checks:

```bash
npm run lint
npm run typecheck
npm run test
```

## Current Repo Structure

```text
src/app                Next.js routes and UI
src/components         shared UI components
src/lib                AI, execution, Supabase, and utility logic
supabase/functions     Edge Functions
supabase/migrations    SQL migrations
tests/e2e              Playwright tests
ops/                   deployment and runtime config
```

## Notes

- The pushed repo intentionally excludes local env files.
- The pushed repo intentionally excludes mockup HTML/CSS screen artifacts.
- The pushed repo intentionally excludes planning and PRD markdown documents beyond this README.

## Status

The repository currently contains:
- the enterprise schema foundation
- the agentic PM workspace flow
- journey-first screens for login, onboarding, dashboard, create, brief, plan, approvals, and execution
- deterministic execution wiring for approved plan items

The next implementation steps are focused on the remaining mockup-aligned program surfaces and deeper end-to-end workflows.
