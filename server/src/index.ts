import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import "./db.js";
import { router } from "./routes.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const app = express();
const port = Number(process.env.PORT ?? 3000);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(dirname, "../../client/dist");
const allowedOrigins = (process.env.APP_ORIGIN ?? "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"));
    }
  })
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", router);

app.use(express.static(clientDist));
app.get("*", (_req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    res.sendFile(path.join(clientDist, "index.html"), (error) => {
      if (error) next(error);
    });
    return;
  }
  next();
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", issues: error.flatten() });
    return;
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`FridayRun API listening on http://localhost:${port}`);
});
