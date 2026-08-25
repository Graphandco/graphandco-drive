import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectAclCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const LOCATION_ENV = {
  sixmyk: "6-MYK",
  public: "PUBLIC",
  regis: "REGIS",
};

/** Lit STORAGE_<prefix>_<suffix>, avec repli SIXMYK pour l’ancien préfixe. */
function storageEnv(location, suffix) {
  const prefix = LOCATION_ENV[location] || LOCATION_ENV.sixmyk;
  const primary = process.env[`STORAGE_${prefix}_${suffix}`];
  if (primary != null && primary !== "") return primary;

  if (location === "sixmyk") {
    const legacy = process.env[`STORAGE_SIXMYK_${suffix}`];
    if (legacy != null && legacy !== "") return legacy;
  }

  return primary;
}

function readBool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

/** Préfixe de clé S3 (ex. "dev") — isole le local sans changer de bucket. */
export function getStorageKeyPrefix() {
  return String(process.env.STORAGE_KEY_PREFIX || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

/**
 * Préfixe une clé S3 avec STORAGE_KEY_PREFIX si défini.
 * Idempotent si la clé commence déjà par le préfixe.
 */
export function withStorageKeyPrefix(key) {
  const prefix = getStorageKeyPrefix();
  const clean = String(key || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!clean) return "";
  if (!prefix) return clean;
  if (clean === prefix || clean.startsWith(`${prefix}/`)) return clean;
  return `${prefix}/${clean}`;
}

/** Reconstruit une clé sous un nouveau préfixe de dossier (conserve le basename). */
export function relocateKey(key, newFolderPrefix) {
  if (!key) return key;
  const base = String(key).split("/").filter(Boolean).pop();
  if (!base) return key;
  const folder = String(newFolderPrefix || "").replace(/^\/+|\/+$/g, "");
  // newFolderPrefix vient déjà de buildFolderPrefix (avec STORAGE_KEY_PREFIX)
  if (!folder) return withStorageKeyPrefix(base);
  return `${folder}/${base}`;
}

/** Copie puis supprime un objet S3 (et ignore NoSuchKey à la source). */
export async function moveObject({ location = "sixmyk", fromKey, toKey }) {
  if (!fromKey || !toKey || fromKey === toKey) {
    return { moved: false };
  }

  const config = getStorageConfig(location);
  const client = getS3Client(location);

  const copyInput = {
    Bucket: config.bucket,
    Key: toKey,
    CopySource: encodeCopySource(config.bucket, fromKey),
    MetadataDirective: "COPY",
  };
  if (location === "public") {
    copyInput.ACL = "public-read";
  }

  try {
    await client.send(new CopyObjectCommand(copyInput));
  } catch (error) {
    const code = error?.name || error?.Code || error?.code;
    if (code === "NoSuchKey" || code === "NotFound") {
      console.warn("moveObject/missing source:", fromKey);
      return { moved: false };
    }
    throw error;
  }

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: fromKey,
      })
    );
  } catch (error) {
    console.warn("moveObject/delete:", fromKey, error?.message || error);
  }

  return { moved: true };
}

/** Marqueur de dossier SeaweedFS (application/x-directory). */
export async function ensureFolderMarker({ location = "sixmyk", prefix }) {
  const normalized = String(prefix || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!normalized) return { created: false };

  const config = getStorageConfig(location);
  const client = getS3Client(location);
  const key = `${normalized}/`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: Buffer.alloc(0),
      ContentType: "application/x-directory",
      ContentLength: 0,
    })
  );

  return { created: true, key };
}

export function getStorageConfig(location = "sixmyk") {
  const endpoint =
    storageEnv(location, "ENDPOINT") ||
    process.env.STORAGE_ENDPOINT ||
    "https://s3.graphandco.com";

  return {
    location,
    driver: storageEnv(location, "DRIVER") || "s3",
    key: storageEnv(location, "KEY"),
    secret: storageEnv(location, "SECRET"),
    bucket: storageEnv(location, "BUCKET") || location,
    region: storageEnv(location, "REGION") || "us-east-1",
    endpoint,
    keyPrefix: getStorageKeyPrefix(),
    forcePathStyle: readBool(
      storageEnv(location, "FORCE_PATH_STYLE") ??
        storageEnv(location, "PATH_STYLE"),
      true
    ),
  };
}

const clients = new Map();

export function getS3Client(location = "sixmyk") {
  if (clients.has(location)) {
    return clients.get(location);
  }

  const config = getStorageConfig(location);

  if (!config.key || !config.secret) {
    throw new Error(`Credentials S3 manquantes pour ${location}.`);
  }

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.key,
      secretAccessKey: config.secret,
    },
  });

  clients.set(location, client);
  return client;
}

function sanitizeFileName(name) {
  return String(name || "file")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);
}

/** Segment de chemin S3 basé sur le vrai nom du dossier */
export function sanitizeFolderSegment(name) {
  const cleaned = String(name || "dossier")
    .trim()
    .replace(/[\/\\]+/g, "-")
    .replace(/\0/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 120);

  return cleaned || "dossier";
}

/**
 * Clé S3 plate : [prefix/]uuid-nom.ext
 * Le bucket isole déjà l’espace ; l’arborescence dossiers vit en base.
 */
export function buildObjectKey({ fileName }) {
  const safeName = `${randomUUID()}-${sanitizeFileName(fileName)}`;
  return withStorageKeyPrefix(safeName);
}

export async function uploadObject({
  location = "sixmyk",
  key,
  body,
  contentType,
  contentLength,
  acl,
}) {
  const config = getStorageConfig(location);
  const client = getS3Client(location);
  const resolvedAcl =
    acl || (location === "public" ? "public-read" : undefined);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
      ...(contentLength != null ? { ContentLength: contentLength } : {}),
      ...(resolvedAcl ? { ACL: resolvedAcl } : {}),
    })
  );

  return {
    location,
    bucket: config.bucket,
    key,
    acl: resolvedAcl || null,
  };
}


/** Tente de rendre un objet lisible anonymement (souvent no-op sur SeaweedFS). */
export async function setObjectPublicAccess({ location = "public", key }) {
  if (!key || location !== "public") {
    return { updated: false };
  }

  const config = getStorageConfig(location);
  const client = getS3Client(location);

  try {
    await client.send(
      new PutObjectAclCommand({
        Bucket: config.bucket,
        Key: key,
        ACL: "public-read",
      })
    );
    return { updated: true };
  } catch (aclError) {
    try {
      // SeaweedFS / S3 partiels : recopier avec ACL + métadonnée touchée
      await client.send(
        new CopyObjectCommand({
          Bucket: config.bucket,
          Key: key,
          CopySource: `${config.bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`,
          ACL: "public-read",
          MetadataDirective: "REPLACE",
          Metadata: { "public-access": "1" },
          ContentType: "application/octet-stream",
        })
      );
      return { updated: true };
    } catch (copyError) {
      console.warn(
        "setObjectPublicAccess:",
        aclError?.message || aclError,
        copyError?.message || copyError
      );
      return { updated: false, error: copyError?.message || aclError?.message };
    }
  }
}

function encodeCopySource(bucket, key) {
  return `${bucket}/${String(key)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

/**
 * Remplace le préfixe d’une clé S3 (début de chemin uniquement).
 * Ex. replaceKeyPrefix("dev/Old/a.jpg", "dev/Old", "dev/New") → "dev/New/a.jpg"
 */
export function replaceKeyPrefix(key, fromPrefix, toPrefix) {
  if (!key) return key;
  const from = String(fromPrefix || "").replace(/\/+$/, "");
  const to = String(toPrefix || "").replace(/\/+$/, "");
  if (!from) return key;
  if (key === from) return to;
  if (key.startsWith(`${from}/`)) return `${to}${key.slice(from.length)}`;
  return key;
}

/**
 * Déplace tous les objets d’un préfixe vers un autre (copy + delete).
 * Utilisé au renommage de dossier.
 */
export async function renamePrefix({
  location = "sixmyk",
  fromPrefix,
  toPrefix,
}) {
  const from = String(fromPrefix || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  const to = String(toPrefix || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  if (!from || !to || from === to) {
    return { moved: 0, mappings: [] };
  }

  // Sécurité : ne jamais opérer sur la racine bucket / seul préfixe env
  const envPrefix = getStorageKeyPrefix();
  if (from === envPrefix || to === envPrefix) {
    throw new Error("Renommage S3 refusé sur le préfixe racine.");
  }

  const config = getStorageConfig(location);
  const client = getS3Client(location);
  const listPrefix = `${from}/`;
  const keys = new Set();

  let token;
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: listPrefix,
        ContinuationToken: token,
      })
    );
    for (const object of listed.Contents || []) {
      if (object.Key) keys.add(object.Key);
    }
    token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (token);

  // Marqueur dossier éventuel (SeaweedFS) — uniquement s’il existe vraiment
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: from,
      })
    );
    keys.add(from);
  } catch {
    // Pas d’objet dossier : normal sur la plupart des backends S3
  }

  const mappings = [];
  for (const key of keys) {
    const nextKey = replaceKeyPrefix(key, from, to);
    if (!nextKey || nextKey === key) continue;
    mappings.push({ from: key, to: nextKey });
  }

  if (!mappings.length) {
    return { moved: 0, mappings: [] };
  }

  // Copies d’abord (enfants avant / ordre stable)
  mappings.sort((a, b) => a.from.length - b.from.length || a.from.localeCompare(b.from));

  let copied = 0;
  for (const { from: sourceKey, to: destKey } of mappings) {
    const copyInput = {
      Bucket: config.bucket,
      Key: destKey,
      CopySource: encodeCopySource(config.bucket, sourceKey),
      MetadataDirective: "COPY",
    };
    if (location === "public") {
      copyInput.ACL = "public-read";
    }
    try {
      await client.send(new CopyObjectCommand(copyInput));
      copied += 1;
    } catch (error) {
      const code = error?.name || error?.Code || error?.code;
      if (code === "NoSuchKey" || code === "NotFound") {
        console.warn("renamePrefix/copy skip missing:", sourceKey);
        continue;
      }
      throw error;
    }
  }

  // Purge de l’ancien préfixe (fichiers + marqueurs SeaweedFS `dossier/`)
  // deletePrefix gère l’ordre enfants→parents et la 2e passe sur le trailing slash.
  if (copied > 0 || mappings.length > 0) {
    await deletePrefix({ location, prefix: from });
  }

  return { moved: copied, mappings };
}

export async function deleteObject({ location = "sixmyk", key }) {
  if (!key) return { deleted: false };

  const config = getStorageConfig(location);
  const client = getS3Client(location);

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );

  return { deleted: true };
}

/**
 * Préfixe S3 d’un dossier à partir du chemin (hors racine espace).
 * Ex. [{id:1,name:6-MyK},{id:4,name:Photos}] + root=1 → "Photos"
 * Avec STORAGE_KEY_PREFIX=dev → "dev/Photos"
 * Chaîne vide si uniquement la racine (ne jamais purger tout le préfixe env).
 */
export function buildFolderPrefix(pathFolders = [], rootFolderId) {
  const folderPart = (pathFolders || [])
    .filter((folder) => Number(folder.id) !== Number(rootFolderId))
    .map((folder) => sanitizeFolderSegment(folder.name))
    .filter(Boolean)
    .join("/");

  if (!folderPart) return "";
  return withStorageKeyPrefix(folderPart);
}

/**
 * Supprime tous les objets sous un préfixe, y compris les marqueurs
 * de dossier SeaweedFS (`dossier/` en application/x-directory).
 */
export async function deletePrefix({ location = "sixmyk", prefix }) {
  const normalized = String(prefix || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  // Jamais de purge racine bucket
  if (!normalized) {
    return { deleted: 0, keys: [] };
  }

  const config = getStorageConfig(location);
  const client = getS3Client(location);
  const listPrefix = `${normalized}/`;
  const keys = new Set([listPrefix, normalized]);

  let token;
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: listPrefix,
        ContinuationToken: token,
      })
    );

    for (const object of listed.Contents || []) {
      if (object.Key) keys.add(object.Key);
    }

    token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (token);

  let deleted = 0;
  // Chemins les plus longs d’abord (enfants avant parents) — sinon SeaweedFS
  // peut recréer le marqueur parent `dossier/`.
  const orderedKeys = [...keys].sort(
    (a, b) => b.length - a.length || b.localeCompare(a)
  );

  for (const key of orderedKeys) {
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        })
      );
      deleted += 1;
    } catch (error) {
      console.warn("deletePrefix:", key, error?.message || error);
    }
  }

  // Seconde passe : relister + supprimer les restes (SeaweedFS parfois sticky)
  const leftovers = new Set([listPrefix, normalized]);
  let leftoverToken;
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: listPrefix,
        ContinuationToken: leftoverToken,
      })
    );
    for (const object of listed.Contents || []) {
      if (object.Key) leftovers.add(object.Key);
    }
    leftoverToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (leftoverToken);

  for (const key of [...leftovers].sort(
    (a, b) => b.length - a.length || b.localeCompare(a)
  )) {
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        })
      );
      deleted += 1;
    } catch {
      // ignore
    }
  }

  return { deleted, keys: orderedKeys };
}


export function buildObjectUrl({ location = "sixmyk", key }) {
  if (!key) return null;

  const config = getStorageConfig(location);
  const endpoint = String(config.endpoint || "").replace(/\/$/, "");
  const encodedKey = String(key)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  if (config.forcePathStyle) {
    return `${endpoint}/${config.bucket}/${encodedKey}`;
  }

  const withoutProtocol = endpoint.replace(/^https?:\/\//, "");
  const protocol = endpoint.startsWith("http://") ? "http" : "https";
  return `${protocol}://${config.bucket}.${withoutProtocol}/${encodedKey}`;
}

export async function getSignedDownloadUrl({
  location = "sixmyk",
  key,
  fileName,
  disposition = "attachment",
  expiresIn = 60 * 15,
}) {
  const config = getStorageConfig(location);
  const client = getS3Client(location);

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ResponseContentDisposition:
      disposition === "inline"
        ? fileName
          ? `inline; filename="${sanitizeFileName(fileName)}"`
          : "inline"
        : fileName
          ? `attachment; filename="${sanitizeFileName(fileName)}"`
          : undefined,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, expiresIn };
}

export async function checkStorageHealth(location = "sixmyk") {
  try {
    const config = getStorageConfig(location);
    const client = getS3Client(location);
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    return {
      ok: true,
      location,
      bucket: config.bucket,
      endpoint: config.endpoint,
    };
  } catch (error) {
    return {
      ok: false,
      location,
      error: error?.message || "Stockage inaccessible.",
    };
  }
}
