import {
  pgSchema,
  text,
  date,
  serial,
  integer,
  numeric,
  doublePrecision,
  customType,
  bigint,
  char,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// Tipo customizado pra coluna de geometria do PostGIS (wkb_geometry).
// O Drizzle não tem um tipo "geometry" nativo em todas as versões, então
// declaramos manualmente como texto no nível do TS (você vai converter com
// ST_AsGeoJSON/ST_AsText nas queries), mas mapeado pro tipo real do Postgres.
const geometry = customType<{ data: string }>({
  dataType() {
    return "geometry(Point, 4326)";
  },
});

// Schema do Postgres (equivalente ao "postos_combustivel" que você já criou no banco)
export const postosCombustivel = pgSchema("postos_combustivel");

// Tabela: revendedores
// Fonte: Dados Cadastrais dos Revendedores Varejistas de Combustíveis Automotivos (ANP)
export const revendedores = postosCombustivel.table("revendedores", {
  codigoIsimp: text("codigo_isimp").primaryKey(),
  autorizacao: text("autorizacao"),
  dataPublicacao: date("data_publicacao"),
  razaoSocial: text("razao_social"),
  cnpj: text("cnpj"), // TEXT proposital — nunca number, pra não perder zero à esquerda / virar notação científica
  endereco: text("endereco"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cep: text("cep"), // TEXT — mesmo motivo do CNPJ, CEP pode começar com zero
  uf: text("uf"),
  municipio: text("municipio"),
  bandeira: text("bandeira"),
  dataVinculacao: date("data_vinculacao"),
});

// Tabela: precos_lpc
// Fonte: Levantamento de Preços de Combustíveis (ANP) — atualização semanal
//
// OBS: essa tabela não tem chave natural confiável sozinha (o mesmo CNPJ se repete
// uma vez por produto, e ao longo do tempo por data_coleta). Adicionei um "id" serial
// como PK técnica. Se preferir uma PK composta (cnpj + produto + data_coleta), me avisa
// que ajusto — mas serial é mais simples de trabalhar no dia a dia com Drizzle.
export const precosLpc = postosCombustivel.table("precos_lpc", {
  //   id: serial("id").primaryKey(),
  cnpj: text("cnpj"),
  razaoSocial: text("razao_social"),
  fantasia: text("fantasia"),
  endereco: text("endereco"),
  numero: text("numero"), // TEXT, não integer — porque tem valores tipo "S/N"
  complemento: text("complemento"),
  bairro: text("bairro"),
  cep: text("cep"),
  municipio: text("municipio"),
  estado: text("estado"), // nome completo do estado (ex: "MATO GROSSO DO SUL"), não sigla
  bandeira: text("bandeira"),
  produto: text("produto"),
  unidadeMedida: text("unidade_medida"),
  precoRevenda: text("preco_revenda"), // valor cru como veio do CSV (ex: "7,29"), com vírgula
  //   precoRevendaNum: numeric("preco_revenda_num", { precision: 10, scale: 3 }), // valor convertido pra número de verdade
  dataColeta: date("data_coleta"),
});

// Tabela: postos
// Fonte: GeoMapsANP (camada geoespacial de todos os postos/instalações do Brasil)
// Tabela grande — considere criar índice espacial (GIST) em wkb_geometry se ainda não existir:
//   CREATE INDEX IF NOT EXISTS postos_geom_idx ON postos_combustivel.postos USING GIST (wkb_geometry);
export const postos = postosCombustivel.table("postos", {
  ogcFid: serial("ogc_fid").primaryKey(), // PK técnica gerada pelo ogr2ogr na importação
  wkbGeometry: geometry("wkb_geometry"),
  id: text("id"), // id original do dataset ANP (não confundir com ogc_fid)
  identificador: text("identificador"),
  tipoDeInstalacao: text("tipo_de_instalacao"),
  cnpjCpf: text("cnpj_cpf"), // TEXT — mesmo cuidado dos outros CNPJs (evitar notação científica/zero perdido)
  cnpjOriginal: text("cnpj_original"), // backup do CNPJ antes de qualquer correção/UPDATE
  razaoSocial: text("razao_social"),
  nome: text("nome"),
  nomeReduzido: text("nome_reduzido"),
  telefone: text("telefone"),
  eMail: text("e_mail"),
  endereco: text("endereco"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  municipio: text("municipio"),
  uf: text("uf"),
  cep: text("cep"),
  situacaoAtual: text("situacao_atual"),
  prcTipo: text("prc_tipo"),
  prcDistribuidora: text("prc_distribuidora"),
  glpClasseDeArmazenamento: text("glp_classe_de_armazenamento"),
  glpDistribuidora: text("glp_distribuidora"),
  geoLatitude: doublePrecision("geo_latitude"),
  geoLongitude: doublePrecision("geo_longitude"),
  geoLatitudeAnp4c: doublePrecision("geo_latitude_anp4c"),
  geoLongitudeAnp4c: doublePrecision("geo_longitude_anp4c"),
  geoEpsg: integer("geo_epsg"),
  geoSrc: text("geo_src"),
  geoDataDeObtencao: date("geo_data_de_obtencao"),
  geoOrigemDaInformacao: text("geo_origem_da_informacao"),
  geoSituacaoConstatada: text("geo_situacao_constatada"),
});

export const postoProdutos = postosCombustivel.table("posto_produtos", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  codigoSimp: bigint("codigo_simp", { mode: "number" }).notNull(),
  produto: text("produto").notNull(),
  tancagem: numeric("tancagem"),
  unidadeMedidaTancagem: text("unidade_medida_tancagem"),
  qtdeBicos: integer("qtde_bicos"),
});

export const postosApi = postosCombustivel.table("postos_via_api", {
  codigoSimp: bigint("codigo_simp", { mode: "number" }).primaryKey(),

  autorizacao: text("autorizacao"),
  dataPublicacao: date("data_publicacao"),

  razaoSocial: text("razao_social").notNull(),
  cnpj: char("cnpj", { length: 14 }).notNull(),

  endereco: text("endereco"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cep: char("cep", { length: 8 }),
  uf: char("uf", { length: 2 }),
  municipio: text("municipio"),

  distribuidora: text("distribuidora"),

  dataVinculacao: date("data_vinculacao"),
  classe: text("classe"),

  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),

  validacao: text("validacao"),
  estimativaAcuracia: text("estimativa_acuracia"),
  srid: integer("srid"),
  src: text("src"),
  dataObtencao: date("data_obtencao"),
  origemInformacao: text("origem_informacao"),
  situacaoConstatada: text("situacao_constatada"),
  observacao: text("observacao"),
  statusSigaf: text("status_sigaf"),

  inadimplenciaPmqc: jsonb("inadimplencia_pmqc")
    .$type<unknown[]>()
    .notNull()
    .default([]),

  raw: jsonb("raw").$type<Record<string, unknown>>().notNull(),

  insertedAt: timestamp("inserted_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});
