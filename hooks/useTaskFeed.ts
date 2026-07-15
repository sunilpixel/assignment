import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store/store";
import { applyTaskEvent } from "@/features/tasks/tasksSlice";

export function useTaskFeed(apiBase: string) {
  const dispatch = useDispatch<AppDispatch>();
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const connect = () => {
      const socket = new WebSocket(`${apiBase.replace("http", "ws")}/ws`);

      socket.addEventListener("message", (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as {
            kind?: string;
            payload?: Record<string, unknown>;
          };

          if (parsed.kind && parsed.payload) {
            dispatch(
              applyTaskEvent({ kind: parsed.kind, payload: parsed.payload }),
            );
          }
        } catch {
          // Ignore malformed events and keep the UI alive.
        }
      });

      socket.addEventListener("close", () => {
        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = window.setTimeout(connect, 1500);
      });
    };

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [apiBase, dispatch]);
}
