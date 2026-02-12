import { NextResponse } from 'next/server';

import { STORAGE_BUCKET } from '@/lib/constants';
import { imageObjectPath, messageObjectPath } from '@/lib/letters/storagePaths';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SignedUploadRequest = {
  storagePath: string;
};

type LetterRow = {
  storage_path: string;
  metadata: {
    imageCount?: number;
  } | null;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SignedUploadRequest | null;
  if (!body || typeof body.storagePath !== 'string' || !UUID_RE.test(body.storagePath)) {
    return NextResponse.json({ error: 'Invalid body. Expected { storagePath: uuid }' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('storage_path, metadata')
    .eq('storage_path', body.storagePath)
    .maybeSingle();

  if (letterError) {
    return NextResponse.json({ error: letterError.message }, { status: 500 });
  }

  if (!letter) {
    return NextResponse.json({ error: 'Unknown storagePath' }, { status: 404 });
  }

  const row = letter as unknown as LetterRow;
  const metadata = row.metadata ?? {};
  const imageCount = Number(metadata.imageCount ?? 0);
  if (!Number.isInteger(imageCount) || imageCount < 1 || imageCount > 10) {
    return NextResponse.json({ error: 'Invalid letter metadata.imageCount' }, { status: 500 });
  }

  const paths = [
    messageObjectPath(body.storagePath),
    ...Array.from({ length: imageCount }, (_, i) => imageObjectPath(body.storagePath, i)),
  ];

  const results = await Promise.all(
    paths.map(async (path) => {
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
