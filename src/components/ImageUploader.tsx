"use client";

import { useCallback, useMemo } from "react";

export type ImageUploaderImage = {
  file: File;
  previewUrl: string;
};

const allowedTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const maxSizeBytes = 5 * 1024 * 1024;

export function ImageUploader(props: {
  images: ImageUploaderImage[];
  onChange: (images: ImageUploaderImage[]) => void;
  maxImages: number;
  disabled?: boolean;
}) {
  const { images, onChange, maxImages, disabled } = props;
  const remaining = maxImages - images.length;

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const next: ImageUploaderImage[] = [];
      for (const file of Array.from(files)) {
        if (next.length >= remaining) break;
        if (!allowedTypes.has(file.type)) continue;
        if (file.size > maxSizeBytes) continue;

        next.push({ file, previewUrl: URL.createObjectURL(file) });
      }

      if (next.length === 0) return;
      onChange([...images, ...next]);
    },
    [images, onChange, remaining]
  );

  const onRemove = useCallback(
    (previewUrl: string) => {
      const remaining = images.filter((img) => img.previewUrl !== previewUrl);
      const removed = images.find((img) => img.previewUrl === previewUrl);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      onChange(remaining);
    },
    [images, onChange]
  );

  const helperText = useMemo(() => {
    if (images.length === 0) return "Add 1 to 10 images (max 5MB each before compression).";
    return `${images.length} selected. You can add ${Math.max(0, remaining)} more.`;
  }, [images.length, remaining]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-slate-700">{helperText}</div>
        <label
          className={
            disabled || remaining <= 0
              ? "cursor-not-allowed rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
              : "cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-black/5 hover:bg-white/80"
          }
        >
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={disabled || remaining <= 0}
            onChange={(e) => onFiles(e.target.files)}
          />
          Add images
        </label>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.previewUrl}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
            >
              <img
                src={img.previewUrl}
                alt="Selected"
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(img.previewUrl)}
                className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-900 shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
