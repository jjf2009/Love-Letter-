import { NextResponse } from 'next/server';

import { STORAGE_BUCKET } from '@/lib/constants';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type SignedDownloadRequest = {
  paths: string[];
  expiresIn?: number;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SignedDownloadRequest | null;
  if (!body || !Array.isArray(body.paths) || body.paths.length === 0) {
    return NextResponse.json({ error: 'Invalid body. Expected { paths: string[] }' }, { status: 400 });
  }

  const expiresIn = typeof body.expiresIn === 'number' && body.expiresIn > 0 ? body.expiresIn : 60;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(body.paths, expiresIn);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'No signed URL data returned' }, { status: 500 });
  }

  const downloads = body.paths.map((path, i) => {
    const item = data[i];
    if (!item) return { path, signedUrl: null, error: 'Missing signed URL entry' };
    return {
      path,
      signedUrl: item.signedUrl ?? null,
      error: item.error,
    };
  });

  const hasAnyError = downloads.some((d) => d.error);
  if (hasAnyError) {
    return NextResponse.json({ error: 'Failed to create one or more signed URLs', downloads }, { status: 500 });
  }

  return NextResponse.json({ downloads });
}
