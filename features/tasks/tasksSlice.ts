import {
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { RootState } from "@/store/store";
import { normalizeTask, normalizeTaskList } from "@/lib/normalize";
import type { NormalizedTask, TaskStatus, TaskType } from "@/types/task";

export interface TaskListPayload {
  page: number;
  pageSize: number;
  total: number;
  items: NormalizedTask[];
}

export interface TasksState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  currentPageIds: string[];
  selectedId: string | null;
  sortBy: "updatedAt" | "annotationCount" | "title";
  typeFilter: "all" | TaskType;
  statusFilter: "all" | TaskStatus;
  search: string;
  lastUpdatedAt: number | null;
}

export const taskAdapter = createEntityAdapter<NormalizedTask>({
  sortComparer: (left, right) => right.updatedAt - left.updatedAt,
});

const initialState = taskAdapter.getInitialState<TasksState>({
  status: "idle",
  error: null,
  page: 1,
  pageSize: 20,
  total: 0,
  currentPageIds: [],
  selectedId: null,
  sortBy: "updatedAt",
  typeFilter: "all",
  statusFilter: "all",
  search: "",
  lastUpdatedAt: null,
});

export const fetchTasks = createAsyncThunk<
  TaskListPayload,
  { page: number; pageSize: number; apiBase: string },
  { rejectValue: string }
>("tasks/fetch", async ({ page, pageSize, apiBase }, { rejectWithValue }) => {
  try {
    const response = await fetch(
      `${apiBase}/api/tasks?page=${page}&pageSize=${pageSize}`,
    );
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      page: number;
      pageSize: number;
      total: number;
      items: unknown[];
    };
    return {
      page: payload.page,
      pageSize: payload.pageSize,
      total: payload.total,
      items: normalizeTaskList(payload.items),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load tasks";
    return rejectWithValue(message);
  }
});

const createPlaceholderTask = (id: string): NormalizedTask => ({
  id,
  title: `Task ${id}`,
  type: "unknown",
  status: "unknown",
  assignee: null,
  annotationCount: 0,
  updatedAt: Date.now(),
  meta: {},
});

const mergePageState = (
  state: typeof initialState,
  payload: TaskListPayload,
  items: NormalizedTask[],
) => {
  state.currentPageIds = items.map((task) => task.id);
  state.page = payload.page;
  state.pageSize = payload.pageSize;
  state.total = payload.total;
  state.status = "succeeded";
  state.lastUpdatedAt = Date.now();
};

const upsertTaskFromEvent = (
  state: typeof initialState,
  taskId: string,
  update: Partial<NormalizedTask>,
) => {
  const existing = state.entities[taskId];
  const baseTask = existing ?? createPlaceholderTask(taskId);
  taskAdapter.upsertOne(state, { ...baseTask, ...update });
};

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    hydrateFromCache: (state, action: PayloadAction<TaskListPayload>) => {
      const normalized = normalizeTaskList(action.payload.items);
      taskAdapter.upsertMany(state, normalized);
      mergePageState(state, action.payload, normalized);
      if (!state.selectedId && normalized.length > 0) {
        state.selectedId = normalized[0].id;
      }
    },
    setSelectedId: (state, action: PayloadAction<string | null>) => {
      state.selectedId = action.payload;
    },
    setSortBy: (state, action: PayloadAction<TasksState["sortBy"]>) => {
      state.sortBy = action.payload;
    },
    setTypeFilter: (state, action: PayloadAction<TasksState["typeFilter"]>) => {
      state.typeFilter = action.payload;
    },
    setStatusFilter: (
      state,
      action: PayloadAction<TasksState["statusFilter"]>,
    ) => {
      state.statusFilter = action.payload;
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload.toLowerCase();
    },
    applyTaskEvent: (
      state,
      action: PayloadAction<{ kind: string; payload: Record<string, unknown> }>,
    ) => {
      const { kind, payload } = action.payload;
      const taskId =
        typeof payload.id === "string"
          ? payload.id
          : typeof payload.taskId === "string"
            ? payload.taskId
            : null;

      if (!taskId) {
        return;
      }

      // Live events can arrive for tasks that are not yet on the current page.
      // We still materialize them in the entity store so the UI can show them later.
      if (kind === "task.updated") {
        const nextTask =
          state.entities[taskId] ?? createPlaceholderTask(taskId);
        upsertTaskFromEvent(state, taskId, {
          ...nextTask,
          status: normalizeTask({ ...nextTask, status: payload.status }).status,
          updatedAt:
            typeof payload.updatedAt === "number"
              ? payload.updatedAt
              : Date.now(),
          meta: { ...nextTask.meta, lastEvent: "task.updated" },
        });
      } else if (kind === "task.assigned") {
        const nextTask =
          state.entities[taskId] ?? createPlaceholderTask(taskId);
        upsertTaskFromEvent(state, taskId, {
          ...nextTask,
          assignee:
            typeof payload.assignee === "object" && payload.assignee !== null
              ? {
                  id:
                    typeof (payload.assignee as { id?: unknown }).id ===
                    "string"
                      ? (payload.assignee as { id: string }).id
                      : "unknown",
                  name:
                    typeof (payload.assignee as { name?: unknown }).name ===
                    "string"
                      ? (payload.assignee as { name: string }).name
                      : "Unknown",
                }
              : null,
          updatedAt: Date.now(),
          meta: { ...nextTask.meta, lastEvent: "task.assigned" },
        });
      } else if (kind === "annotation.created") {
        const nextTask =
          state.entities[taskId] ?? createPlaceholderTask(taskId);
        upsertTaskFromEvent(state, taskId, {
          ...nextTask,
          annotationCount: nextTask.annotationCount + 1,
          updatedAt: typeof payload.at === "number" ? payload.at : Date.now(),
          meta: { ...nextTask.meta, lastEvent: "annotation.created" },
        });
      }

      state.lastUpdatedAt = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchTasks.pending, (state) => {
      state.status = "loading";
      state.error = null;
    });
    builder.addCase(fetchTasks.fulfilled, (state, action) => {
      const normalized = normalizeTaskList(action.payload.items);
      taskAdapter.upsertMany(state, normalized);
      mergePageState(state, action.payload, normalized);
      if (!state.selectedId && normalized.length > 0) {
        state.selectedId = normalized[0].id;
      }
    });
    builder.addCase(fetchTasks.rejected, (state, action) => {
      state.status = "failed";
      state.error = action.payload ?? "Unable to load tasks";
    });
  },
});

export const {
  hydrateFromCache,
  setSelectedId,
  setSortBy,
  setTypeFilter,
  setStatusFilter,
  setSearch,
  applyTaskEvent,
} = tasksSlice.actions;

const selectTasksState = (state: RootState) => state.tasks;
const taskSelectors = taskAdapter.getSelectors<RootState>(
  (state) => state.tasks,
);

export const selectCachedTasks = createSelector(
  [selectTasksState],
  (taskState) =>
    Object.values(taskState.entities).filter((task): task is NormalizedTask =>
      Boolean(task),
    ),
);

export const selectTaskIds = (state: RootState) => state.tasks.currentPageIds;
export const selectTaskById = (state: RootState, taskId: string | null) => {
  if (!taskId) {
    return null;
  }
  return taskSelectors.selectById(state, taskId);
};

export const selectVisibleTasks = createSelector(
  [taskSelectors.selectAll, selectTasksState],
  (tasks, taskState) => {
    // Only show tasks from the active page, then apply the current filters and sort.
    const currentPageIds = new Set(taskState.currentPageIds);
    const pageTasks = tasks.filter((task) => currentPageIds.has(task.id));

    const filtered = pageTasks.filter((task) => {
      if (
        taskState.typeFilter !== "all" &&
        task.type !== taskState.typeFilter
      ) {
        return false;
      }
      if (
        taskState.statusFilter !== "all" &&
        task.status !== taskState.statusFilter
      ) {
        return false;
      }
      if (taskState.search) {
        const haystack =
          `${task.title} ${task.assignee?.name ?? ""}`.toLowerCase();
        const normalizedSearch = taskState.search.trim();
        if (!normalizedSearch || !haystack.includes(normalizedSearch)) {
          return false;
        }
      }
      return true;
    });

    const sorted = [...filtered].sort((left, right) => {
      if (taskState.sortBy === "annotationCount") {
        return right.annotationCount - left.annotationCount;
      }
      if (taskState.sortBy === "title") {
        return left.title.localeCompare(right.title);
      }
      return right.updatedAt - left.updatedAt;
    });

    return sorted;
  },
);

export const selectSelectedTask = (state: RootState) => {
  const taskId = state.tasks.selectedId;
  if (!taskId) {
    return null;
  }
  return taskSelectors.selectById(state, taskId);
};

export const selectTasksSummary = createSelector(
  [taskSelectors.selectAll, selectTasksState],
  (tasks, taskState) => {
    // Aggregate the current entity store so the header summary stays accurate after live updates.
    const counts = tasks.reduce<Record<TaskStatus, number>>(
      (acc, task) => {
        acc[task.status] = (acc[task.status] ?? 0) + 1;
        return acc;
      },
      {
        todo: 0,
        in_progress: 0,
        done: 0,
        blocked: 0,
        qa: 0,
        unknown: 0,
      },
    );

    return {
      total: tasks.length,
      page: taskState.page,
      totalPages: Math.max(
        1,
        Math.ceil(taskState.total / Math.max(1, taskState.pageSize)),
      ),
      counts,
    };
  },
);

export default tasksSlice.reducer;
