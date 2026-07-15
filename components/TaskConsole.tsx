"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import type { AppDispatch, RootState } from "@/store/store";
import {
  fetchTasks,
  selectCachedTasks,
  selectSelectedTask,
  selectTasksSummary,
  selectVisibleTasks,
  setSearch,
  setSelectedId,
  setSortBy,
  setStatusFilter,
  setTypeFilter,
} from "@/features/tasks/tasksSlice";
import { loadCachedTasks, saveCachedTasks } from "@/lib/cache";
import { useTaskFeed } from "@/hooks/useTaskFeed";
import { useTaskSummary } from "@/hooks/useTaskSummary";
import type { TaskStatus, TaskType } from "@/types/task";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
const STATUS_OPTIONS: TaskStatus[] = [
  "todo",
  "in_progress",
  "done",
  "blocked",
  "qa",
  "unknown",
];
const TYPE_OPTIONS: Array<TaskType | "all"> = [
  "all",
  "image",
  "audio",
  "text",
  "unknown",
];
const SORT_OPTIONS = ["updatedAt", "annotationCount", "title"] as const;

function formatRelativeTime(updatedAt: number) {
  const diff = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatStatusLabel(status: TaskStatus) {
  return status.replace(/_/g, " ");
}

function getTaskButtonClasses(isSelected: boolean) {
  return isSelected
    ? "border-zinc-900 bg-zinc-900 text-white"
    : "border-zinc-200 bg-white hover:bg-zinc-50";
}

function getMetaTextClasses(isSelected: boolean) {
  return isSelected ? "text-zinc-200" : "text-zinc-600";
}

export function TaskConsole() {
  const dispatch = useDispatch<AppDispatch>();
  const tasks = useSelector(selectVisibleTasks);
  const selectedTask = useSelector(selectSelectedTask);
  const taskState = useSelector((state: RootState) => state.tasks);
  const cachedTasks = useSelector(selectCachedTasks);
  const summary = useTaskSummary(taskState.selectedId, API_BASE);
  const summaryStats = useSelector(selectTasksSummary);
  const [page, setPage] = useState(1);
  const [hasHydratedCache, setHasHydratedCache] = useState(false);

  useTaskFeed(API_BASE);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cached = await loadCachedTasks();
      if (cancelled) return;
      if (cached) {
        dispatch({
          type: "tasks/hydrateFromCache",
          payload: {
            page: cached.page,
            pageSize: cached.pageSize,
            total: cached.total,
            items: cached.items,
          },
        });
      }
      setHasHydratedCache(true);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    void dispatch(
      fetchTasks({ page, pageSize: taskState.pageSize, apiBase: API_BASE }),
    );
  }, [dispatch, page, taskState.pageSize]);

  useEffect(() => {
    if (selectedTask && !tasks.some((task) => task.id === selectedTask.id)) {
      dispatch(setSelectedId(null));
    }
  }, [dispatch, selectedTask, tasks]);

  useEffect(() => {
    if (!taskState.status || !hasHydratedCache) {
      return;
    }

    void saveCachedTasks({
      items: cachedTasks,
      page: taskState.page,
      pageSize: taskState.pageSize,
      total: taskState.total,
      fetchedAt: Date.now(),
    });
  }, [
    cachedTasks,
    hasHydratedCache,
    taskState.page,
    taskState.pageSize,
    taskState.status,
    taskState.total,
  ]);

  const taskCounts = summaryStats.counts;
  const activeCount = (taskCounts.in_progress ?? 0) + (taskCounts.todo ?? 0);

  return (
    <div className="min-h-screen bg-zinc-100 p-6 text-zinc-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                Annotation activity console
              </p>
              <h1 className="text-2xl font-semibold">Live task feed</h1>
            </div>
            <div className="rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white">
              {summaryStats.total} tasks • {activeCount} active
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {hasHydratedCache
              ? taskState.status === "loading"
                ? "Showing the cached snapshot while the latest server data refreshes."
                : "The latest task list is loaded and live events are merging in."
              : "Loading the most recent cached snapshot…"}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {STATUS_OPTIONS.map((status) => (
              <div
                key={status}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {formatStatusLabel(status)}
                </div>
                <div className="text-xl font-semibold">
                  {taskCounts[status] ?? 0}
                </div>
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-55 text-sm font-medium text-zinc-700 flex items-center gap-2">
                Search
                <input
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                  value={taskState.search}
                  onChange={(event) => dispatch(setSearch(event.target.value))}
                  placeholder="Find task"
                />
              </label>
              <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                Type
                <select
                  className="mt-1 rounded-md border border-zinc-300 px-3 py-2"
                  value={taskState.typeFilter}
                  onChange={(event) =>
                    dispatch(
                      setTypeFilter(event.target.value as TaskType | "all"),
                    )
                  }
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All" : option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                Status
                <select
                  className="mt-1 rounded-md border border-zinc-300 px-3 py-2"
                  value={taskState.statusFilter}
                  onChange={(event) =>
                    dispatch(
                      setStatusFilter(event.target.value as TaskStatus | "all"),
                    )
                  }
                >
                  <option value="all">All</option>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                  <option value="qa">QA</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                Sort
                <select
                  className="mt-1 rounded-md border border-zinc-300 px-3 py-2"
                  value={taskState.sortBy}
                  onChange={(event) =>
                    dispatch(
                      setSortBy(
                        event.target.value as (typeof SORT_OPTIONS)[number],
                      ),
                    )
                  }
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "updatedAt"
                        ? "Updated"
                        : option === "annotationCount"
                          ? "Annotations"
                          : "Title"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {taskState.status === "loading" && (
              <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
                Loading tasks…
              </div>
            )}
            {taskState.status === "failed" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {taskState.error}
              </div>
            )}
            {taskState.status !== "loading" && tasks.length === 0 && (
              <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
                No tasks match the current filters.
              </div>
            )}

            <div className="mt-4 space-y-2">
              {tasks.map((task) => {
                const isSelected = taskState.selectedId === task.id;
                return (
                  <button
                    key={task.id}
                    className={`w-full rounded-lg border p-3 text-left transition ${getTaskButtonClasses(isSelected)}`}
                    onClick={() => dispatch(setSelectedId(task.id))}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{task.title}</span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${isSelected ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-700"}`}
                      >
                        {task.type}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={
                          taskState.selectedId === task.id
                            ? "text-zinc-200"
                            : "text-zinc-600"
                        }
                      >
                        {task.status}
                      </span>
                      <span className={getMetaTextClasses(isSelected)}>
                        • {task.assignee?.name ?? "Unassigned"}
                      </span>
                      <span className={getMetaTextClasses(isSelected)}>
                        • {task.annotationCount} annotations
                      </span>
                      <span className={getMetaTextClasses(isSelected)}>
                        • updated {formatRelativeTime(task.updatedAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="text-sm text-zinc-600">Page {page}</span>
              <button
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </section>

          <aside className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            {selectedTask ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                      Selected task
                    </p>
                    <h2 className="text-xl font-semibold">
                      {selectedTask.title}
                    </h2>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
                    {selectedTask.type}
                  </div>
                </div>
                <dl className="mt-4 space-y-3 text-sm text-zinc-700">
                  <div className="flex justify-between">
                    <dt>Status</dt>
                    <dd className="font-medium">{selectedTask.status}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Assignee</dt>
                    <dd className="font-medium">
                      {selectedTask.assignee?.name ?? "Unassigned"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Annotations</dt>
                    <dd className="font-medium">
                      {selectedTask.annotationCount}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Updated</dt>
                    <dd className="font-medium">
                      {new Date(selectedTask.updatedAt).toLocaleString()}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">AI summary</h3>
                    <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      {summary.status}
                    </span>
                  </div>
                  {summary.error ? (
                    <p className="text-sm text-red-600">{summary.error}</p>
                  ) : null}
                  <div className="prose prose-sm max-w-none text-sm text-zinc-700">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                    >
                      {summary.markdown}
                    </ReactMarkdown>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-zinc-600">
                Select a task to inspect it.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
