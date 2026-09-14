import Router from "express";
import {
  getAll,
  getAllGeojson,
  getCitiesAndStates,
} from "../controllers/postosController";

const router = Router();

router.get("/", getAll);
router.get("/geojson", getAllGeojson);
router.get("/cidades", getCitiesAndStates);

export default router;

// router.get("/:city", getPostosByCity);
// router.get("/:city", getPostosByCity);
// router.get("/:city", getPostosByCity);
// router.get("/:cnpj", getPostoByCnpj);
