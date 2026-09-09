import Router from "express";
import { getAll } from "../controllers/postosController";

const router = Router();

router.get("/", getAll);

export default router;

// router.get("/:city", getPostosByCity);
// router.get("/:city", getPostosByCity);
// router.get("/:city", getPostosByCity);
// router.get("/:cnpj", getPostoByCnpj);
