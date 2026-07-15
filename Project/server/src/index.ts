import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { attachUser } from "./auth";
import { authRouter } from "./routes/auth";
import { attributesRouter } from "./routes/attributes";
import { positionsRouter } from "./routes/positions";
import { profileRouter, tagsRouter } from "./routes/profile";
import { cvsRouter } from "./routes/cvs";
import { homeRouter, searchRouter, usersRouter } from "./routes/misc";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachUser);

app.use("/api/auth", authRouter);
app.use("/api/attributes", attributesRouter);
app.use("/api/positions", positionsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/cvs", cvsRouter);
app.use("/api/search", searchRouter);
app.use("/api/home", homeRouter);
app.use("/api/users", usersRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Serve the built client in production (single Render web service).
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API listening on :${port}`));
