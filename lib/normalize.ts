import type {
  NormalizedTask,
  TaskMeta,
  TaskStatus,
  TaskType,
} from "@/types/task";

const normalizeType = (raw: unknown): TaskType => {
  if (
    typeof raw === "string" &&
    (raw === "image" || raw === "audio" || raw === "text")
  ) {
    return raw;
  }
  return "unknown";
};

const normalizeStatus = (raw: unknown): TaskStatus => {
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "todo") return "todo";
    if (normalized === "in_progress" || normalized === "inprogress")
      return "in_progress";
    if (normalized === "done") return "done";
    if (normalized === "blocked") return "blocked";
    if (normalized === "qa") return "qa";
  }
  return "unknown";
};

const normalizeMeta = (raw: unknown): TaskMeta => {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  return Object.entries(raw as Record<string, unknown>).reduce<TaskMeta>(
    (acc, [key, value]) => {
      if (typeof value === "string") {
        acc[key] = value;
      } else if (typeof value === "number" || typeof value === "boolean") {
        acc[key] = String(value);
      } else {
        acc[key] = JSON.stringify(value);
      }
      return acc;
    },
    {},
  );
};

const normalizeUpdatedAt = (raw: unknown): number => {
  // Accept either epoch milliseconds or ISO strings, and fall back to now for junk input.
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === "string" && raw.trim()) {
    const parsedNumber = Number(raw);
    if (Number.isFinite(parsedNumber)) {
      return parsedNumber;
    }

    const parsedDate = Date.parse(raw);
    if (Number.isFinite(parsedDate)) {
      return parsedDate;
    }
  }

  return Date.now();
};

const normalizeAnnotationCount = (raw: unknown): number => {
  // Counts may arrive as strings, so coerce them safely and clamp negative values.
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.floor(raw));
  }

  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return 0;
};

const normalizeAssignee = (raw: unknown) => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const id =
    typeof candidate.id === "string" && candidate.id.trim()
      ? candidate.id
      : null;
  const name =
    typeof candidate.name === "string" && candidate.name.trim()
      ? candidate.name
      : null;

  if (!id && !name) {
    return null;
  }

  return {
    id: id ?? "unknown",
    name: name ?? "Unknown assignee",
  };
};

const createBaseTask = (
  id: string,
  title: string,
  raw: Record<string, unknown>,
): Omit<NormalizedTask, "type"> => ({
  id,
  title,
  status: normalizeStatus(raw.status),
  assignee: normalizeAssignee(raw.assignee),
  annotationCount: normalizeAnnotationCount(raw.annotationCount),
  updatedAt: normalizeUpdatedAt(raw.updatedAt),
  meta: normalizeMeta(raw.meta),
});

export function normalizeTask(raw: unknown): NormalizedTask {
  // Keep the UI resilient even when the backend sends malformed objects.
  if (!raw || typeof raw !== "object") {
    return {
      id: `task-${Date.now()}`,
      title: "Untitled task",
      type: "unknown",
      status: "unknown",
      assignee: null,
      annotationCount: 0,
      updatedAt: Date.now(),
      meta: {},
    };
  }

  const candidate = raw as Record<string, unknown>;
  const id =
    typeof candidate.id === "string" && candidate.id.trim()
      ? candidate.id
      : `task-${Date.now()}`;
  const title =
    typeof candidate.title === "string" && candidate.title.trim()
      ? candidate.title
      : `Untitled task (${id})`;
  const type = normalizeType(candidate.type);
  const base = createBaseTask(id, title, candidate);

  switch (type) {
    case "image":
      return { ...base, type: "image" };
    case "audio":
      return { ...base, type: "audio" };
    case "text":
      return { ...base, type: "text" };
    default:
      return { ...base, type: "unknown" };
  }
}

export function normalizeTaskList(raw: unknown): NormalizedTask[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item) => normalizeTask(item));
}
