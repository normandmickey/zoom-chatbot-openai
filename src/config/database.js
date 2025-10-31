import pkg from "pg";
import * as dotenv from "dotenv";
import settings from "../constants/settings.json" assert { type: "json" };

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
 ssl: true,
 host:
  process.env.POSTGRES_HOST ||
  "ep-lingering-unit-a44o6rm8.us-east-1.pg.koyeb.app",
 user: process.env.POSTGRES_USER || "koyeb-adm",
 password: process.env.POSTGRES_PASSWORD,
 database: process.env.POSTGRES_DATABASE || "langgraph_checkpointer",
 ...settings.database.poolConfig,
});

pool.on("error", (err) => {
 console.error("Unexpected error on idle client", err);
 process.exit(-1);
});

export default pool;
