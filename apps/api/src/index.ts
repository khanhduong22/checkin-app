import { app } from "./app";

const port = Number(process.env.PORT) || 4000;

if (typeof (globalThis as any).Bun === "undefined") {
  import("@hono/node-server").then(({ serve }) => {
    serve({
      fetch: app.fetch,
      port,
    });
    console.log(`[Checkin API] Running on Node.js at port ${port}`);
  });
} else {
  console.log(`[Checkin API] Running on Bun at port ${port}`);
}

export default {
  port,
  fetch: app.fetch,
};
