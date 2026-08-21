import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { uploadAttachment } from "../../lib/uploadAttachment";

function News({ news, profile, reload, onLogAction }) {
  const [title, setTitle] = useState("");

  const [content, setContent] = useState("");

  const [imageFile, setImageFile] = useState(null);

  const [imagePreview, setImagePreview] = useState("");

  const [editingNews, setEditingNews] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  const [publishing, setPublishing] = useState(false);

  const [search, setSearch] = useState("");

  const [sortOrder, setSortOrder] = useState("newest");

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    setImageFile(file);

    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview("");
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");

    const fileInputs = document.querySelectorAll('input[type="file"]');

    fileInputs.forEach((input) => {
      input.value = "";
    });
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImageFile(null);
    setImagePreview("");
    setEditingNews(null);
  };

  const beginEdit = (item) => {
    setEditingNews(item);
    setTitle(item.title || "");
    setContent(item.content || "");
    setImageFile(null);
    setImagePreview(item.image_url || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const publish = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert("Enter a title and content.");

      return;
    }

    setPublishing(true);

    try {
      let imageUrl = editingNews?.image_url || null;

      if (imageFile) {
        const { url, error: uploadError } = await uploadAttachment(
          imageFile,
          profile.id,
          "news",
        );

        if (uploadError) {
          alert(uploadError.message);

          return;
        }

        imageUrl = url;
      }

      let error = null;

      if (editingNews) {
        const result = await supabase
          .from("news")
          .update({
            title: title.trim(),
            content: content.trim(),
            image_url: imageUrl,
          })
          .eq("id", editingNews.id);

        error = result.error;
      } else {
        const result = await supabase.from("news").insert({
          title: title.trim(),
          content: content.trim(),
          published_by: profile.id,
          image_url: imageUrl,
        });

        error = result.error;
      }

      if (error) {
        alert(error.message);

        return;
      }

      if (onLogAction) {
        await onLogAction({
          action: editingNews ? "NEWS_EDITED" : "NEWS_PUBLISHED",
          details: editingNews
            ? `Edited news: ${title.trim()}${
                imageFile ? " and replaced the image." : "."
              }`
            : `Published news: ${title.trim()}${
                imageUrl ? " with an attached image." : "."
              }`,
        });
      }

      resetForm();
      await reload();
    } finally {
      setPublishing(false);
    }
  };

  const deleteNews = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) {
      return;
    }

    setDeletingId(item.id);

    const { error } = await supabase.from("news").delete().eq("id", item.id);

    if (error) {
      alert(error.message);

      setDeletingId(null);
      return;
    }

    if (onLogAction) {
      await onLogAction({
        action: "NEWS_DELETED",
        details: `Deleted news: ${item.title}`,
      });
    }

    if (editingNews?.id === item.id) {
      resetForm();
    }

    await reload();

    setDeletingId(null);
  };

  const filteredNews = [...news]
    .filter((item) => {
      const searchable = [item.title, item.content]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !search.trim() || searchable.includes(search.trim().toLowerCase());
    })
    .sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();

      const bDate = new Date(b.created_at || 0).getTime();

      return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
        <div className="nexus-glow-cyan w-72 h-72 -top-20 -right-20" />
        <div className="nexus-glow-purple w-72 h-72 -bottom-20 -left-20" />

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="nexus-text-ocean text-xs font-bold uppercase tracking-wider">
              Club Updates
            </p>

            <h2 className="text-3xl font-black mt-1">
              News &{" "}
              <span className="nexus-text-aurora">Announcements</span>
            </h2>

            <p className="text-gray-500 mt-2">
              Publish updates and keep members informed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="nexus-glass-flat rounded-2xl px-4 py-3">
              <p className="text-gray-500 text-xs uppercase font-bold">
                Total
              </p>

              <p className="text-2xl font-black mt-1">{news.length}</p>
            </div>

            <div className="nexus-stat nexus-stat-stat-cyan rounded-2xl px-4 py-3">
              <p className="text-cyan-300 text-xs uppercase font-bold">
                Showing
              </p>

              <p className="text-2xl font-black mt-1 text-cyan-300">
                {filteredNews.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[0.85fr_1.15fr] gap-7 items-start">
        {/* Publish / Edit */}
        <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-yellow-400/10 blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
                {editingNews ? "Edit Announcement" : "New Announcement"}
              </p>

              <h3 className="text-2xl font-black mt-1">
                {editingNews ? "Update News" : "Publish News"}
              </h3>
            </div>

            {editingNews && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-500 hover:text-white"
              >
                Cancel edit
              </button>
            )}
          </div>

          <form onSubmit={publish} className="relative space-y-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="News title"
              className="nexus-input"
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write announcement..."
              rows="8"
              className="nexus-textarea"
            />

            <div className="nexus-glass-flat rounded-2xl p-4">
              <label className="block text-sm text-gray-300 mb-2">
                Attach Picture <span className="text-gray-600">(optional)</span>
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-300"
              />

              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="News preview"
                    className="w-full max-h-64 object-cover rounded-xl nexus-image-frame"
                  />

                  <button
                    type="button"
                    onClick={clearImage}
                    className="mt-2 text-sm text-red-300 hover:text-red-200"
                  >
                    Remove picture
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={publishing}
              className="nexus-morphic-button w-full py-3.5 disabled:opacity-50"
            >
              {publishing
                ? editingNews
                  ? "Saving..."
                  : "Publishing..."
                : editingNews
                  ? "Save Changes"
                  : "Publish"}
            </button>
          </form>
        </section>

        {/* Published news */}
        <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <p className="text-gray-500 text-sm">Published</p>

              <h3 className="text-2xl font-black mt-1">News Archive</h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search news..."
                className="nexus-input text-sm"
              />

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="nexus-select text-sm"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>

          {filteredNews.length === 0 ? (
            <div className="rounded-2xl nexus-glass-flat nexus-glass-dashed p-10 text-center">
              <div className="text-4xl">📰</div>

              <p className="text-gray-500 mt-3">
                {news.length === 0
                  ? "No news published yet."
                  : "No news matches your search."}
              </p>

              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-4 nexus-text-aurora text-sm font-bold"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNews.map((item) => (
                <article
                  key={item.id}
                  className={`overflow-hidden nexus-glass-flat rounded-2xl transition hover:-translate-y-0.5 ${
                    editingNews?.id === item.id
                      ? "nexus-glass-selected"
                      : "nexus-glass-hover"
                  }`}
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title || "News attachment"}
                      className="w-full max-h-80 object-cover"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="font-black text-xl">
                          {item.title}
                        </h4>

                        {item.created_at && (
                          <p className="text-gray-500 text-xs mt-1.5">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => beginEdit(item)}
                          className="px-3 py-2 rounded-lg nexus-glass-flat nexus-glass-hover text-xs"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteNews(item)}
                          disabled={deletingId === item.id}
                          className="nexus-morphic-button-danger px-3 py-2 text-xs disabled:opacity-50"
                        >
                          {deletingId === item.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm mt-4 whitespace-pre-wrap leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default News;
