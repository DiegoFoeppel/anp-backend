import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgSchema } from "drizzle-orm/pg-core";

export const mySchema = pgSchema("postos_combustivel");

export const db = drizzle(process.env.DATABASE_URL!);
