// Trivial hermetic dev server for the Render-control E2E test. It stands in for
// a real project's dev server: the run API spawns `node tiny-server.mjs <port>`
// (argv, no shell), polls its readyUrl, and once it answers the canvas mounts
// the live frames that proxy through /prototype/fixture-runnable/ to here.
//
// Binds localhost only. Serves one page with a recognizable heading so the test
// can assert the real frame mounted. Exits cleanly on SIGTERM (how Stop kills it).
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? process.env.PORT ?? 3197);

const PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Runnable Fixture</title></head>
<body>
  <h1>Runnable Fixture Home</h1>
  <p>Served by the hermetic tiny dev server.</p>
  <button data-component="button">Go</button>
</body>
</html>`;

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(PAGE);
});

// 127.0.0.1 only — never expose beyond localhost.
server.listen(port, "127.0.0.1", () => {
  console.log(`tiny-server listening on http://127.0.0.1:${port}/`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
