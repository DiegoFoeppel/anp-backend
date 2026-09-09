import { Request, Response } from "express";
import { postos } from "../db/schema";
import { db } from "../db";
import { getColumns } from "drizzle-orm";

const { ogcFid, wkbGeometry, ...rest } = getColumns(postos);

export const getAll = async (req: Request, res: Response) => {
  try {
    const data = await db
      .select({ ...rest })
      .from(postos)
      .limit(20);

    return res.status(200).json({ postos: data });
    // exemplo quero pegar todos postos de fortaleza, só que o detalhe é,
    // pra fazer isso já tem que ter o join pra ter preços
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};
