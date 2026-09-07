import { supabase } from "./supabaseClient";

// Raster image types we accept. SVG is deliberately excluded: it can carry
// inline <script>, and once stored it is served from the bucket origin as an
// active document, not an inert image.
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

export async function uploadAttachment(file, userId, folder) {
  if (!file) {
    return {
      url: null,
      error: null,
    };
  }

  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return {
      url: null,
      error: new Error("Please choose a PNG, JPG, GIF or WebP image."),
    };
  }

  if (file.size > 8 * 1024 * 1024) {
    return {
      url: null,
      error: new Error("Image must be smaller than 8 MB."),
    };
  }

  // Derived from an untrusted filename, so it is pinned to a known-safe value
  // rather than trusted — this is what keeps the storage key well-formed and
  // free of injected path segments.
  const rawExtension = (file.name.split(".").pop() || "").toLowerCase();
  const safeExtension = ALLOWED_EXTENSIONS.includes(rawExtension)
    ? rawExtension
    : "jpg";

  const filePath = `${folder}/${userId}/${crypto.randomUUID()}.${safeExtension}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      url: null,
      error: uploadError,
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("attachments").getPublicUrl(filePath);

  if (!publicUrl) {
    return {
      url: null,
      error: new Error(
        "Image uploaded, but its public URL could not be created.",
      ),
    };
  }

  return {
    url: publicUrl,
    error: null,
  };
}
