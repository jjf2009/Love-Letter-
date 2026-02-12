"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ImageUploader, type ImageUploaderImage } from "@/components/ImageUploader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { createEncryptedLetter } from "@/lib/letters";

export default function CreatePage() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [images, setImages] = useState<ImageUploaderImage[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imagesRef = useRef<ImageUploaderImage[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      for (const img of imagesRef.current) URL.revokeObjectURL(img.previewUrl);
    };
  }, []);

  const isValid = useMemo(() => message.trim().length > 0 && images.length > 0, [message, images.length]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const result = await createEncryptedLetter({
        message,
        images: images.map((i) => i.file),
      });

      router.push(`/success/${result.slug}#key=${result.key}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create letter.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Create a letter</h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Your content is encrypted before upload. Share the magic link on the next
          screen.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5">
          <label className="block text-sm font-semibold text-slate-900" htmlFor="message">
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isCreating}
            maxLength={10_000}
            className="mt-3 min-h-48 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 shadow-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
            placeholder="Write your message..."
          />
          <div className="mt-2 text-xs text-slate-600">{message.length} / 10,000</div>
        </div>

        <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5">
          <div className="text-sm font-semibold text-slate-900">Images</div>
          <div className="mt-4">
            <ImageUploader
              images={images}
              onChange={setImages}
              maxImages={10}
              disabled={isCreating}
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!isValid || isCreating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
        >
          {isCreating ? (
            <>
              <LoadingSpinner />
              Encrypting and uploading...
            </>
          ) : (
            "Create encrypted letter"
          )}
        </button>
      </form>
    </div>
  );
}
