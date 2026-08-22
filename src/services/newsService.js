import { supabase } from "../lib/supabaseClient";
import { uploadAttachment } from "../lib/uploadAttachment";

export const uploadNewsAttachment = (file, userId) =>
  uploadAttachment(file, userId, "news");

export const updateNews = (newsId, payload) =>
  supabase.from("news").update(payload).eq("id", newsId);

export const createNews = (payload) => supabase.from("news").insert(payload);

export const deleteNews = (newsId) =>
  supabase.from("news").delete().eq("id", newsId);

export default {
  uploadNewsAttachment,
  updateNews,
  createNews,
  deleteNews,
};
