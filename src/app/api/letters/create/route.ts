import { NextResponse } from 'next/server';

import { STORAGE_BUCKET } from '@/lib/constants';
import { imageObjectPath, messageObjectPath } from '@/lib/letters/storagePaths';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z]+-[a-z]+-[a-z0-9]{4}$/;

type CreateLetterRequest = {
  storagePath: string;
  slug: string;
  imageCount: number;
  imageMimeType: string;
};

type PostgrestErrorLike = { code?: string; message: string };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CreateLetterRequest | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!UUID_RE.test(body.storagePath)) {
    return NextResponse.json({ error: 'Invalid storagePath (expected UUID)' }, { status: 400 });
  }

  if (!SLUG_RE.test(body.slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  if (!Number.isInteger(body.imageCount) || body.imageCount < 1 || body.imageCount > 10) {
    return NextResponse.json({ error: 'Invalid imageCount (expected 1-10)' }, { status: 400 });
  }

  if (typeof body.imageMimeType !== 'string' || body.imageMimeType.length === 0) {
    return NextResponse.json({ error: 'Invalid imageMimeType' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { error: insertError } = await supabase.from('letters').insert({
    id: body.storagePath,
    slug: body.slug,
    storage_path: body.storagePath,
    metadata: {
      imageCount: body.imageCount,
      imageMimeType: body.imageMimeType,
    },
  });

  if (insertError) {
    // Postgres unique violation (slug collision)
    if ((insertError as unknown as PostgrestErrorLike).code === '23505') {
      return NextResponse.json({ error: 'Slug collision' }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const paths = [
    messageObjectPath(body.storagePath),
    ...Array.from({ length: body.imageCount }, (_, i) => imageObjectPath(body.storagePath, i)),
  ];

  const uploads = await Promise.all(
    paths.map(async (path) => {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path);
      if (error || !data) return { path, token: null, error: error?.message ?? 'Unknown error' };
      return { path, token: data.token, error: null };
    }),
  );

  const hasAnyError = uploads.some((u) => u.error);
  if (hasAnyError) {
    return NextResponse.json({ error: 'Failed to create signed upload URL(s)', uploads }, { status: 500 });
  }

  return NextResponse.json({ storagePath: body.storagePath, slug: body.slug, uploads });
}
