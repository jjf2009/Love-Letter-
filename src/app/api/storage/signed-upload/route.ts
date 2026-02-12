import { NextResponse } from 'next/server';

import { STORAGE_BUCKET } from '@/lib/constants';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type SignedUploadRequest = {
  paths: string[];
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SignedUploadRequest | null;
  if (!body || !Array.isArray(body.paths) || body.paths.length === 0) {
    return NextResponse.json({ error: 'Invalid body. Expected { paths: string[] }' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const results = await Promise.all(
    body.paths.map(async (path) => {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path);
      if (error || !data) return { path, token: null, error: error?.message ?? 'Unknown error' };
      return { path, token: data.token, error: null };
    }),
  );

  const hasAnyError = results.some((r) => r.error);
  if (hasAnyError) {
    return NextResponse.json({ error: 'Failed to create signed upload URL(s)', uploads: results }, { status: 500 });
  }

  return NextResponse.json({ uploads: results });
}
