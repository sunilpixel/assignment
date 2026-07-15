export type TaskType = "image" | "audio" | "text" | "unknown";
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "done"
  | "blocked"
  | "qa"
  | "unknown";

export interface TaskAssignee {
  id: string;
  name: string;
}

export type TaskMeta = Record<string, string>;

interface BaseTask {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: TaskAssignee | null;
  annotationCount: number;
  updatedAt: number;
  meta: TaskMeta;
}

export interface ImageTask extends BaseTask {
  type: "image";
}

export interface AudioTask extends BaseTask {
  type: "audio";
}

export interface TextTask extends BaseTask {
  type: "text";
}

export interface UnknownTask extends BaseTask {
  type: "unknown";
}

export type NormalizedTask = ImageTask | AudioTask | TextTask | UnknownTask;
