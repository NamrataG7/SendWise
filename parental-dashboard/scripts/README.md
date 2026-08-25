# SendWise dev/demo seeder

Pre-populates a parent account with a demo child and realistic-looking
violations so a fresh deploy renders a working **Fig 3** dashboard out of the
box (paper reproducibility).

> ⚠️ **This is a dev/demo tool.** The endpoint returns **404 in production**
> unless `ALLOW_SEED=true`, and always requires the `x-seed-token` header.
> **Remove or leave `ALLOW_SEED` unset for real production launches.**

---

## What it does

`POST /api/dev/seed` will:

1. Compute a deterministic demo `user_id_hash = sha256(parent_email + "-demo-child-1")[:64]`.
2. `SADD` it to `parent:{parent_email lowercased}:children` (same key the real
   pairing flow writes to — the dashboard picks it up transparently).
3. `DEL` any prior `violations:{user_id_hash}` list (idempotent re-runs).
4. Generate `num_violations` violation records spread across the past
   `days_range` days, recency-weighted, with schema-valid category / severity
   / action distributions.
5. `LPUSH` them into `violations:{user_id_hash}` and cap at 1000.

Response:

```json
{ "ok": true, "user_id_hash": "…", "seeded": 40, "parent": "parent@example.com", "child": "Demo Child" }
```

---

## Request body

| Field            | Type   | Default        | Notes                                    |
|------------------|--------|----------------|------------------------------------------|
| `parent_email`   | string | **required**   | Lowercased before use as the Redis key.  |
| `child_name`     | string | `Demo Child`   | Cosmetic label, not persisted on records.|
| `num_violations` | number | `40`           | Clamped to `[1, 500]`.                   |
| `days_range`     | number | `30`           | Clamped to `[1, 365]`.                   |

---

## Local dev

```bash
# 1) Set the token (matches parental-dashboard/.env.local)
export SEED_TOKEN=changeme-dev-seed-token

# 2) Start the dashboard
npm --prefix parental-dashboard run dev

# 3) Seed
curl -X POST http://localhost:3000/api/dev/seed \
  -H "x-seed-token: $SEED_TOKEN" \
  -H "content-type: application/json" \
  -d '{"parent_email":"parent@example.com"}'
```

Now sign up (or log in) at http://localhost:3000/signup with the same email
you passed as `parent_email` — the seeder resolves it to your Supabase user
UUID (requires `SUPABASE_SERVICE_ROLE_KEY`), or pass `parent_id` directly
instead. Fig 3 should render once you sign in.

## Vercel demo deploy

Set the following env vars in the Vercel project:

- `SEED_TOKEN` — any random string
- `ALLOW_SEED=true` — **only for the demo/screenshot deploy**

Then:

```bash
curl -X POST https://sendwise.vercel.app/api/dev/seed \
  -H "x-seed-token: $SEED_TOKEN" \
  -H "content-type: application/json" \
  -d '{"parent_email":"parent@example.com","num_violations":40,"days_range":30}'
```

---

## Standalone generator (no Redis writes)

The generator can also run offline — useful for inspecting exactly what will be
seeded or for use in tests:

```bash
# From parental-dashboard/
npx tsx scripts/generate-seed-data.ts parent@example.com 40 30 | jq .
```

Args (all optional): `<parent_email> <num_violations> <days_range>`.

The PRNG is seeded (mulberry32) so the same inputs always produce the same
output — safe for paper figure reproducibility.

---

## Disabling in production

Two independent gates, either one disables the endpoint:

1. **Route handler** — returns `404` when
   `NODE_ENV === 'production' && ALLOW_SEED !== 'true'`.
2. **Middleware** — same check, short-circuits the request before it even
   reaches the route.

**Recommended for real launch:** unset `ALLOW_SEED` (or set it to anything
other than `'true'`) and rotate `SEED_TOKEN`. To remove the endpoint
entirely, delete:

- `parental-dashboard/app/api/dev/`
- `parental-dashboard/scripts/generate-seed-data.ts`
- the `/api/dev/*` block in `parental-dashboard/middleware.ts`
- the `SEED_TOKEN` / `ALLOW_SEED` lines from `.env.example`

---

## Note on categories

The paper's canonical 5-category taxonomy is:

    harassment, threats, hate_speech, sexual_content, self_harm

These are the values enforced by `lib/schema.ts` `IncidentCategoryEnum` and
therefore the only ones the dashboard renders. Distribution used by the
seeder:

| Category           | Weight |
|--------------------|--------|
| `harassment`       | 40%    |
| `threats`          | 20%    |
| `hate_speech`      | 20%    |
| `sexual_content`   | 12%    |
| `self_harm`        |  8%    |

Severity: `medium` 55 / `high` 30 / `low` 15.
Action: `edited` 55 / `sent_anyway` 35 / `cancelled` 8 / `blocked` 2.
