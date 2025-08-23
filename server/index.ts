import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.

  const host = "0.0.0.0";
  const startPort = parseInt(process.env.PORT || "5000", 10);

  async function listenWithRetry(srv: import("http").Server, portStart: number, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const tryPort = portStart + i;

      // Wrap listen in a promise that resolves on success or rejects on error
      const p = new Promise<number>((resolve, reject) => {
        const onError = (err: any) => {
          srv.removeListener("listening", onListening);
          reject(err);
        };

        const onListening = () => {
          srv.removeListener("error", onError);
          resolve(tryPort);
        };

        srv.once("error", onError);
        try {
          srv.listen({ port: tryPort, host }, () => {
            onListening();
          });
        } catch (err) {
          srv.removeListener("error", onError);
          reject(err);
        }
      });

      try {
        const boundPort = await p;
        return boundPort;
      } catch (err: any) {
        // If port in use, try next one (development only)
        if (err && err.code === "EADDRINUSE") {
          log(`port ${tryPort} in use, trying next port...`);
          // continue loop to try next port
        } else {
          // For other errors, rethrow
          throw err;
        }
      }
    }

    throw new Error(`Unable to bind server after ${maxAttempts} attempts starting at ${portStart}`);
  }

  try {
    const boundPort = await listenWithRetry(server, startPort, 20);
    log(`serving on port ${boundPort}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
