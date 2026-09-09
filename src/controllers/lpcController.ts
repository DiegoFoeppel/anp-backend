import { Response, Request } from "express";
import { db } from "../db";
import { postos, precosLpc } from "../db/schema";
import { and, eq, SQL } from "drizzle-orm";

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

export const getAll = async (req: Request, res: Response) => {
  try {
    const { municipio, produto } = req.query;

    const conditions: SQL[] = [];

    if (municipio) {
      conditions.push(eq(postos.municipio, String(municipio).toUpperCase()));
    }

    if (produto) {
      conditions.push(eq(precosLpc.produto, String(produto)));
    }

    // Executa a query principal
    const rows = await db
      .select({
        id: postos.id,
        cnpj: postos.cnpjCpf,
        razaoSocial: postos.razaoSocial,
        nome: postos.nome,
        distribuidora: postos.prcDistribuidora,
        endereco: postos.endereco,
        cidade: postos.municipio,
        bandeira: precosLpc.bandeira,
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
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Sets para coletar os filtros únicos durante a iteração
    const setBairros = new Set<string>();
    const setDistribuidoras = new Set<string>();

    // Agrupa os postos e extrai os filtros em UM ÚNICO LOOP
    const accPostos: Record<string, any> = {};

    for (const row of rows) {
      // 1. Popula os Sets de Filtros (ignorando nulos ou vazios)
      if (row.bairro) setBairros.add(row.bairro);
      if (row.distribuidora) setDistribuidoras.add(row.distribuidora);

      const key = row.cnpj ?? `sem-cnpj-${row.id}`;

      // 2. Inicializa o posto no acumulador caso ainda não exista
      if (!accPostos[key]) {
        accPostos[key] = {
          id: row.id,
          cnpj: row.cnpj,
          razaoSocial: row.razaoSocial,
          nome: row.nome,
          cep: row.cep,
          bandeira: row.bandeira,
          distribuidora: row.distribuidora,
          endereco: row.endereco,
          cidade: row.cidade,
          bairro: row.bairro,
          lat: row.lat,
          lng: row.lng,
          dataColeta: row.dataColeta,
          precos: [],
        };
      }

      // 3. Adiciona o preço se ele existir e ainda não estiver na lista
      if (row.produto && row.dataColeta) {
        const produtoJaExiste = accPostos[key].precos.some(
          (p: any) => p.produto === row.produto,
        );

        if (!produtoJaExiste) {
          accPostos[key].precos.push({
            produto: row.produto,
            preco: row.preco,
          });
        }
      }
    }

    // Retorna ordenado alfabeticamente para facilitar o uso no Frontend
    return res.status(200).json({
      postos: Object.values(accPostos),
      cidade: municipio,
      filtros: {
        bairros: Array.from(setBairros).sort(),
        distribuidoras: Array.from(setDistribuidoras).sort(),
        // ceps: Array.from(setCeps).sort(),
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
              dataColeta: row.dataColeta,
              precos: [],
            };
          }

          const produtoJaExiste = acc[key].precos.some(
            (p: any) => p.produto === row.produto,
          );

          if (!produtoJaExiste && row.dataColeta) {
            acc[key].precos.push({
              produto: row.produto,
              preco: row.preco,
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
