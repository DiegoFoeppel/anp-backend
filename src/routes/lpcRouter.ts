import Router from "express";
import {
  getAll,
  getByCnpj,
  getByFilter,
  getMunicipios,
  getPostosByCoordinates,
  getTeste,
} from "../controllers/lpcController";

const router = Router();

router.get("/", getAll);
router.get("/teste", getTeste);
router.get("/coordinates", getPostosByCoordinates);
router.get("/:id", getByCnpj);
router.get("/municipios", getMunicipios);

export default router;
