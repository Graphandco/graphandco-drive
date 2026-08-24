const MAX_CONCURRENT = 6;

/** @type {Map<string, string>} */
const urlCache = new Map();

/** @type {Map<string, Promise<string>>} */
const inflight = new Map();

let active = 0;
/** @type {Array<() => void>} */
const waiters = [];

function pump() {
  while (active < MAX_CONCURRENT && waiters.length > 0) {
    const next = waiters.shift();
    next?.();
  }
}

function schedule(run) {
  return new Promise((resolve, reject) => {
    const start = () => {
      active += 1;
      Promise.resolve()
        .then(run)
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          pump();
        });
    };

    if (active < MAX_CONCURRENT) {
      start();
    } else {
      waiters.push(start);
    }
  });
}

export function getCachedThumbnailUrl(key) {
  return urlCache.get(key) || null;
}

export function setCachedThumbnailUrl(key, url) {
  urlCache.set(key, url);
}

/**
 * Limite le parallélisme des signatures + déduplique les clés en cours.
 * @param {string} key
 * @param {() => Promise<string>} fetchUrl
 * @returns {Promise<string>}
 */
export function loadThumbnailUrl(key, fetchUrl) {
  const cached = urlCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = schedule(fetchUrl)
    .then((url) => {
      urlCache.set(key, url);
      return url;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * Précharge le bitmap avant affichage pour éviter le pop saccadé.
 * @param {string} url
 * @returns {Promise<string>}
 */
export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = async () => {
      try {
        if (typeof img.decode === "function") {
          await img.decode();
        }
      } catch {
        // decode échoue parfois : on affiche quand même
      }
      resolve(url);
    };
    img.onerror = () => reject(new Error("Image preload failed"));
    img.src = url;
  });
}
