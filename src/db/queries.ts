import { sql } from "drizzle-orm";
import { db, mySchema } from ".";

export const getByCoordinates = async (lat, lng, raioMetros = 5000) => {
  const result = await db.execute(sql`

    SELECT 
        p.codigo_simp as "codigoSimp",
        p.cnpj,
        p.razao_social AS "razaoSocial",
        p.distribuidora,
        p.endereco,
        p.municipio AS cidade,
        p.cep,
        p.bairro,
        p.latitude AS lat,
        p.longitude AS lng,
        pr.produto,
        pr.preco_revenda AS preco,
        pr.data_coleta AS "dataColeta",
        ST_Distance(
        ST_MakePoint(p.longitude, p.latitude)::geography,
        ST_MakePoint(${lng}, ${lat})::geography
      ) AS distancia_metros
      FROM postos_combustivel.postos_via_api p
        LEFT JOIN LATERAL (
            SELECT DISTINCT ON (produto) produto, preco_revenda, data_coleta
            FROM postos_combustivel.precos_lpc
            WHERE cnpj = p.cnpj
            ORDER BY produto, data_coleta DESC
        ) pr ON true
     WHERE ST_DWithin(
      ST_MakePoint(p.longitude, p.latitude)::geography,
      ST_MakePoint(${lng}, ${lat})::geography,
      ${raioMetros}
    )
    ORDER BY distancia_metros ASC`);

  return result;
};

export const getPostosEPrecos = async (whereClause) => {
  const result = await db.execute(sql`
      SELECT 
        p.codigo_simp as "codigoSimp",
        p.cnpj,
        p.razao_social AS "razaoSocial",
        p.distribuidora,
        p.endereco,
        p.municipio AS cidade,
        p.cep,
        p.bairro,
        p.latitude AS lat,
        p.longitude AS lng,
        pr.produto,
        pr.preco_revenda AS preco,
        pr.data_coleta AS "dataColeta"
      FROM postos_combustivel.postos_via_api p
      LEFT JOIN LATERAL (
        SELECT DISTINCT ON (produto) produto, preco_revenda, data_coleta
        FROM postos_combustivel.precos_lpc
        WHERE cnpj = p.cnpj
        ORDER BY produto, data_coleta DESC
      ) pr ON true
      ${whereClause}
    `);

  return result;
};

type PostoInfo = {
  codigoSimp: string;
  cnpj: string | null;
  razaoSocial: string | null;
  distribuidora: string | null;
  endereco: string | null;
  cidade: string | null;
  cep: string | null;
  bairro: string | null;
  lat: number | null;
  lng: number | null;
  produto: string | null;
  preco: string | null;
  dataColeta: string | null;
};

export const groupData = async (dados) => {
  if (!dados) return;

  const rows = dados as Array<PostoInfo>;

  const setBairros = new Set<string>();
  const setBandeiras = new Set<string>();

  const accPostos: Record<
    string,
    {
      codigoSimp: string;
      cnpj: string;
      razaoSocial: string | null;
      distribuidora: string | null;
      endereco: string | null;
      cidade: string | null;
      cep: string | null;
      bairro: string | null;
      lat: number | null;
      lng: number | null;
      precos: {
        produto: string;
        preco: string | null;
        dataColeta: string | null;
      }[];
    }
  > = {};

  // Sets para coletar os filtros únicos durante a iteração
  for (const row of rows) {
    // Guarda contra CNPJ nulo — não dá pra usar como chave de agrupamento
    if (!row.cnpj) continue;

    // Popula os Sets de filtros (ignorando nulos/vazios)
    if (row.bairro) setBairros.add(row.bairro);
    if (row.distribuidora) setBandeiras.add(row.distribuidora);

    const key = row.cnpj;

    // Inicializa o posto no acumulador caso ainda não exista
    if (!accPostos[key]) {
      accPostos[key] = {
        codigoSimp: row.codigoSimp,
        cnpj: row.cnpj,
        razaoSocial: row.razaoSocial,
        distribuidora: row.distribuidora,
        endereco: row.endereco,
        cidade: row.cidade,
        cep: row.cep,
        bairro: row.bairro,
        lat: row.lat,
        lng: row.lng,
        precos: [],
      };
    }

    //Adiciona o preço — já vem deduplicado por produto (mais recente) direto do SQL,
    // então não precisa mais checar "produtoJaExiste" aqui.
    if (row.produto) {
      accPostos[key].precos.push({
        produto: row.produto,
        preco: row.preco,
        dataColeta: row.dataColeta,
      });
    }
  }

  return { accPostos, setBairros, setBandeiras };
};
