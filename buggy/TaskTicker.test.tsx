import { render, screen } from "@testing-library/react";
import { TaskTicker } from "./TaskTicker";

describe("TaskTicker", () => {
  it("shows a friendly empty state until a task is available", () => {
    render(<TaskTicker apiBase="http://localhost:4000" />);

    expect(
      screen.getByText("No tasks yet. Select a task to inspect it."),
    ).toBeInTheDocument();
  });
});
