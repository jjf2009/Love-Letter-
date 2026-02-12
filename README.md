# Encrypted Love Letters

Send romantic, end-to-end encrypted letters (message + images) using a magic link where the decryption key lives in the URL fragment (`#key=...`).

## Quick start

1. Install deps

```bash
npm i
```

2. Create `.env.local`

```bash
cp .env.example .env.local
```

Make sure you set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` as well as the `NEXT_PUBLIC_*` vars.

3. Run the dev server

```bash
npm run dev
```

## Security model (high level)

- Encryption/decryption happens client-side via Web Crypto (AES-256-GCM).
- The server should never receive or store encryption keys.
- Encrypted blobs are stored in Supabase Storage.
- Letter metadata is stored in Supabase Postgres.

