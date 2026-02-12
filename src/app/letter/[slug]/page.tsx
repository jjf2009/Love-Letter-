"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useHashParam } from "@/hooks/useHashParam";
import { decryptLetter, type DecryptedLetter } from "@/lib/letters";

type Result = { slug: string; key: string; letter: DecryptedLetter };
type DecryptError = { slug: string; key: string; message: string };

export default function LetterPage({ params }: { params: { slug: string } }) {
  const keyParam = useHashParam("key");
  const key =
    typeof keyParam === "string" && keyParam.length > 0
      ? keyParam
      : keyParam === undefined
        ? undefined
        : null;

  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<DecryptError | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const missingKey = useMemo(() => key === null, [key]);
  const isReady = useMemo(
    () => result?.slug === params.slug && result.key === key,
    [key, params.slug, result]
  );
  const errorMessage = useMemo(() => {
    if (!error) return null;
    if (error.slug !== params.slug) return null;
    if (error.key !== key) return null;
    return error.message;
  }, [error, key, params.slug]);

  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  useEffect(() => {
    if (key === undefined || key === null) return;

    let cancelled = false;
    decryptLetter({ slug: params.slug, key })
      .then((letter) => {
        if (cancelled) {
          letter.cleanup();
          return;
        }

        cleanupRef.current?.();
        cleanupRef.current = letter.cleanup;
        setError(null);
        setResult({ slug: params.slug, key, letter });
      })
      .catch((err) => {
        if (cancelled) return;
        setResult(null);
        setError({
          slug: params.slug,
          key,
          message: err instanceof Error ? err.message : "Failed to decrypt letter.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [key, params.slug]);

  if (key === undefined) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-white/70 p-8 shadow-sm ring-1 ring-black/5">
          <div className="h-6 w-40 rounded-lg skeleton" />
          <div className="mt-4 h-4 w-3/5 rounded-lg skeleton" />
          <div className="mt-2 h-4 w-2/3 rounded-lg skeleton" />
        </div>
      </div>
    );
  }

  if (missingKey) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        Missing decryption key. Make sure the URL includes `#key=...`.
      </div>
    );
  }

  if (!isReady && !errorMessage) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-white/70 p-8 shadow-sm ring-1 ring-black/5">
          <div className="h-6 w-40 rounded-lg skeleton" />
          <div className="mt-4 h-4 w-3/5 rounded-lg skeleton" />
          <div className="mt-2 h-4 w-2/3 rounded-lg skeleton" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-3xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        {errorMessage}
      </div>
    );
  }

  const letter = result!.letter;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-white/70 p-8 shadow-sm ring-1 ring-black/5">
        <div className="text-sm font-semibold text-slate-900">A letter for you</div>
        <TypewriterText text={letter.message} />
      </section>

      {letter.imageUrls.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {letter.imageUrls.map((url) => (
            <div
              key={url}
              className="animate-fade-in-up overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5"
            >
              <img src={url} alt="Decrypted" className="aspect-square w-full object-cover" />
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function TypewriterText(props: { text: string }) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    setVisible("");
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setVisible(props.text.slice(0, i));
      if (i >= props.text.length) window.clearInterval(id);
    }, 14);
    return () => window.clearInterval(id);
  }, [props.text]);

  return (
    <p className="mt-4 whitespace-pre-wrap text-pretty text-base leading-7 text-slate-900">
      {visible}
      <span className="inline-block w-2 align-baseline" aria-hidden>
        {visible.length < props.text.length ? "|" : ""}
      </span>
    </p>
  );
}
