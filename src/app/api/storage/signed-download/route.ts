import { NextResponse } from 'next/server';

import { STORAGE_BUCKET } from '@/lib/constants';
import { imageObjectPath, messageObjectPath } from '@/lib/letters/storagePaths';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type SignedDownloadRequest = {
  slug: string;
  expiresIn?: number;
};

type LetterRow = {
  id: string;
  storage_path: string;
  expires_at: string | null;
  view_count: number | null;
  max_views: number | null;
  is_deleted: boolean;
  metadata: {
    imageCount?: number;
    imageMimeType?: string;
  } | null;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SignedDownloadRequest | null;
  if (!body || typeof body.slug !== 'string' || body.slug.length === 0) {
    return NextResponse.json({ error: 'Invalid body. Expected { slug: string }' }, { status: 400 });
  }

  const requestedExpiresIn = typeof body.expiresIn === 'number' ? body.expiresIn : 60;
  const expiresIn = Math.min(300, Math.max(10, requestedExpiresIn));

  const supabase = createServerSupabaseClient();

  const { data: letter, error: letterError } = await supabase
    .from('letters')
    .select('id, storage_path, expires_at, view_count, max_views, is_deleted, metadata')
    .eq('slug', body.slug)
    .maybeSingle();

  if (letterError) {
    return NextResponse.json({ error: letterError.message }, { status: 500 });
  }

  if (!letter) {
    return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
  }

  const row = letter as unknown as LetterRow;
  if (row.is_deleted) {
    return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
  }

  const expiresAt = row.expires_at;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Letter expired' }, { status: 410 });
  }

  const maxViews = row.max_views;
  const viewCount = row.view_count;
  if (maxViews != null && viewCount != null && viewCount >= maxViews) {
    return NextResponse.json({ error: 'View limit reached' }, { status: 410 });
  }

  const metadata = row.metadata ?? {};
  const imageCount = Number(metadata.imageCount ?? 0);
  const imageMimeType = String(metadata.imageMimeType ?? 'image/jpeg');

  const storagePath = row.storage_path;
  const paths = [
    messageObjectPath(storagePath),
    ...Array.from({ length: imageCount }, (_, i) => imageObjectPath(storagePath, i)),
  ];

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrls(paths, expiresIn);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'No signed URL data returned' }, { status: 500 });
  }

  // increment view count (best-effort)
  try {
    await supabase.rpc('increment_view_count', { letter_id: row.id });
  } catch {
    // ignore
  }

  const downloads = paths.map((path, i) => {
    const item = data[i];
    if (!item) return { path, signedUrl: null, error: 'Missing signed URL entry' };
    return { path, signedUrl: item.signedUrl ?? null, error: item.error };
  });

  const hasAnyError = downloads.some((d) => d.error);
  if (hasAnyError) {
    return NextResponse.json({ error: 'Failed to create one or more signed URLs', downloads }, { status: 500 });
  }

  return NextResponse.json({
    imageMimeType,
    messageUrl: downloads[0]?.signedUrl ?? null,
    imageUrls: downloads.slice(1).map((d) => d.signedUrl).filter((u): u is string => !!u),
  });
}
