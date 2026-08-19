import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { uploadAttachment } from "../../lib/uploadAttachment";

function Todo({ profile, isAdmin, onLogAction }) {
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

  const loadTodos = async () => {
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
  };

  useEffect(() => {
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDeadline("");
    setImageFile(null);
    setImagePreview("");
    setEditingTodo(null);
    setShowForm(false);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    setImageFile(file);

    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview("");
    }
  };

  const saveTodo = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("Please enter a task title.");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = editingTodo?.image_url || null;

      if (imageFile) {
        const { url, error: uploadError } = await uploadAttachment(
          imageFile,
          profile.id,
          "todos",
        );

        if (uploadError) {
          alert(uploadError.message);
          return;
        }

        imageUrl = url;
      }

      if (editingTodo) {
        const { error } = await supabase
          .from("todos")
          .update({
            title: title.trim(),
            description: description.trim(),
            deadline: deadline || null,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingTodo.id);

        if (error) {
          alert(error.message);
          return;
        }

        if (onLogAction) {
          await onLogAction({
            action: "TODO_EDITED",
            details: `Edited task: ${title.trim()}${
              imageFile ? " and attached a new image." : "."
            }`,
          });
        }
      } else {
        const { error } = await supabase.from("todos").insert({
          title: title.trim(),
          description: description.trim(),
          deadline: deadline || null,
          image_url: imageUrl,
          created_by: profile.id,
        });

        if (error) {
          alert(error.message);
          return;
        }

        if (onLogAction) {
          await onLogAction({
            action: "TODO_CREATED",
            details: `Created task: ${title.trim()}${
              imageFile ? " with an attached image." : "."
            }`,
          });
        }
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
    setDeadline(todo.deadline || "");
    setImageFile(null);
    setImagePreview(todo.image_url || "");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteTodo = async (todo) => {
    if (!window.confirm(`Delete "${todo.title}"?`)) {
      return;
    }

    const { error } = await supabase.from("todos").delete().eq("id", todo.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (onLogAction) {
      await onLogAction({
        action: "TODO_DELETED",
        details: `Deleted task: ${todo.title}`,
      });
    }

    await loadTodos();
  };

  const toggleComplete = async (todo) => {
    const completed = !todo.completed;

    const { error } = await supabase
      .from("todos")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", todo.id);

    if (error) {
      alert(error.message);
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
  };

  const activeTodos = todos.filter((todo) => !todo.completed);

  const completedTodos = todos.filter((todo) => todo.completed);

  const isOverdue = (value) => {
    if (!value) {
      return false;
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const due = new Date(`${value}T00:00:00`);

    return due < today;
  };

  const todayString = new Date().toISOString().slice(0, 10);

  const dueTodayCount = activeTodos.filter(
    (todo) => todo.deadline === todayString,
  ).length;

  const overdueCount = activeTodos.filter((todo) =>
    isOverdue(todo.deadline),
  ).length;

  const completionPercent =
    todos.length === 0
      ? 0
      : Math.round((completedTodos.length / todos.length) * 100);

  const filteredActiveTodos = activeTodos
    .filter((todo) => {
      const searchable = [todo.title, todo.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search.trim() || searchable.includes(search.trim().toLowerCase());

      const matchesDeadline =
        deadlineFilter === "all" ||
        (deadlineFilter === "overdue" && isOverdue(todo.deadline)) ||
        (deadlineFilter === "today" && todo.deadline === todayString) ||
        (deadlineFilter === "upcoming" &&
          todo.deadline &&
          !isOverdue(todo.deadline) &&
          todo.deadline !== todayString) ||
        (deadlineFilter === "no-date" && !todo.deadline);

      return matchesSearch && matchesDeadline;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }

      if (sortBy === "oldest") {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }

      if (sortBy === "overdue") {
        return Number(isOverdue(b.deadline)) - Number(isOverdue(a.deadline));
      }

      if (!a.deadline) {
        return 1;
      }

      if (!b.deadline) {
        return -1;
      }

      return (
        new Date(`${a.deadline}T00:00:00`) - new Date(`${b.deadline}T00:00:00`)
      );
    });

  const formatDeadline = (value) => {
    if (!value) {
      return null;
    }

    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const TodoCard = ({ todo }) => (
    <div
      className={`group nexus-glass rounded-2xl p-4 transition ${
        todo.completed
          ? "opacity-70"
          : isOverdue(todo.deadline)
            ? "border-red-400/30 bg-red-500/[0.04] shadow-[0_0_24px_rgba(239,68,68,0.18)]"
            : "hover:border-yellow-400/40 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(250,204,21,0.18)]"
      }`}
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => toggleComplete(todo)}
          aria-label={
            todo.completed ? "Mark task incomplete" : "Mark task complete"
          }
          className={`mt-1 w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition ${
            todo.completed
              ? "bg-gradient-aurora bg-[length:200%_200%] animate-grad-pan border-transparent text-black shadow-[0_0_18px_rgba(250,204,21,0.45)]"
              : "border-gray-600 hover:border-yellow-400"
          }`}
        >
          {todo.completed ? "✓" : ""}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={`font-semibold text-lg ${
                todo.completed ? "line-through text-gray-500" : "text-white"
              }`}
            >
              {todo.title}
            </h4>

            {todo.deadline && !todo.completed && isOverdue(todo.deadline) && (
              <span className="nexus-badge-red">
                Overdue
              </span>
            )}

            {todo.deadline === todayString && !todo.completed && (
              <span className="nexus-badge-yellow">
                Due today
              </span>
            )}
          </div>

          {todo.description && (
            <p
              className={`text-sm mt-2 whitespace-pre-wrap ${
                todo.completed ? "text-gray-600" : "text-gray-400"
              }`}
            >
              {todo.description}
            </p>
          )}

          {todo.image_url && (
            <img
              src={todo.image_url}
              alt=""
              className="mt-4 w-full max-h-72 object-cover rounded-xl border border-white/10"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {todo.deadline && (
              <span
                className={`text-xs px-3 py-1 rounded-full font-semibold backdrop-blur-md ${
                  !todo.completed && isOverdue(todo.deadline)
                    ? "bg-red-500/10 text-red-300 border border-red-400/20"
                    : "bg-white/[0.05] text-gray-400 border border-white/10"
                }`}
              >
                {isOverdue(todo.deadline) && !todo.completed
                  ? "Overdue · "
                  : "Due · "}
                {formatDeadline(todo.deadline)}
              </span>
            )}

            {todo.completed && (
              <span className="nexus-badge-yellow">
                Completed
              </span>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
            <button
              type="button"
              onClick={() => beginEdit(todo)}
              className="px-3 py-2 nexus-morphic-button-ghost text-xs"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => deleteTodo(todo)}
              className="px-3 py-2 rounded-lg bg-red-500/10 text-red-300 border border-red-400/20 hover:bg-red-500/20 text-xs font-semibold transition"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <section className="nexus-glass-strong rounded-3xl p-8">
        <p className="text-gray-500">Loading tasks...</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and progress */}
      <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
        <div className="nexus-glow-yellow w-72 h-72 -top-20 -right-20" />
        <div className="nexus-glow-purple w-72 h-72 -bottom-20 -left-20" />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
              Club Tasks
            </p>

            <h2 className="text-3xl font-black mt-1">To-Do List</h2>

            <p className="text-gray-500 mt-1">
              {activeTodos.length} active · {completedTodos.length} completed
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="nexus-glass-flat rounded-xl px-4 py-3">
              <p className="text-gray-500 text-[10px] uppercase font-bold">
                Progress
              </p>
              <p className="font-black text-lg mt-1 nexus-text-aurora">
                {completionPercent}%
              </p>
            </div>

            <div className="rounded-xl bg-yellow-400/10 border border-yellow-400/30 px-4 py-3 backdrop-blur-md">
              <p className="text-yellow-300 text-[10px] uppercase font-bold">
                Today
              </p>
              <p className="font-black text-lg mt-1 text-yellow-300">
                {dueTodayCount}
              </p>
            </div>

            <div className="rounded-xl bg-red-500/10 border border-red-400/30 px-4 py-3 backdrop-blur-md">
              <p className="text-red-300 text-[10px] uppercase font-bold">
                Overdue
              </p>
              <p className="font-black text-lg mt-1 text-red-300">
                {overdueCount}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Overall completion</span>
            <span>
              {completedTodos.length}/{todos.length}
            </span>
          </div>

          <div className="nexus-progress">
            <div
              className="nexus-progress-bar"
              style={{
                width: `${completionPercent}%`,
              }}
            />
          </div>
        </div>
      </section>

      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="nexus-morphic-button px-5 py-3"
          >
            + Add Task
          </button>
        </div>
      )}

      {/* Admin editor */}
      {isAdmin && showForm && (
        <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden border-yellow-400/20">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/[0.04] via-purple-500/[0.04] to-transparent pointer-events-none" />

          <div className="relative flex items-center justify-between mb-5">
            <h3 className="text-xl font-black">
              <span className="nexus-text-aurora">
                {editingTodo ? "Edit Task" : "Add Task"}
              </span>
            </h3>

            <button
              type="button"
              onClick={resetForm}
              className="text-gray-500 hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={saveTodo} className="relative space-y-4">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task title"
              className="nexus-input"
            />

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Task description"
              rows="4"
              className="nexus-textarea"
            />

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Deadline
              </label>

              <input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className="nexus-input"
              />
            </div>

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
                    alt="Task preview"
                    className="w-full max-h-64 object-cover rounded-xl border border-white/10"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(editingTodo?.image_url || "");
                    }}
                    className="mt-2 text-sm text-red-300 hover:text-red-200"
                  >
                    Remove new picture
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="nexus-morphic-button px-6 py-3 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingTodo
                    ? "Save Changes"
                    : "Create Task"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="nexus-morphic-button-ghost px-6 py-3"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filters */}
      <section className="nexus-glass-strong rounded-3xl p-5">
        <div className="grid lg:grid-cols-[1fr_auto_auto] gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks..."
            className="nexus-input"
          />

          <select
            value={deadlineFilter}
            onChange={(event) => setDeadlineFilter(event.target.value)}
            className="nexus-select"
          >
            <option value="all">All deadlines</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="upcoming">Upcoming</option>
            <option value="no-date">No deadline</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="nexus-select"
          >
            <option value="deadline">Sort: Deadline</option>
            <option value="overdue">Sort: Overdue first</option>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
          </select>
        </div>
      </section>

      {/* Active */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
              In progress
            </p>
            <h3 className="text-xl font-black mt-1">Active</h3>
          </div>

          <span className="nexus-badge-purple">
            {filteredActiveTodos.length} shown
          </span>
        </div>

        {filteredActiveTodos.length === 0 ? (
          <div className="nexus-glass rounded-2xl border-dashed border-white/10 p-8 text-center">
            <div className="text-3xl">✓</div>

            <p className="text-gray-500 mt-2">
              No active tasks match your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActiveTodos.map((todo) => (
              <TodoCard key={todo.id} todo={todo} />
            ))}
          </div>
        )}
      </section>

      {/* Completed */}
      <section className="border-t border-white/10 pt-6">
        <button
          type="button"
          onClick={() => setShowCompleted((current) => !current)}
          className="w-full flex items-center justify-between nexus-glass-flat rounded-2xl px-5 py-4 hover:bg-white/[0.07] transition"
        >
          <div className="flex items-center gap-3">
            <span
              className={`transition-transform text-yellow-300 ${
                showCompleted ? "rotate-90" : ""
              }`}
            >
              ▶
            </span>

            <span className="font-bold text-gray-300">Completed</span>

            <span className="nexus-badge">
              {completedTodos.length}
            </span>
          </div>

          <span className="text-gray-500 text-sm">
            {showCompleted ? "Hide" : "Show"}
          </span>
        </button>

        {showCompleted && completedTodos.length > 0 && (
          <div className="space-y-3 mt-3">
            {completedTodos.map((todo) => (
              <TodoCard key={todo.id} todo={todo} />
            ))}
          </div>
        )}

        {showCompleted && completedTodos.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-5">
            No completed tasks yet.
          </p>
        )}
      </section>
    </div>
  );
}

export default Todo;
