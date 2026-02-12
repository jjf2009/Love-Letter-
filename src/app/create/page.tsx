'use client';

import imageCompression from 'browser-image-compression';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { STORAGE_BUCKET } from '@/lib/constants';
import { exportKeyToBase64Url, generateAesGcmKey, encryptBytes, encryptText } from '@/lib/crypto';
import { messageObjectPath, imageObjectPath } from '@/lib/letters/storagePaths';
import { generateSlug } from '@/lib/slug';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

type UploadToken = { path: string; token: string | null; error: string | null };

async function compressImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });

  // `browser-image-compression` can return a Blob.
  return new File([compressed], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
}

export default function CreatePage() {
  const router = useRouter();

  const [message, setMessage] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = message.trim().length > 0 && images.length > 0 && images.length <= 10 && !isCreating;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold">Create an encrypted love letter</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Your message + images are encrypted in your browser. The key is only stored in the link you share.
      </p>

      <form
        className="mt-8 space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);

          if (!canSubmit) return;

          setIsCreating(true);

          try {
            const supabase = createBrowserSupabaseClient();
            const storagePath = crypto.randomUUID();
            const slug = generateSlug();

            const key = await generateAesGcmKey();
            const keyBase64Url = await exportKeyToBase64Url(key);

            const compressedImages = await Promise.all(images.map(compressImage));

            const messagePacked = await encryptText(message.trim(), key);
            const imagePacked = await Promise.all(
              compressedImages.map(async (img) => encryptBytes(new Uint8Array(await img.arrayBuffer()), key)),
            );

            const paths = [
              messageObjectPath(storagePath),
              ...imagePacked.map((_, idx) => imageObjectPath(storagePath, idx)),
            ];

            const signedUploadRes = await fetch('/api/storage/signed-upload', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ paths }),
            });

            if (!signedUploadRes.ok) {
              throw new Error('Failed to create upload URLs');
            }

            const signedUploadJson = (await signedUploadRes.json()) as { uploads: UploadToken[] };
            const tokensByPath = new Map(signedUploadJson.uploads.map((u) => [u.path, u.token]));

            // Upload message
            {
              const path = messageObjectPath(storagePath);
              const token = tokensByPath.get(path);
              if (!token) throw new Error('Missing upload token for message');
              const { error } = await supabase.storage
                .from(STORAGE_BUCKET)
                .uploadToSignedUrl(path, token, new Blob([messagePacked], { type: 'application/octet-stream' }));
              if (error) throw error;
            }

            // Upload images
            for (let i = 0; i < imagePacked.length; i++) {
              const path = imageObjectPath(storagePath, i);
              const token = tokensByPath.get(path);
              if (!token) throw new Error(`Missing upload token for image ${i}`);
              const { error } = await supabase.storage
                .from(STORAGE_BUCKET)
                .uploadToSignedUrl(path, token, new Blob([imagePacked[i]!], { type: 'application/octet-stream' }));
              if (error) throw error;
            }

            // Store metadata (key never stored)
            const { error: insertError } = await supabase.from('letters').insert({
              id: storagePath,
              slug,
              storage_path: storagePath,
              metadata: {
                imageCount: imagePacked.length,
                imageMimeType: 'image/jpeg',
              },
            });

            if (insertError) throw insertError;

            router.push(`/success/${slug}#key=${keyBase64Url}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create letter');
            setIsCreating(false);
          }
        }}
      >
        <div>
          <label className="block text-sm font-medium">Your message</label>
          <textarea
            className="mt-2 w-full rounded-md border border-neutral-300 p-3"
            rows={10}
            value={message}
            maxLength={10000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write something heartfelt..."
            disabled={isCreating}
          />
          <div className="mt-1 text-xs text-neutral-500">{message.length.toLocaleString()} / 10,000</div>
        </div>

        <div>
          <label className="block text-sm font-medium">Images (1–10)</label>
          <input
            className="mt-2 block w-full text-sm"
            type="file"
            accept="image/*"
            multiple
            disabled={isCreating}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setImages(files.slice(0, 10));
            }}
          />

          {images.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-neutral-600">
              {images.map((f) => (
                <li key={`${f.name}-${f.size}`}>{f.name}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <button
          className="rounded-md bg-pink-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={!canSubmit}
        >
          {isCreating ? 'Creating…' : 'Create encrypted letter'}
        </button>
      </form>
    </main>
  );
}
