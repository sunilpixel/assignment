import { useEffect, useRef, useState } from "react";

function appendChunk(markdown: string, chunk: string) {
  return `${markdown}${chunk}`;
}

export function useTaskSummary(taskId: string | null, apiBase: string) {
  const [markdown, setMarkdown] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!taskId) {
      setMarkdown("");
      setStatus("idle");
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);
    setMarkdown("");

    const readStream = async () => {
      try {
        const response = await fetch(`${apiBase}/api/tasks/${taskId}/summary`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Summary request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Stream not available");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        const pushFrame = (frame: string) => {
          const match = frame.match(/^data:\s*(.+)$/m);
          if (!match) {
            return;
          }

          try {
            const payload = JSON.parse(match[1]);
            setMarkdown((current) => appendChunk(current, payload));
          } catch {
            // Ignore malformed chunks and continue.
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          frames.forEach(pushFrame);
        }

        if (buffer) {
          pushFrame(buffer);
        }

        setStatus("ready");
      } catch (caughtError) {
        if ((caughtError as Error).name === "AbortError") {
          return;
        }
        setStatus("error");
        setError(
          caughtError instanceof Error ? caughtError.message : "Summary failed",
        );
      }
    };

    void readStream();

    return () => {
      controller.abort();
    };
  }, [taskId, apiBase]);

  return { markdown, status, error };
}
