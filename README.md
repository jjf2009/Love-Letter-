# Encrypted Love Letters

Send romantic, encrypted letters with images.

The encryption key lives only in the URL fragment (`#key=...`), so it never reaches the server.

## Quick start

```bash
bun install
bun dev
```

Then open http://localhost:3000.

## Environment variables

Create a `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Supabase setup

1. Create a Supabase project.
2. Run the SQL in `supabase/schema.sql`.
3. Create a Storage bucket named `love-letters`.
   - Set it to private.
4. Add storage policies (example in `supabase/storage-policies.sql`).

## Notes

- Anyone with the full magic link can decrypt the letter.
- If you lose the link, you cannot recover the content.
