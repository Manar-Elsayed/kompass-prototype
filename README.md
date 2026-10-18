# Kompass prototype

This is a frontend-only, interactive prototype of the Kompass ecosystem: the **public website**, the **admin dashboard** and the **partner portal**. All three run in one Next.js app on shared mock data. There is no backend.

```bash
npm install
npm run dev        # http://localhost:3000
```

| URL | What |
| --- | --- |
| `/en/hub` | Prototype hub with the ecosystem map, guided demo scenarios and refactor notes |
| `/en` · `/ar` | Website (English, or Arabic RTL) |
| `/en/admin` | Admin. Sign in with any demo account; no password is checked |
| `/en/portal` | Partner portal. Sign in as any approved partner company; no password is checked |

The floating **Prototype** button, bottom corner of every page, switches between the hub, the website, the admin and the partner portal. It can also change the language and reset the demo data.

## How the mock data works

- `lib/mock/seed/*` holds deterministic bilingual seed data: 8 services, 25 partners, 128 leads, plus orders, dues, reviews and so on.
- `lib/mock/store.ts` is a Zustand store persisted to `localStorage`. All three surfaces read and write the same store, so actions cross surfaces. A submitted lead appears in the admin and in the partner shop, a lead a partner buys appears in the admin shop orders, an approved partner appears in the public directory, and a CMS edit updates the site.
- `lib/mock/api.ts` simulates network latency. This is the swap-in point for the real API.

## Structure

```
app/[locale]/(site)/…        website routes
app/[locale]/admin/…         admin (login + (panel) modules)
app/[locale]/portal/…        partner portal (login + (panel) screens)
app/[locale]/hub             prototype hub
components/ui                design-system primitives (RTL-safe)
components/site · admin      surface components (DataTable, SchemaEditor, shell…)
messages/defs/*              all UI copy as [EN, AR] pairs
docs/ecosystem.md            ecosystem analysis and refactor rationale
```
