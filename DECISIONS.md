# Decisions

- I used RTK slices instead of RTK Query because the app needs to merge REST pagination, websocket updates, and a streaming summary into one coherent state model. The slice keeps the live merge logic, selectors, pagination state, and cache hydration in one place rather than scattering them across multiple layers.
- The normalizer turns inconsistent backend values into a typed domain model. Unknown types and statuses are preserved as explicit `unknown` values, malformed counts fall back to `0`, and timestamps are coerced from strings or numbers without crashing the UI.
- The streamed markdown is rendered through ReactMarkdown with `rehype-sanitize`, so raw HTML and script-like payloads are stripped before they reach the DOM. The unsafe content is sanitized at render time rather than trusted because it arrives from an untrusted source.
- The IndexedDB cache stores the latest normalized task page and hydrates it immediately on reload. The UI makes that explicit with a cached-refresh banner so the screen does not pretend the data is fresh while the server revalidation is still in flight.
- The ticker bugs came from stale async work, mutable state updates, and a missing empty state. The fix uses abortable fetches, immutable updates, and a clearer selection flow so stale responses cannot overwrite newer data or leave the component in a confusing state.
- If I had more time, I would add a small task metric chart and cache streamed summaries for revisits, but the current implementation covers the core data path and the unsafe-rendering requirement cleanly.
