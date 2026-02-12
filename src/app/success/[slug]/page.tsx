"use client";

import { useMemo } from "react";

import { CopyButton } from "@/components/CopyButton";
import { QrCodeCard } from "@/components/QrCodeCard";
import { useHashParam } from "@/hooks/useHashParam";

export default function SuccessPage({ params }: { params: { slug: string } }) {
  const key = useHashParam("key");

  const magicLink = useMemo(() => {
    if (!key) return null;

    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL ?? "");

    return `${origin}/letter/${params.slug}#key=${key}`;
  }, [key, params.slug]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Letter created</h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Keep this link safe. Anyone with it can decrypt the letter.
        </p>
      </div>

      {key === undefined ? (
        <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5">
          <div className="h-5 w-28 rounded-lg skeleton" />
          <div className="mt-4 h-10 rounded-2xl skeleton" />
        </div>
      ) : !magicLink ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Missing decryption key. Make sure the URL includes `#key=...`.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5">
            <div className="text-sm font-semibold text-slate-900">Magic link</div>
            <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-900 shadow-sm ring-1 ring-black/5">
              <div className="break-all">{magicLink}</div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <CopyButton value={magicLink} />
              <a
                href={`/letter/${params.slug}#key=${key}`}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-black/5 hover:bg-white/80"
              >
                Open it
              </a>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-600">
              The key is stored after the `#` symbol and is never sent to the server.
            </p>
          </div>

          <QrCodeCard value={magicLink} />
        </div>
      )}
    </div>
  );
}
