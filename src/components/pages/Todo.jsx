import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { uploadAttachment } from "../../lib/uploadAttachment";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { Checkbox } from "../ui/Checkbox.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Icon } from "../ui/Icon.jsx";
import { IconButton } from "../ui/IconButton.jsx";
import { Panel } from "../ui/Panel.jsx";
import { Progress } from "../ui/Progress.jsx";
import { SearchInput } from "../ui/SearchInput.jsx";
import { Select } from "../ui/Select.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { StatCard } from "../ui/StatCard.jsx";
import { TextArea } from "../ui/TextArea.jsx";
import { TextInput } from "../ui/TextInput.jsx";
import { FileButton } from "../ui/FileButton.jsx";
import { useConfirm } from "../ui/confirm-context.js";
import { useToast } from "../ui/toast-context.js";
import { useNow } from "../../hooks/useNow.js";
import { cn } from "../../lib/cn.js";
import {
  countLabel,
  daysUntil,
  formatDate,
  formatDeadline,
  parseDate,
  toDateInputValue,
} from "../../lib/format.js";

/**
 * Club tasks — the shared to-do list, editable by admins and completable by all.
 *
 * Four things were wrong with the old version beyond the styling.
 *
 * `TodoCard` was declared inside the component body, so every keystroke in the
 * search box gave React a brand-new component type and it threw away and rebuilt
 * every card in the list. It lives at module scope now.
 *
 * "Today" and "Overdue" were computed from `new Date().toISOString()`, which is
 * UTC. Anyone not on GMT saw a task flip to overdue at the wrong hour — the
 * exact bug `parseDate` and `daysUntil` exist to prevent. Both now compare local
 * midnights, against a `now` that ticks, so a tab left open overnight is right
 * in the morning.
 *
 * Deleting asked through `window.confirm` and every failure arrived as an
 * `alert()`. Deletion now names the task and lists what it does; failures go to
 * toasts and the editor keeps its own error where the retry button is.
 *
 * And the edit affordances were `opacity-0` until hover, which means they did
 * not exist for touch or keyboard. They are always visible.
 */

const DEADLINE_FILTERS = [
  { key: "all", label: "All deadlines", icon: "tasks" },
  { key: "overdue", label: "Overdue", icon: "alert-triangle" },
  { key: "today", label: "Due today", icon: "clock" },
  { key: "upcoming", label: "Upcoming", icon: "calendar" },
  { key: "no-date", label: "No deadline", icon: "ban" },
];

const SORT_OPTIONS = [
  { value: "deadline", label: "Sort: Deadline" },
  { value: "overdue", label: "Sort: Overdue first" },
  { value: "newest", label: "Sort: Newest" },
  { value: "oldest", label: "Sort: Oldest" },
];

/** True only for a deadline strictly before today, compared at local midnight. */
function isOverdue(value, now) {
  const days = daysUntil(value, now);
  return days !== null && days < 0;
}

/** Which of the deadline filters a task belongs to. */
function bucketOf(todo, now) {
  if (!todo.deadline) return "no-date";
  const days = daysUntil(todo.deadline, now);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  return "upcoming";
}

/**
 * One task.
 *
 * At module scope on purpose — see the note at the top of the file. Everything
 * it needs arrives as a prop, including `now`, so the whole list agrees about
 * what "today" means.
 */
function TodoCard({ todo, isAdmin, now, busy, onToggle, onEdit, onDelete }) {
  const overdue = !todo.completed && isOverdue(todo.deadline, now);
  const dueToday = !todo.completed && daysUntil(todo.deadline, now) === 0;

  return (
    <li
      className={cn(
        "nx-card p-4 sm:p-5",
        todo.completed ? "opacity-70" : "nx-lift",
        overdue && "border-danger-line"
      )}
    >
      <div className="flex items-start gap-3.5">
        <Checkbox
          className="mt-1"
          checked={Boolean(todo.completed)}
          disabled={busy}
          onChange={() => onToggle(todo)}
          aria-label={
            todo.completed
              ? `Mark "${todo.title}" incomplete`
              : `Mark "${todo.title}" complete`
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={cn(
                "font-display text-base leading-snug font-bold tracking-tight",
                todo.completed && "text-ink-subtle line-through"
              )}
            >
              {todo.title}
            </h4>

            {overdue && (
              <Badge tone="danger" size="sm" icon="alert-triangle">
                Overdue
              </Badge>
            )}

            {dueToday && (
              <Badge tone="warn" size="sm" icon="clock">
                Due today
              </Badge>
            )}

            {todo.completed && (
              <Badge tone="success" size="sm" icon="check">
                Completed
              </Badge>
            )}
          </div>

          {todo.description && (
            <p
              className={cn(
                "mt-2 text-[0.8125rem] leading-relaxed whitespace-pre-wrap",
                todo.completed ? "text-ink-subtle" : "text-ink-muted"
              )}
            >
              {todo.description}
            </p>
          )}

          {todo.image_url && (
            <img
              src={todo.image_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="mt-3.5 max-h-72 w-full rounded-control border border-line object-cover"
              // A dead attachment link should leave a tidy card, not a torn-image
              // icon in the middle of the task.
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}

          {todo.deadline && (
            <p
              className={cn(
                "mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] font-semibold",
                overdue
                  ? "border-danger-line bg-danger-soft text-danger"
                  : "border-line bg-well text-ink-muted"
              )}
            >
              <Icon name="calendar" size={12} />
              {overdue ? "Overdue · " : "Due · "}
              {formatDate(todo.deadline)}
              {!todo.completed && (
                <span className="font-normal opacity-70">
                  ({formatDeadline(todo.deadline, now)})
                </span>
              )}
            </p>
          )}
        </div>

        {/* Always visible. Hiding these behind :hover put them out of reach of
            every touch and keyboard user the club has. */}
        {isAdmin && (
          <div className="flex shrink-0 gap-1">
            <IconButton
              icon="pencil"
              label={`Edit "${todo.title}"`}
              size="md"
              disabled={busy}
              onClick={() => onEdit(todo)}
            />
            <IconButton
              icon="trash"
              label={`Delete "${todo.title}"`}
              size="md"
              variant="danger"
              disabled={busy}
              onClick={() => onDelete(todo)}
            />
          </div>
        )}
      </div>
    </li>
  );
}

function Todo({ profile, isAdmin, onLogAction }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const now = useNow();

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [search, setSearch] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline");

  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [titleError, setTitleError] = useState("");
  const [formError, setFormError] = useState("");

  // Needed to clear the picker: without it, choosing a file, removing it, then
  // choosing the same file again fires no `change` event at all.
  const fileInputRef = useRef(null);
  // The blob URL currently on screen, so it can be released before the next one
  // replaces it. Object URLs live until the document unloads otherwise.
  const previewUrlRef = useRef("");

  const setPreview = useCallback((next) => {
    if (previewUrlRef.current && previewUrlRef.current !== next) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = next.startsWith("blob:") ? next : "";
    setImagePreview(next);
  }, []);

  const loadTodos = useCallback(async () => {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("completed", {
        ascending: true,
      })
      .order("deadline", {
        ascending: true,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Todo load error:", error);

      setTodos([]);
    } else {
      setTodos(data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // Intentional fetch-on-mount, paired with a realtime subscription below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTodos();

    const channel = supabase
      .channel("todos-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todos",
        },
        () => {
          loadTodos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTodos]);

  // Release the last preview on unmount — the component can be left while a
  // chosen-but-unsaved image is still on screen.
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDeadline("");
    setImageFile(null);
    setPreview("");
    setEditingTodo(null);
    setShowForm(false);
    setTitleError("");
    setFormError("");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    setImageFile(file);
    setPreview(file ? URL.createObjectURL(file) : "");
  };

  const clearChosenImage = () => {
    setImageFile(null);
    // Falls back to whatever the task already had, so removing a *new* pick does
    // not look like removing the existing attachment.
    setPreview(editingTodo?.image_url || "");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveTodo = async (event) => {
    event.preventDefault();

    setFormError("");

    if (!title.trim()) {
      setTitleError("Please enter a task title.");
      return;
    }

    setTitleError("");
    setSaving(true);

    try {
      let imageUrl = editingTodo?.image_url || null;

      if (imageFile) {
        const { url, error: uploadError } = await uploadAttachment(
          imageFile,
          profile.id,
          "todos"
        );

        if (uploadError) {
          setFormError(uploadError.message);
          return;
        }

        imageUrl = url;
      }

      const taskName = title.trim();

      if (editingTodo) {
        const { error } = await supabase
          .from("todos")
          .update({
            title: taskName,
            description: description.trim(),
            deadline: deadline || null,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingTodo.id);

        if (error) {
          setFormError(error.message);
          return;
        }

        if (onLogAction) {
          await onLogAction({
            action: "TODO_EDITED",
            details: `Edited task: ${taskName}${
              imageFile ? " and attached a new image." : "."
            }`,
          });
        }

        toast.success(`"${taskName}" updated`);
      } else {
        const { error } = await supabase.from("todos").insert({
          title: taskName,
          description: description.trim(),
          deadline: deadline || null,
          image_url: imageUrl,
          created_by: profile.id,
        });

        if (error) {
          setFormError(error.message);
          return;
        }

        if (onLogAction) {
          await onLogAction({
            action: "TODO_CREATED",
            details: `Created task: ${taskName}${
              imageFile ? " with an attached image." : "."
            }`,
          });
        }

        toast.success(`"${taskName}" added to the club list`);
      }

      resetForm();
      await loadTodos();
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (todo) => {
    setEditingTodo(todo);
    setTitle(todo.title || "");
    setDescription(todo.description || "");
    setDeadline(toDateInputValue(todo.deadline));
    setImageFile(null);
    setPreview(todo.image_url || "");
    setShowForm(true);
    setTitleError("");
    setFormError("");

    if (fileInputRef.current) fileInputRef.current.value = "";

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteTodo = async (todo) => {
    const confirmed = await confirm({
      title: `Delete "${todo.title}"?`,
      description:
        "The task is removed from the club list for everyone, straight away.",
      tone: "danger",
      confirmLabel: "Delete task",
      consequences: [
        "Nobody can complete or reopen it afterwards.",
        "Any attached picture stays in storage but stops being reachable.",
        "This cannot be undone — the task would have to be written again.",
      ],
    });

    if (!confirmed) return;

    setBusyId(todo.id);

    const { error } = await supabase.from("todos").delete().eq("id", todo.id);

    if (error) {
      setBusyId(null);
      toast.error("Could not delete the task", { description: error.message });
      return;
    }

    if (onLogAction) {
      await onLogAction({
        action: "TODO_DELETED",
        details: `Deleted task: ${todo.title}`,
      });
    }

    await loadTodos();
    setBusyId(null);

    toast.success(`"${todo.title}" deleted`);
  };

  const toggleComplete = async (todo) => {
    const completed = !todo.completed;

    setBusyId(todo.id);

    const { error } = await supabase
      .from("todos")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", todo.id);

    if (error) {
      setBusyId(null);
      toast.error("Could not update the task", { description: error.message });
      return;
    }

    if (onLogAction) {
      await onLogAction({
        action: completed ? "TODO_COMPLETED" : "TODO_REOPENED",
        targetUserId: profile.id,
        details: completed
          ? `Completed task: ${todo.title}`
          : `Reopened task: ${todo.title}`,
      });
    }

    await loadTodos();
    setBusyId(null);

    toast.success(
      completed ? `"${todo.title}" done` : `"${todo.title}" reopened`
    );
  };

  const activeTodos = useMemo(
    () => todos.filter((todo) => !todo.completed),
    [todos]
  );

  const completedTodos = useMemo(
    () => todos.filter((todo) => todo.completed),
    [todos]
  );

  const dueTodayCount = activeTodos.filter(
    (todo) => daysUntil(todo.deadline, now) === 0
  ).length;

  const overdueCount = activeTodos.filter((todo) =>
    isOverdue(todo.deadline, now)
  ).length;

  const completionPercent =
    todos.length === 0
      ? 0
      : Math.round((completedTodos.length / todos.length) * 100);

  // Per-filter counts, so a chip says how much it will reveal before it is used.
  const bucketCounts = useMemo(() => {
    const tally = {
      all: activeTodos.length,
      overdue: 0,
      today: 0,
      upcoming: 0,
      "no-date": 0,
    };

    for (const todo of activeTodos) tally[bucketOf(todo, now)] += 1;

    return tally;
  }, [activeTodos, now]);

  const filteredActiveTodos = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return activeTodos
      .filter((todo) => {
        const searchable = [todo.title, todo.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !needle || searchable.includes(needle);
        const matchesDeadline =
          deadlineFilter === "all" || bucketOf(todo, now) === deadlineFilter;

        return matchesSearch && matchesDeadline;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return (
            (parseDate(b.created_at)?.getTime() || 0) -
            (parseDate(a.created_at)?.getTime() || 0)
          );
        }

        if (sortBy === "oldest") {
          return (
            (parseDate(a.created_at)?.getTime() || 0) -
            (parseDate(b.created_at)?.getTime() || 0)
          );
        }

        if (sortBy === "overdue") {
          return (
            Number(isOverdue(b.deadline, now)) -
            Number(isOverdue(a.deadline, now))
          );
        }

        // Deadline order, with undated tasks last — an open-ended task is not
        // more urgent than one with a date on it.
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;

        return (
          (parseDate(a.deadline)?.getTime() || 0) -
          (parseDate(b.deadline)?.getTime() || 0)
        );
      });
  }, [activeTodos, search, deadlineFilter, sortBy, now]);

  const filtering = search.trim() !== "" || deadlineFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setDeadlineFilter("all");
  };

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading tasks…</span>

        <Panel pad="md" bodyClassName="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-2 w-full" />
        </Panel>

        <div className="space-y-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="nx-card space-y-2.5 p-5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Panel
        eyebrow="Club Tasks"
        title="To-Do List"
        description={`${countLabel(activeTodos.length, "active task")} · ${
          completedTodos.length
        } completed`}
        icon="tasks"
        actions={
          isAdmin && (
            <Button
              variant="primary"
              size="sm"
              icon="plus"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              Add Task
            </Button>
          )
        }
        bodyClassName="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Progress"
            value={`${completionPercent}%`}
            hint="of every club task"
            icon="trending-up"
            tone="brand"
          />
          <StatCard
            label="Today"
            value={dueTodayCount}
            hint="due before tonight"
            icon="clock"
            tone="warn"
          />
          <StatCard
            label="Overdue"
            value={overdueCount}
            hint="past their deadline"
            icon="alert-triangle"
            tone="danger"
          />
        </div>

        <Progress
          label="Overall completion"
          value={completedTodos.length}
          max={todos.length || 1}
          tone={completionPercent === 100 ? "success" : "brand"}
        />

        <p className="text-[0.75rem] text-ink-subtle">
          <span className="nx-num font-semibold text-ink tabular-nums">
            {completedTodos.length}
          </span>
          /{todos.length} tasks completed
        </p>
      </Panel>

      {isAdmin && showForm && (
        <Panel
          eyebrow={editingTodo ? "Editing" : "New Task"}
          title={editingTodo ? "Edit Task" : "Add Task"}
          icon={editingTodo ? "pencil" : "plus"}
          actions={
            <IconButton
              icon="close"
              label="Close the task editor"
              size="sm"
              onClick={resetForm}
            />
          }
        >
          <form onSubmit={saveTodo} className="space-y-4" noValidate>
            <TextInput
              label="Task title"
              required
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (titleError) setTitleError("");
              }}
              error={titleError || undefined}
              disabled={saving}
            />

            <TextArea
              label="Description"
              optional
              hint="What does done look like? Anyone in the club can pick this up."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              disabled={saving}
            />

            <TextInput
              label="Deadline"
              optional
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              disabled={saving}
              fieldClassName="max-w-56"
            />

            <div className="nx-well space-y-3 p-4">
              <div>
                <p className="text-[0.8125rem] font-semibold">Attach Picture</p>
                <p className="mt-1 text-[0.75rem] text-ink-subtle">
                  Optional. Images only, up to 8 MB.
                </p>
              </div>

              <FileButton
                label={imageFile ? "Choose a different picture" : "Choose a picture"}
                size="sm"
                icon="image"
                accept="image/*"
                inputRef={fileInputRef}
                disabled={saving}
                onChange={handleImageChange}
              />

              {imagePreview && (
                <div>
                  <img
                    src={imagePreview}
                    alt="Task preview"
                    className="max-h-64 w-full rounded-control border border-line object-cover"
                  />

                  {imageFile && (
                    <Button
                      type="button"
                      variant="danger-soft"
                      size="sm"
                      icon="close"
                      className="mt-2.5"
                      disabled={saving}
                      onClick={clearChosenImage}
                    >
                      Remove new picture
                    </Button>
                  )}
                </div>
              )}
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-control border border-danger-line bg-danger-soft px-3 py-2.5 text-[0.8125rem] text-danger"
              >
                <Icon
                  name="alert-triangle"
                  size={15}
                  className="mt-px shrink-0"
                />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              <Button
                type="submit"
                variant="primary"
                icon="check"
                loading={saving}
              >
                {saving
                  ? "Saving..."
                  : editingTodo
                    ? "Save Changes"
                    : "Create Task"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel pad="md" bodyClassName="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_14rem]">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch("")}
            placeholder="Search tasks…"
            label="Search tasks"
            resultCount={filtering ? filteredActiveTodos.length : undefined}
          />

          <Select
            aria-label="Sort tasks"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            options={SORT_OPTIONS}
          />
        </div>

        <div className="nx-scroll-x flex gap-2 pb-1">
          {DEADLINE_FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              className="nx-chip"
              data-active={deadlineFilter === option.key}
              aria-pressed={deadlineFilter === option.key}
              onClick={() => setDeadlineFilter(option.key)}
            >
              <Icon name={option.icon} size={14} />
              {option.label}
              <span className="nx-num tabular-nums opacity-70">
                {bucketCounts[option.key]}
              </span>
            </button>
          ))}
        </div>
      </Panel>

      <section>
        <div className="mb-3.5 flex items-end justify-between gap-3">
          <div>
            <p className="nx-eyebrow">In progress</p>
            <h3 className="nx-display mt-1 text-lg">Active</h3>
          </div>

          <Badge tone="violet">{filteredActiveTodos.length} shown</Badge>
        </div>

        {filteredActiveTodos.length === 0 ? (
          <Panel pad="lg">
            <EmptyState
              icon={filtering ? "search" : "check-circle"}
              title={
                filtering
                  ? "No active tasks match your filters."
                  : "Nothing left to do."
              }
              description={
                filtering
                  ? "Try a shorter search, or clear the filters to see every active task."
                  : "Every club task is finished. New ones will show up here."
              }
              action={
                filtering ? (
                  <Button
                    variant="secondary"
                    icon="close"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          </Panel>
        ) : (
          <ul className="space-y-3">
            {filteredActiveTodos.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                isAdmin={isAdmin}
                now={now}
                busy={busyId === todo.id}
                onToggle={toggleComplete}
                onEdit={beginEdit}
                onDelete={deleteTodo}
              />
            ))}
          </ul>
        )}
      </section>

      {/* A real disclosure: the button owns the state and says so, rather than a
          rotating glyph a screen reader reads as "black right-pointing triangle". */}
      <section className="border-t border-line pt-5">
        <button
          type="button"
          onClick={() => setShowCompleted((current) => !current)}
          aria-expanded={showCompleted}
          aria-controls="completed-tasks"
          className={cn(
            "nx-card nx-lift flex w-full items-center justify-between gap-3 px-5 py-4",
            "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          )}
        >
          <span className="flex items-center gap-3">
            <Icon
              name="chevron-down"
              size={16}
              className={cn(
                "text-brand-text transition-transform duration-[var(--t-fast)]",
                !showCompleted && "-rotate-90"
              )}
            />
            <span className="font-semibold">Completed</span>
            <Badge tone="neutral">{completedTodos.length}</Badge>
          </span>

          <span className="text-[0.8125rem] text-ink-subtle">
            {showCompleted ? "Hide" : "Show"}
          </span>
        </button>

        <div id="completed-tasks" hidden={!showCompleted}>
          {completedTodos.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {completedTodos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  isAdmin={isAdmin}
                  now={now}
                  busy={busyId === todo.id}
                  onToggle={toggleComplete}
                  onEdit={beginEdit}
                  onDelete={deleteTodo}
                />
              ))}
            </ul>
          ) : (
            <p className="py-5 text-center text-[0.8125rem] text-ink-subtle">
              No completed tasks yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default Todo;
