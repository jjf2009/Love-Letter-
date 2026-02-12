'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

function getKeyFromHash(): string | null {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.get('key');
}

export default function SuccessPage() {
  const params = useParams<{ slug: string }>();
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setKey(getKeyFromHash());
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  const magicLink = useMemo(() => {
    if (!key) return null;
    if (typeof window === 'undefined') return null;
    return `${window.location.origin}/letter/${params.slug}#key=${key}`;
  }, [key, params.slug]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold">Letter created</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Share this link with your loved one. Anyone with the link can read your letter.
      </p>

      {!magicLink ? (
        <div className="mt-6 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          Missing key in the URL fragment. Try going back and creating the letter again.
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4">
            <div className="break-all font-mono text-sm">{magicLink}</div>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white"
                onClick={async () => {
                  await navigator.clipboard.writeText(magicLink);
                }}
              >
                Copy link
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4">
            <div className="text-sm font-medium">QR code</div>
            <div className="mt-3">
              <QRCodeSVG value={magicLink} size={192} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
