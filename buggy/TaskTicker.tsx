import React, { useEffect, useMemo, useState } from "react";

type Task = { id: string; title: string; updatedAt: number };

function formatRelativeTime(updatedAt: number) {
  const diff = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function TaskTicker({ apiBase }: { apiBase: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const controller = new AbortController();

    fetch(`${apiBase}/api/tasks/${selectedId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Task request failed: ${response.status}`);
        }
        return (await response.json()) as Task;
      })
      .then((task) => {
        setTasks((previous) => {
          const exists = previous.some((item) => item.id === task.id);
          if (exists) {
            return previous.map((item) => (item.id === task.id ? task : item));
          }
          return [...previous, task];
        });
        setError(null);
      })
      .catch((caughtError) => {
        if ((caughtError as Error).name === "AbortError") {
          return;
        }
        setError("Unable to load the selected task right now.");
      });

    return () => controller.abort();
  }, [apiBase, selectedId]);

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => b.updatedAt - a.updatedAt),
    [tasks],
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-medium text-zinc-700">Recent activity</p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          No tasks yet. Select a task to inspect it.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sorted.map((task) => (
            <li key={task.id}>
              <button
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
                onClick={() => setSelectedId(task.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{task.title}</span>
                  <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    {formatRelativeTime(task.updatedAt)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Updated {formatRelativeTime(task.updatedAt)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 text-xs text-zinc-400">Live updates: {tick}</div>
    </div>
  );
}
