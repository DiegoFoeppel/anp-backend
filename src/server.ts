import express from "express";
import postosRouter from "./routes/postosRouter";
import lpcRouter from "./routes/lpcRouter";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/postos", postosRouter);
app.use("/api/lpc", lpcRouter);

export { app };
export default app;
