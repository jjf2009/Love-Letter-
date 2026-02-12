import imageCompression from "browser-image-compression";
import { v4 as uuidv4 } from "uuid";

import { decryptBytes, encryptBytes, exportKeyToBase64Url, generateEncryptionKey, importKeyFromBase64Url } from "@/lib/crypto";
import { generateSlug } from "@/lib/slug";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const bucketName = "love-letters";

type LettersRow = {
  id: string;
  slug: string;
  created_at: string;
  expires_at: string | null;
  view_count: number;
  max_views: number | null;
  storage_path: string;
  metadata: unknown;
  is_deleted: boolean;
};

export type DecryptedLetter = {
  message: string;
  imageUrls: string[];
  metadata: unknown;
  cleanup: () => void;
};

export async function createEncryptedLetter(args: {
  message: string;
  images: File[];
}): Promise<{ slug: string; key: string }> {
  const message = args.message.trim();
  if (message.length === 0) throw new Error("Message cannot be empty.");
  if (message.length > 10_000) throw new Error("Message is too long.");
  if (args.images.length === 0) throw new Error("Add at least one image.");
  if (args.images.length > 10) throw new Error("Maximum 10 images allowed.");

  for (const file of args.images) validateImage(file);

  const supabase = getSupabaseBrowserClient();
  const key = await generateEncryptionKey();
  const keyBase64Url = await exportKeyToBase64Url(key);
  const letterId = uuidv4();
  const storagePath = letterId;

  const uploadedPaths: string[] = [];

  try {
    const encryptedMessage = await encryptBytes(new TextEncoder().encode(message), key);
    await uploadBytes(`${storagePath}/message.enc`, encryptedMessage);
    uploadedPaths.push(`${storagePath}/message.enc`);

    for (let i = 0; i < args.images.length; i++) {
      const compressed = await compressImage(args.images[i]);
      const bytes = new Uint8Array(await compressed.arrayBuffer());
      const encrypted = await encryptBytes(bytes, key);
      const filePath = `${storagePath}/image-${i}.enc`;
      await uploadBytes(filePath, encrypted);
      uploadedPaths.push(filePath);
    }

    const maxSlugRetries = 5;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < maxSlugRetries; attempt++) {
      const slug = generateSlug();

      const { error } = await supabase.from("letters").insert({
        id: letterId,
        slug,
        storage_path: storagePath,
        metadata: { imageCount: args.images.length },
      });

      if (!error) {
        return { slug, key: keyBase64Url };
      }

      lastError = error;
      if (error.code !== "23505") break;
    }

    throw new Error(
      lastError instanceof Error ? lastError.message : "Failed to create letter metadata."
    );
  } catch (err) {
    await removeBestEffort(uploadedPaths);
    throw err;
  }
}

export async function decryptLetter(args: { slug: string; key: string }): Promise<DecryptedLetter> {
  const key = await importKeyFromBase64Url(args.key);
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("letters")
    .select("id, slug, created_at, expires_at, view_count, max_views, storage_path, metadata, is_deleted")
    .eq("slug", args.slug)
    .single();

  if (error || !data) {
    throw new Error("Letter not found.");
  }

  const letter = data as LettersRow;
  if (letter.is_deleted) throw new Error("Letter not found.");
  if (letter.expires_at && new Date(letter.expires_at).getTime() <= Date.now()) {
    throw new Error("This letter has expired.");
  }
  if (letter.max_views != null && letter.view_count >= letter.max_views) {
    throw new Error("This letter has reached its view limit.");
  }

  try {
    await supabase.rpc("increment_view_count", { letter_id: letter.id });
  } catch {
    // Best-effort; view count isn't critical to rendering.
  }

  const encryptedMessageBlob = await downloadBlob(`${letter.storage_path}/message.enc`);
  const encryptedMessageBytes = new Uint8Array(await encryptedMessageBlob.arrayBuffer());
  const messageBuffer = await decryptBytes(encryptedMessageBytes, key);
  const message = new TextDecoder().decode(messageBuffer);

  const imageUrls: string[] = [];
  const cleanup = () => {
    for (const url of imageUrls) URL.revokeObjectURL(url);
  };

  const imageCount = readImageCount(letter.metadata);
  if (imageCount != null) {
    for (let i = 0; i < imageCount; i++) {
      const url = await decryptImageToObjectUrl(`${letter.storage_path}/image-${i}.enc`, key);
      imageUrls.push(url);
    }
  } else {
    for (let i = 0; i < 10; i++) {
      try {
        const url = await decryptImageToObjectUrl(`${letter.storage_path}/image-${i}.enc`, key);
        imageUrls.push(url);
      } catch {
        break;
      }
    }
  }

  return { message, imageUrls, metadata: letter.metadata, cleanup };
}

function validateImage(file: File) {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP allowed.");
  }

  const maxSizeBeforeCompression = 5 * 1024 * 1024;
  if (file.size > maxSizeBeforeCompression) {
    throw new Error("Image too large. Maximum 5MB before compression.");
  }
}

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/jpeg",
  };
  return imageCompression(file, options);
}

async function uploadBytes(path: string, bytes: Uint8Array): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const { error } = await supabase.storage.from(bucketName).upload(path, new Blob([buffer]), {
    contentType: "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function downloadBlob(path: string): Promise<Blob> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.storage.from(bucketName).download(path);
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to download encrypted content.");
  }

  return data;
}

async function decryptImageToObjectUrl(path: string, key: CryptoKey): Promise<string> {
  const encrypted = new Uint8Array(await (await downloadBlob(path)).arrayBuffer());
  const decrypted = await decryptBytes(encrypted, key);
  const blob = new Blob([decrypted], { type: "image/jpeg" });
  return URL.createObjectURL(blob);
}

async function removeBestEffort(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = getSupabaseBrowserClient();
  await supabase.storage.from(bucketName).remove(paths).catch(() => undefined);
}

function readImageCount(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).imageCount;
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}
