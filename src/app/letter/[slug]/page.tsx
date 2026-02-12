'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { decryptBytes, decryptText, importKeyFromBase64Url } from '@/lib/crypto';
import { imageObjectPath, messageObjectPath } from '@/lib/letters/storagePaths';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

function getKeyFromHash(): string | null {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.get('key');
}

type LetterRow = {
  id: string;
  slug: string;
  storage_path: string;
  metadata: {
    imageCount?: number;
    imageMimeType?: string;
  };
};

type SignedDownload = { path: string; signedUrl: string | null; error: string | null };

export default function LetterPage() {
  const params = useParams<{ slug: string }>();

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; message: string; imageUrls: string[] }
  >({ status: 'loading' });

  useEffect(() => {
    let revoked: string[] = [];
    let cancelled = false;

    (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const keyBase64Url = getKeyFromHash();
        if (!keyBase64Url) {
          setState({ status: 'error', message: 'Missing decryption key in the URL.' });
          return;
        }

        const key = await importKeyFromBase64Url(keyBase64Url);

        const { data: letter, error } = await supabase
          .from('letters')
          .select('id, slug, storage_path, metadata')
          .eq('slug', params.slug)
          .single();

        if (error || !letter) {
          setState({ status: 'error', message: 'Letter not found.' });
          return;
        }

        const typedLetter = letter as LetterRow;
        const imageCount = typedLetter.metadata?.imageCount ?? 0;
        const imageMimeType = typedLetter.metadata?.imageMimeType ?? 'image/jpeg';

        const paths = [
          messageObjectPath(typedLetter.storage_path),
          ...Array.from({ length: imageCount }, (_, i) => imageObjectPath(typedLetter.storage_path, i)),
        ];

        const signedDownloadRes = await fetch('/api/storage/signed-download', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ paths, expiresIn: 60 }),
        });

        if (!signedDownloadRes.ok) {
          throw new Error('Failed to create download URLs');
        }

        const signedDownloadJson = (await signedDownloadRes.json()) as { downloads: SignedDownload[] };
        const urlByPath = new Map(signedDownloadJson.downloads.map((d) => [d.path, d.signedUrl]));

        const messageUrl = urlByPath.get(messageObjectPath(typedLetter.storage_path));
        if (!messageUrl) throw new Error('Missing message URL');

        const messagePacked = new Uint8Array(await (await fetch(messageUrl)).arrayBuffer());
        const decryptedMessage = await decryptText(messagePacked, key);

        const imageUrls: string[] = [];
        for (let i = 0; i < imageCount; i++) {
          const path = imageObjectPath(typedLetter.storage_path, i);
          const signedUrl = urlByPath.get(path);
          if (!signedUrl) continue;

          const packed = new Uint8Array(await (await fetch(signedUrl)).arrayBuffer());
          const bytes = await decryptBytes(packed, key);
          const blob = new Blob([bytes], { type: imageMimeType });
          const objectUrl = URL.createObjectURL(blob);
          imageUrls.push(objectUrl);
          revoked.push(objectUrl);
        }

        if (cancelled) return;
        setState({ status: 'ready', message: decryptedMessage, imageUrls });
      } catch (err) {
        if (cancelled) return;
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to decrypt letter.' });
      }
    })();

    return () => {
      cancelled = true;
      revoked.forEach((u) => URL.revokeObjectURL(u));
      revoked = [];
    };
  }, [params.slug]);

  if (state.status === 'loading') {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-md border border-neutral-200 bg-white p-6">Decrypting…</div>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-6 text-red-800">{state.message}</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="space-y-6">
        {state.imageUrls.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {state.imageUrls.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="Decrypted" className="w-full rounded-md" />
            ))}
          </div>
        ) : null}

        <div className="whitespace-pre-wrap rounded-md border border-neutral-200 bg-white p-6 text-lg leading-relaxed">
          {state.message}
        </div>
      </div>
    </main>
  );
}
