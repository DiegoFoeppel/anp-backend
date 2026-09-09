import Router from "express";
import {
  getAll,
  getByCnpj,
  getByFilter,
  getMunicipios,
} from "../controllers/lpcController";

const router = Router();

router.get("/", getAll);
router.get("/:id", getByCnpj);
router.get("/municipios", getMunicipios);

export default router;
