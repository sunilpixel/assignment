import localforage from "localforage";
import type { NormalizedTask } from "@/types/task";

const CACHE_KEY = "annotation-console-task-list";

export interface CachedTaskList {
  items: NormalizedTask[];
  page: number;
  pageSize: number;
  total: number;
  fetchedAt: number;
}

export async function loadCachedTasks(): Promise<CachedTaskList | null> {
  try {
    const cached = await localforage.getItem<CachedTaskList>(CACHE_KEY);
    return cached ?? null;
  } catch {
    return null;
  }
}

export async function saveCachedTasks(payload: CachedTaskList): Promise<void> {
  try {
    await localforage.setItem(CACHE_KEY, payload);
  } catch {
    // Ignore cache failures; the UI should still render from the live response.
  }
}
