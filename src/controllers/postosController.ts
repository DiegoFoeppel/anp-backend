import { Request, Response } from "express";
import { postos, postosApi } from "../db/schema";
import { db } from "../db";
import { getColumns, sql } from "drizzle-orm";
import { getMunicipios } from "./lpcController";

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

export const getCitiesAndStates = async (req: Request, res: Response) => {
  try {
    const data = await db
      .selectDistinct({ municipio: postosApi.municipio, estado: postosApi.uf })
      .from(postosApi);

    return res.status(200).json({ cidades: data });
    // exemplo quero pegar todos postos de fortaleza, só que o detalhe é,
    // pra fazer isso já tem que ter o join pra ter preços
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};

export const getAllGeojson = async (req: Request, res: Response) => {
  try {
    const data = await db.execute(sql`
              SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(
        json_build_object(
            'type', 'Feature',
            'geometry', json_build_object(
                'type', 'Point',
                'coordinates', json_build_array(
                    p.geo_longitude,
                    p.geo_latitude
                )
            ),
            'properties', json_build_object(
                'id', p.id
            )
        )
    )
) 
FROM postos_combustivel.postos p
WHERE p.municipio = 'SAO PAULO';
      `);

    return res.status(200).json(data.rows[0].json_build_object);
    // exemplo quero pegar todos postos de fortaleza, só que o detalhe é,
    // pra fazer isso já tem que ter o join pra ter preços
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};
