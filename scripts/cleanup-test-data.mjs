/**
 * One-shot cleanup of test Drive data (DB + old S3 keys under drive/).
 * Run: docker exec -w /app graphandco-drive-dev node scripts/cleanup-test-data.mjs
 */
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import mysql from "mysql2/promise";

function readBool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function getLocationConfig(location) {
  const prefix = location === "public" ? "PUBLIC" : "SIXMYK";
  const endpoint =
    process.env[`STORAGE_${prefix}_ENDPOINT`] ||
    process.env.STORAGE_ENDPOINT ||
    "https://s3.graphandco.com";

  return {
    location,
    key: process.env[`STORAGE_${prefix}_KEY`],
    secret: process.env[`STORAGE_${prefix}_SECRET`],
    bucket: process.env[`STORAGE_${prefix}_BUCKET`] || location,
    region: process.env[`STORAGE_${prefix}_REGION`] || "us-east-1",
    endpoint,
    forcePathStyle: readBool(
      process.env[`STORAGE_${prefix}_FORCE_PATH_STYLE`] ??
        process.env[`STORAGE_${prefix}_PATH_STYLE`],
      true
    ),
  };
}

function createClient(config) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.key,
      secretAccessKey: config.secret,
    },
  });
}

async function deletePrefix(location, prefix) {
  const config = getLocationConfig(location);
  if (!config.key || !config.secret) {
    console.warn(`[${location}] credentials manquantes, skip S3`);
    return 0;
  }

  const client = createClient(config);
  let deleted = 0;
  let token;

  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );

    const contents = listed.Contents || [];
    for (const object of contents) {
      if (!object.Key) continue;
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: object.Key,
        })
      );
      deleted += 1;
      console.log(`[${location}] deleted ${object.Key}`);
    }

    token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (token);

  return deleted;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "mysql",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "drive",
    password: process.env.DB_PASSWORD || "drive",
    database: process.env.DB_DATABASE || "graphandco_drive",
  });

  const [files] = await connection.query(
    `SELECT id, storage_key, storage_location FROM files`
  );

  console.log(`DB files: ${files.length}`);

  for (const file of files) {
    if (!file.storage_key) continue;
    const location = file.storage_location || "sixmyk";
    const config = getLocationConfig(location);
    if (!config.key || !config.secret) continue;
    const client = createClient(config);
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: file.storage_key,
        })
      );
      console.log(`[${location}] deleted ${file.storage_key}`);
    } catch (error) {
      console.warn(`[${location}] skip ${file.storage_key}: ${error.message}`);
    }
  }

  await connection.query(`DELETE FROM files`);
  await connection.query(`DELETE FROM folders WHERE id NOT IN (1, 2)`);
  await connection.end();
  console.log("DB reset: roots 1/2 kept, files + other folders removed");

  const sixmykDeleted = await deletePrefix("sixmyk", "drive/");
  const publicDeleted = await deletePrefix("public", "drive/");
  console.log(
    `Cleanup done. Extra prefix deletions: sixmyk=${sixmykDeleted}, public=${publicDeleted}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
