import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { TaskConsole } from "./TaskConsole";
import { makeStore } from "@/store/store";

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
jest.mock("remark-gfm", () => ({ __esModule: true, default: () => null }));
jest.mock("rehype-sanitize", () => ({ __esModule: true, default: () => null }));
jest.mock("@/hooks/useTaskFeed", () => ({ useTaskFeed: () => undefined }));
jest.mock("@/hooks/useTaskSummary", () => ({
  useTaskSummary: () => ({ markdown: "hello", status: "ready", error: null }),
}));

describe("TaskConsole", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        page: 1,
        pageSize: 20,
        total: 2,
        items: [
          {
            id: "t1",
            title: "Alpha task",
            type: "image",
            status: "todo",
            assignee: { id: "u1", name: "Asha" },
            annotationCount: 1,
            updatedAt: Date.now(),
            meta: {},
          },
          {
            id: "t2",
            title: "Beta task",
            type: "text",
            status: "done",
            assignee: null,
            annotationCount: 4,
            updatedAt: Date.now() - 1000,
            meta: {},
          },
        ],
      }),
    }) as unknown as typeof fetch;
  });

  it("filters visible rows when the search box changes", async () => {
    const user = userEvent.setup();
    const store = makeStore();

    render(
      <Provider store={store}>
        <TaskConsole />
      </Provider>,
    );

    const searchInput = await screen.findByPlaceholderText("Find task");
    await user.type(searchInput, "beta");

    expect(await screen.findByText("Beta task")).toBeInTheDocument();
    expect(screen.queryByText("Alpha task")).not.toBeInTheDocument();
  });

  it("preserves whitespace in the search input", async () => {
    const user = userEvent.setup();
    const store = makeStore();

    render(
      <Provider store={store}>
        <TaskConsole />
      </Provider>,
    );

    const searchInput = await screen.findByPlaceholderText("Find task");
    await user.type(searchInput, "beta ");

    expect(searchInput).toHaveValue("beta ");
  });
});
