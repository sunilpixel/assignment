import { normalizeTask, normalizeTaskList } from "./normalize";

describe("normalizeTask", () => {
  it("normalizes mixed payloads into a clean task model", () => {
    const raw = {
      id: "t10",
      title: "Annotated Image",
      type: "image",
      status: "InProgress",
      assignee: { id: "u2", name: "Ben" },
      annotationCount: "3",
      updatedAt: "2024-06-28T12:00:00.000Z",
      meta: { priority: "high", note: "rush" },
    };

    const normalized = normalizeTask(raw);

    expect(normalized).toMatchObject({
      id: "t10",
      type: "image",
      status: "in_progress",
      annotationCount: 3,
      assignee: { id: "u2", name: "Ben" },
    });
    expect(normalized.updatedAt).toBe(Date.parse("2024-06-28T12:00:00.000Z"));
  });

  it("handles unknown and malformed values without crashing", () => {
    const normalized = normalizeTask({
      id: 42,
      title: "",
      type: "video",
      status: "garbage",
      assignee: null,
      annotationCount: "nope",
      updatedAt: null,
      meta: [],
    });

    expect(normalized.type).toBe("unknown");
    expect(normalized.status).toBe("unknown");
    expect(normalized.annotationCount).toBe(0);
    expect(normalized.assignee).toBeNull();
    expect(normalized.meta).toEqual({});
  });
});

describe("normalizeTaskList", () => {
  it("returns an empty list for non-array payloads", () => {
    expect(normalizeTaskList(null)).toEqual([]);
  });
});
