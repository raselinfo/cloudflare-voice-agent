import { prettyJSON } from "hono/pretty-json";
import { logger } from "hono/logger";
import { Hono } from "hono";
import { cors } from "hono/cors";

// Use the globally defined Env type from worker-configuration.d.ts
type Bindings = Env;

const app = new Hono<{
  Bindings: Bindings;
}>();

// Add middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 * routes
 */
app.get("/", async (c) => {
  const html = await Bun.file("./public/index.html").text();
  return c.html(html, 200, {
    // "Cache-Control": "public, max-age=3600",
  });
});

/**
 * not found handler
 */

app.notFound((c) => {
  return c.json(
    {
      error: "Not Found",
    },
    404
  );
});

app.onError((err, c) => {
  const errorMessage =
    c.env.NODE_ENV === "development" ? err?.message : "Internal Server Error";
  console.error(`Error: ${errorMessage}`);
  return c.json({
    error: errorMessage,
  });
});

export default {
  port: 4000,
  fetch: app.fetch,
};
