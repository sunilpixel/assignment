# Annotation activity console

This app implements a task console with typed normalization, Redux state, live websocket updates, streamed markdown summaries, and local caching for the mock annotation server.

## Run locally

1. Start the mock server:

```bash
cd mock-server
npm install
npm run mock
```

2. In a second terminal, start the Next.js app:

```bash
cd ..
npm install
npm run dev
```

Open http://localhost:3000 to view the UI. The mock server runs on http://localhost:4000.

## Verification

```bash
npm test
npm run build
```

## Notes

- The streamed summary uses ReactMarkdown with rehype-sanitize so untrusted HTML is stripped before rendering.
- The UI caches the most recently loaded task list in IndexedDB and revalidates from the server on startup.
# assignment
