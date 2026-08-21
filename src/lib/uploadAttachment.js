import { supabase } from "./supabaseClient";

export async function uploadAttachment(file, userId, folder) {
  if (!file) {
    return {
      url: null,
      error: null,
    };
  }

  if (!file.type.startsWith("image/")) {
    return {
      url: null,
      error: new Error("Please choose an image file."),
    };
  }

  if (file.size > 8 * 1024 * 1024) {
    return {
      url: null,
      error: new Error("Image must be smaller than 8 MB."),
    };
  }

  const safeExtension = (file.name.split(".").pop() || "jpg").toLowerCase();

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
