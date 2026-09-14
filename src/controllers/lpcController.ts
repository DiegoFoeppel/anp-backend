import { postos, postosApi, precosLpc } from "../db/schema";
import { and, eq, sql, SQL } from "drizzle-orm";
import { getByCoordinates, getPostosEPrecos, groupData } from "../db/queries";

import { Request, Response } from "express";
import { db, mySchema } from "../db"; // ajuste o caminho conforme seu projeto

// export const getAll = async (req: Request, res: Response) => {
//   try {
//     const { municipio, produto } = req.query;

//     // Monta a cláusula WHERE dinamicamente, com placeholders seguros (sem risco de SQL injection)
//     const filtros: any[] = [];
//     if (municipio) {
//       filtros.push(sql`p.municipio = ${String(municipio).toUpperCase()}`);
//     }
//     if (produto) {
//       filtros.push(sql`pr.produto = ${String(produto)}`);
//     }

//     const whereClause =
//       filtros.length > 0 ? sql`WHERE ${sql.join(filtros, sql` AND `)}` : sql``;

//     // Query principal:
//     // - LEFT JOIN LATERAL + DISTINCT ON traz só o preço MAIS RECENTE de cada produto,
//     //   resolvendo o bug de pegar preço de semana antiga por acaso.
//     const result = await db.execute(sql`
//       SELECT
//         p.cnpj,
//         p.razao_social AS "razaoSocial",
//         p.distribuidora,
//         p.endereco,
//         p.municipio AS cidade,
//         p.cep,
//         p.bairro,
//         p.latitude AS lat,
//         p.longitude AS lng,
//         pr.produto,
//         pr.preco_revenda AS preco,
//         pr.data_coleta AS "dataColeta"
//       FROM postos_combustivel.postos_via_api p
//       LEFT JOIN LATERAL (
//         SELECT DISTINCT ON (produto) produto, preco_revenda, data_coleta
//         FROM postos_combustivel.precos_lpc
//         WHERE cnpj = p.cnpj
//         ORDER BY produto, data_coleta DESC
//       ) pr ON true
//       ${whereClause}
//     `);

//     const rows = result.rows as Array<{
//       cnpj: string | null;
//       razaoSocial: string | null;
//       distribuidora: string | null;
//       endereco: string | null;
//       cidade: string | null;
//       cep: string | null;
//       bairro: string | null;
//       lat: number | null;
//       lng: number | null;
//       produto: string | null;
//       preco: string | null;
//       dataColeta: string | null;
//     }>;

//     // Sets para coletar os filtros únicos durante a iteração
//     const setBairros = new Set<string>();
//     const setBandeiras = new Set<string>();

//     // Agrupa os postos e extrai os filtros em um único loop
//     const accPostos: Record<
//       string,
//       {
//         cnpj: string;
//         razaoSocial: string | null;
//         distribuidora: string | null;
//         endereco: string | null;
//         cidade: string | null;
//         cep: string | null;
//         bairro: string | null;
//         lat: number | null;
//         lng: number | null;
//         precos: {
//           produto: string;
//           preco: string | null;
//           dataColeta: string | null;
//         }[];
//       }
//     > = {};

//     for (const row of rows) {
//       // Guarda contra CNPJ nulo — não dá pra usar como chave de agrupamento
//       if (!row.cnpj) continue;

//       // Popula os Sets de filtros (ignorando nulos/vazios)
//       if (row.bairro) setBairros.add(row.bairro);
//       if (row.distribuidora) setBandeiras.add(row.distribuidora);

//       const key = row.cnpj;

//       // Inicializa o posto no acumulador caso ainda não exista
//       if (!accPostos[key]) {
//         accPostos[key] = {
//           cnpj: row.cnpj,
//           razaoSocial: row.razaoSocial,
//           distribuidora: row.distribuidora,
//           endereco: row.endereco,
//           cidade: row.cidade,
//           cep: row.cep,
//           bairro: row.bairro,
//           lat: row.lat,
//           lng: row.lng,
//           precos: [],
//         };
//       }

//       // Adiciona o preço — já vem deduplicado por produto (mais recente) direto do SQL,
//       // então não precisa mais checar "produtoJaExiste" aqui.
//       if (row.produto) {
//         accPostos[key].precos.push({
//           produto: row.produto,
//           preco: row.preco,
//           dataColeta: row.dataColeta,
//         });
//       }
//     }

//     return res.status(200).json({
//       postos: Object.values(accPostos),
//       cidade: municipio ?? null,
//       filtros: {
//         bairros: Array.from(setBairros).sort(),
//         bandeiras: Array.from(setBandeiras).sort(),
//       },
//     });
//   } catch (err) {
//     console.error("Erro em getAll:", err);
//     return res.status(500).json({
//       error: "Erro interno do servidor",
//       details: err instanceof Error ? err.message : String(err),
//     });
//   }
// };

export const getMunicipios = async (req: Request, res: Response) => {
  try {
    const municipios = await db
      .selectDistinct({ municipio: precosLpc.municipio })
      .from(precosLpc);

    return res.status(200).json(municipios);
    // exemplo quero pegar todos postos de fortaleza, só que o detalhe é,
    // pra fazer isso já tem que ter o join pra ter preços
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};

export const getPostosByCoordinates = async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) return;

    const postos = await getByCoordinates(lat, lng);

    const postosAgrupados = await groupData(postos.rows);

    const { accPostos, setBandeiras, setBairros } = postosAgrupados;

    return res.status(200).json({
      postos: Object.values(accPostos),
      totalPostos: postos.rowCount,
      filtros: {
        bairros: Array.from(setBairros).sort(),
        bandeiras: Array.from(setBandeiras).sort(),
      },
    });
    // exemplo quero pegar todos postos de fortaleza, só que o detalhe é,
    // pra fazer isso já tem que ter o join pra ter preços
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};

export const getAll = async (req: Request, res: Response) => {
  try {
    const { municipio, cnpj, produto } = req.query;

    const filtros: any[] = [];

    if (municipio) {
      filtros.push(sql`p.municipio = ${String(municipio).toUpperCase()}`);
    }

    if (cnpj) {
      filtros.push(sql`p.cnpj = ${String(cnpj)}`);
    }

    if (produto) {
      filtros.push(sql`pr.produto = ${String(produto)}`);
    }

    const whereClause =
      filtros.length > 0 ? sql`WHERE ${sql.join(filtros, sql` AND `)}` : sql``;

    const dados = await getPostosEPrecos(whereClause);

    const postosAgrupados = await groupData(dados.rows);

    const { accPostos, setBandeiras, setBairros } = postosAgrupados;

    //Retorna ordenado alfabeticamente para facilitar o uso no Frontend
    return res.status(200).json({
      postos: Object.values(accPostos),
      cidade: municipio,
      filtros: {
        bairros: Array.from(setBairros).sort(),
        bandeiras: Array.from(setBandeiras).sort(),
      },
    });
  } catch (err) {
    console.error("Erro em getAll:", err);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getTeste = async (req: Request, res: Response) => {
  try {
    const { municipio, produto } = req.query;

    console.log("muN", municipio);

    const conditions = [];

    if (municipio) {
      conditions.push(eq(postos.municipio, String(municipio).toUpperCase()));
    }

    if (produto) {
      conditions.push(eq(precosLpc.produto, String(produto)));
    }

    const rows = await db
      .select({
        id: postos.id,
        cnpj: postos.cnpjCpf,
        razaoSocial: postos.razaoSocial,
        nome: postos.nome,
        distribuidora: postos.prcDistribuidora,
        endereco: postos.endereco,
        cidade: postos.municipio,
        cep: postos.cep,
        bairro: postos.bairro,
        lat: postos.geoLatitude,
        lng: postos.geoLongitude,
        produto: precosLpc.produto,
        preco: precosLpc.precoRevenda,
        dataColeta: precosLpc.dataColeta,
      })
      .from(postos)
      .leftJoin(precosLpc, eq(precosLpc.cnpj, postos.cnpjCpf))
      .where(and(...conditions));

    console.log("rows", rows[0]);

    if (!rows) {
      return res.status(400).json({ error: "Filtro errado" });
    }

    // agrupa por posto, aninha os preços
    const postosAgrupados = Object.values(
      rows.reduce(
        (acc, row) => {
          const key = row.cnpj ?? "sem-cnpj";
          if (!acc[key]) {
            acc[key] = {
              id: row.id,
              cnpj: row.cnpj,
              razaoSocial: row.razaoSocial,
              nome: row.nome,
              cep: row.cep,
              distribuidora: row.distribuidora,
              endereco: row.endereco,
              cidade: row.cidade,
              bairro: row.bairro,
              lat: row.lat,
              lng: row.lng,
              precos: [],
            };
          }

          const produtoJaExiste = acc[key].precos.some(
            (p: any) => p.produto === row.produto,
          );

          if (!produtoJaExiste && row.produto) {
            acc[key].precos.push({
              produto: row.produto,
              preco: row.preco,
              dataColeta: row.dataColeta,
            });
          }
          return acc;
        },
        {} as Record<string, any>,
      ),
    );

    const bairros = new Set(rows.map((item) => item.bairro));
    const distribuidoras = new Set(rows.map((item) => item.distribuidora));
    const ceps = new Set(rows.map((item) => item.cep));

    return res.status(200).json({
      postos: postosAgrupados,
      filtros: { bairros, distribuidoras, ceps },
    });
    // exemplo quero pegar todos postos de fortaleza, só que o detalhe é,
    // pra fazer isso já tem que ter o join pra ter preços
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};

export const getByCnpj = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log("teste", req.params);

    const postos = await db
      .select()
      .from(precosLpc)
      .where(eq(precosLpc.cnpj, String(id)));

    // const data = await db.select().from(precosLpc);

    return res.status(200).json(postos);
    // exemplo quero pegar todos postos de fortaleza, só que o detalhe é,
    // pra fazer isso já tem que ter o join pra ter preços
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};

export const getByFilter = async (req: Request, res: Response) => {
  try {
    const filters = req.query;

    console.log("filt", req.query);

    return res.status(200).json({ messagem: "nada ainda" });
    // exemplo quero pegar todos postos de fortaleza, só que o detalhe é,
    // pra fazer isso já tem que ter o join pra ter preços
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};
