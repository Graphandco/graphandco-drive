import mysql from "mysql2/promise";

let pool;

function getDbConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60_000,
    enableKeepAlive: true,
  };
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig());
  }

  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

export async function pingDatabase() {
  const connection = await getPool().getConnection();

  try {
    await connection.ping();
    return { ok: true };
  } finally {
    connection.release();
  }
}
