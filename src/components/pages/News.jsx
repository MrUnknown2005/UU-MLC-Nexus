import { useEffect, useMemo, useRef, useState } from "react";
import {
  createNews,
  deleteNews as deleteNewsRecord,
  updateNews,
  uploadNewsAttachment,
} from "../../services/newsService";
import { Button } from "../ui/Button.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { FileButton } from "../ui/FileButton.jsx";
import { Icon } from "../ui/Icon.jsx";
import { IconButton } from "../ui/IconButton.jsx";
import { Panel } from "../ui/Panel.jsx";
import { SearchInput } from "../ui/SearchInput.jsx";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";
import { TextArea } from "../ui/TextArea.jsx";
import { TextInput } from "../ui/TextInput.jsx";
import { useConfirm } from "../ui/confirm-context.js";
import { useToast } from "../ui/toast-context.js";
import SafeImage from "../common/SafeImage";
import { useNow } from "../../hooks/useNow.js";
import {
  countLabel,
  formatDateTime,
  formatNumber,
  formatRelative,
  truncate,
} from "../../lib/format.js";
import { cn } from "../../lib/cn.js";

/**
 * Publishing club news.
 *
 * Three real bugs are fixed here beyond the visual rewrite.
 *
 * Clearing the image used to run `document.querySelectorAll('input[type=file]')`
 * and blank every file input on the page — including ones belonging to other
 * components. It now holds a ref to its own input.
 *
 * Each preview called `URL.createObjectURL` and never revoked it, so choosing
 * six images leaked six blobs for the life of the session. One ref owns the
 * current blob URL and revokes it before making the next one.
 *
 * And an image, once attached, could not be removed — editing a post always
 * carried the old `image_url` forward. There is now a remove control that means
 * it.
 */
const MAX_TITLE = 120;

const MAX_CONTENT = 4000;

const MAX_IMAGE_MB = 5;

function NewsRow({ item, now, editing, busy, onEdit, onDelete }) {
  return (
    <article
      className={cn(
        "nx-card overflow-hidden transition-colors",
        editing ? "nx-selected" : "nx-lift"
      )}
    >
      {item.image_url && (
        <SafeImage
          src={item.image_url}
          alt={item.title || "News image"}
          ratio="16 / 6"
          className="max-h-56 border-b border-line"
        />
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-[0.9375rem] leading-snug font-semibold">
              {item.title || "Untitled"}
            </h4>

            {item.created_at && (
              <time
                dateTime={item.created_at}
                title={formatDateTime(item.created_at)}
                className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-ink-subtle"
              >
                <Icon name="clock" size={12} />
                {formatRelative(item.created_at, now)}
              </time>
            )}
          </div>

          <div className="flex shrink-0 gap-1.5">
            <IconButton
              icon="pencil"
              label={`Edit "${item.title || "this post"}"`}
              variant="surface"
              size="md"
              onClick={() => onEdit(item)}
            />
            <IconButton
              icon="trash"
              label={`Delete "${item.title || "this post"}"`}
              variant="danger"
              size="md"
              loading={busy}
              onClick={() => onDelete(item)}
            />
          </div>
        </div>

        <p className="mt-3 text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink-muted">
          {item.content}
        </p>
      </div>
    </article>
  );
}

function News({ news = [], profile, reload, onLogAction }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const now = useNow();

  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [imageCleared, setImageCleared] = useState(false);
  const [touched, setTouched] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("newest");

  const fileRef = useRef(null);
  const formRef = useRef(null);
  const blobRef = useRef("");

  // One owner for the blob URL, so a preview is revoked exactly once — when it
  // is replaced, when it is cleared, and when the page goes away.
  const releaseBlob = () => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = "";
    }
  };

  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, []);

  const clearFileInput = () => {
    // Without this the same file cannot be chosen twice in a row: the input
    // holds the old value and fires no change event.
    if (fileRef.current) fileRef.current.value = "";
  };

  const pickImage = (event) => {
    const chosen = event.target.files?.[0] ?? null;

    if (!chosen) return;

    if (!chosen.type.startsWith("image/")) {
      toast.error("That file is not an image", {
        description: "Choose a PNG, JPEG, WebP or GIF.",
      });
      clearFileInput();
      return;
    }

    if (chosen.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error("That image is too large", {
        description: `Keep it under ${MAX_IMAGE_MB} MB — it has to load on a phone.`,
      });
      clearFileInput();
      return;
    }

    releaseBlob();
    blobRef.current = URL.createObjectURL(chosen);

    setFile(chosen);
    setPreview(blobRef.current);
    setImageCleared(false);
  };

  const removeImage = () => {
    releaseBlob();
    clearFileInput();

    setFile(null);
    setPreview("");
    // Editing an existing post: remember that the saved image should go too.
    setImageCleared(Boolean(editing?.image_url));
  };

  const resetForm = () => {
    releaseBlob();
    clearFileInput();

    setEditing(null);
    setTitle("");
    setContent("");
    setFile(null);
    setPreview("");
    setImageCleared(false);
    setTouched(false);
  };

  const beginEdit = (item) => {
    releaseBlob();
    clearFileInput();

    setEditing(item);
    setTitle(item.title || "");
    setContent(item.content || "");
    setFile(null);
    setPreview(item.image_url || "");
    setImageCleared(false);
    setTouched(false);

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const errors = {
    title: !title.trim() ? "A headline is required." : "",
    content: !content.trim() ? "Write something for members to read." : "",
  };

  const valid = !errors.title && !errors.content;

  const publish = async (event) => {
    event.preventDefault();
    setTouched(true);

    if (!valid) return;

    setPublishing(true);

    try {
      let imageUrl = editing && !imageCleared ? (editing.image_url ?? null) : null;

      if (file) {
        const { url, error: uploadError } = await uploadNewsAttachment(
          file,
          profile.id
        );

        if (uploadError) {
          toast.error("The image could not be uploaded", {
            description: uploadError.message,
          });
          return;
        }

        imageUrl = url;
      }

      const payload = {
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl,
      };

      const { error } = editing
        ? await updateNews(editing.id, payload)
        : await createNews({ ...payload, published_by: profile.id });

      if (error) {
        toast.error(
          editing ? "Could not save the changes" : "Could not publish the post",
          { description: error.message }
        );
        return;
      }

      await onLogAction?.({
        action: editing ? "NEWS_EDITED" : "NEWS_PUBLISHED",
        details: editing
          ? `Edited news: ${title.trim()}${file ? " and replaced the image." : "."}`
          : `Published news: ${title.trim()}${imageUrl ? " with an attached image." : "."}`,
      });

      const published = title.trim();
      const wasEditing = Boolean(editing);

      resetForm();
      await reload();

      toast.success(wasEditing ? "Changes saved" : "Published to the club", {
        description: truncate(published, 60),
      });
    } finally {
      setPublishing(false);
    }
  };

  const remove = async (item) => {
    const ok = await confirm({
      title: `Delete "${truncate(item.title || "this post", 48)}"?`,
      tone: "danger",
      confirmLabel: "Delete post",
      description:
        "Members will no longer see it anywhere in the app. This cannot be undone.",
    });

    if (!ok) return;

    setDeletingId(item.id);
    const { error } = await deleteNewsRecord(item.id);

    if (error) {
      setDeletingId(null);
      toast.error("Could not delete the post", { description: error.message });
      return;
    }

    await onLogAction?.({
      action: "NEWS_DELETED",
      details: `Deleted news: ${item.title}`,
    });

    if (editing?.id === item.id) resetForm();

    await reload();
    setDeletingId(null);
    toast.success("The post was deleted");
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return [...news]
      .filter((item) =>
        !needle
          ? true
          : [item.title, item.content]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(needle)
      )
      .sort((a, b) => {
        const left = new Date(a.created_at || 0).getTime();
        const right = new Date(b.created_at || 0).getTime();
        return order === "newest" ? right - left : left - right;
      });
  }, [news, search, order]);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      {/* ---------- Composer ---------- */}
      <Panel
        ref={formRef}
        as="form"
        onSubmit={publish}
        noValidate
        icon={editing ? "pencil" : "newspaper"}
        eyebrow={editing ? "Editing a published post" : "New announcement"}
        title={editing ? "Update this post" : "Publish news"}
        description={
          editing
            ? "Members see the change the next time they open the app."
            : "Goes out to every member's overview immediately."
        }
        actions={
          editing && (
            <Button size="xs" variant="ghost" icon="close" onClick={resetForm}>
              Cancel
            </Button>
          )
        }
        bodyClassName="space-y-4"
        className="xl:sticky xl:top-[calc(var(--topbar-h)+1.25rem)]"
      >
        <TextInput
          label="Headline"
          required
          maxLength={MAX_TITLE}
          placeholder="Datathon results are in"
          value={title}
          error={touched ? errors.title : ""}
          onChange={(event) => setTitle(event.target.value)}
        />

        <TextArea
          label="Announcement"
          required
          rows={9}
          maxLength={MAX_CONTENT}
          placeholder="What happened, when, and what members should do about it."
          value={content}
          error={touched ? errors.content : ""}
          onChange={(event) => setContent(event.target.value)}
        />

        <div className="nx-well p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.8125rem] font-medium">Image</p>
              <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                Optional. Wide images look best.
              </p>
            </div>

            <FileButton
              inputRef={fileRef}
              size="sm"
              icon="image"
              accept="image/*"
              label={preview ? "Replace" : "Choose an image"}
              onChange={pickImage}
            />
          </div>

          {preview && (
            <div className="mt-3">
              <SafeImage
                src={preview}
                alt="Preview of the image attached to this post"
                ratio="16 / 7"
                className="max-h-56 rounded-card border border-line"
              />

              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="truncate text-[0.75rem] text-ink-subtle">
                  {file
                    ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`
                    : "Currently attached"}
                </p>

                <Button
                  size="xs"
                  variant="ghost"
                  icon="trash"
                  onClick={removeImage}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          {imageCleared && (
            <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] text-warn">
              <Icon name="alert-triangle" size={13} />
              The saved image will be removed when you save.
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          icon={editing ? "check" : "send"}
          loading={publishing}
          disabled={touched && !valid}
        >
          {editing ? "Save changes" : "Publish"}
        </Button>
      </Panel>

      {/* ---------- Archive ---------- */}
      <Panel
        icon="inbox"
        eyebrow="Published"
        title="News archive"
        description={
          news.length === 0
            ? undefined
            : search.trim()
              ? `${countLabel(visible.length, "match", "matches")} of ${formatNumber(news.length)}.`
              : countLabel(news.length, "post")
        }
        actions={
          news.length > 1 && (
            <SegmentedControl
              name="news-order"
              label="Sort order"
              size="sm"
              value={order}
              onChange={setOrder}
              options={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
              ]}
            />
          )
        }
        bodyClassName="space-y-4"
      >
        {news.length > 0 && (
          <SearchInput
            value={search}
            onChange={setSearch}
            label="Search news"
            placeholder="Search headlines and text…"
            resultCount={search.trim() ? visible.length : undefined}
          />
        )}

        {news.length === 0 ? (
          <EmptyState
            icon="newspaper"
            title="No news yet"
            description="Publish the first announcement and it appears on every member's overview."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="search"
            title="Nothing matches that search"
            description="Try a shorter term, or clear the search to see every post."
            action={
              <Button
                variant="secondary"
                icon="close"
                onClick={() => setSearch("")}
              >
                Clear search
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {visible.map((item) => (
              <NewsRow
                key={item.id}
                item={item}
                now={now}
                editing={editing?.id === item.id}
                busy={deletingId === item.id}
                onEdit={beginEdit}
                onDelete={remove}
              />
            ))}
          </div>
        )}

        {editing && (
          <p className="flex items-center gap-2 rounded-card border border-brand-line bg-brand-soft/40 px-3 py-2.5 text-[0.8125rem]">
            <Icon name="pencil" size={14} className="shrink-0 text-brand-text" />
            <span className="min-w-0 flex-1 truncate">
              Editing <strong className="font-semibold">{editing.title}</strong>
            </span>
            <Button size="xs" variant="ghost" onClick={resetForm}>
              Stop
            </Button>
          </p>
        )}
      </Panel>
    </div>
  );
}

export default News;
