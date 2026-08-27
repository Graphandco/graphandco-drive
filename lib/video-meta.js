import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { isVideoFile } from "@/lib/mime";

function runCommand(command, args, { timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = Buffer.alloc(0);
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout = Buffer.concat([stdout, chunk]);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          stderr.trim() || `${command} exited with code ${code ?? "?"}`,
        ),
      );
    });
  });
}

async function withTempVideoDir(input, run) {
  const dir = await mkdtemp(join(tmpdir(), "drive-video-"));
  const inputPath = join(dir, "input.bin");
  try {
    await writeFile(inputPath, input);
    return await run(dir, inputPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Extrait une frame JPEG depuis une vidéo (essaie ~1s, sinon début).
 * @returns {Promise<Buffer | null>}
 */
export async function extractVideoFrameJpeg(input, { mimeType, name } = {}) {
  if (!isVideoFile({ mimeType, name })) return null;
  if (!Buffer.isBuffer(input) || input.length === 0) return null;

  return withTempVideoDir(input, async (dir, inputPath) => {
    const outputPath = join(dir, "frame.jpg");

    async function grab(seekSeconds) {
      await runCommand("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        String(seekSeconds),
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        outputPath,
      ]);
      return readFile(outputPath);
    }

    try {
      return await grab(1);
    } catch {
      try {
        return await grab(0);
      } catch (error) {
        console.warn(
          "extractVideoFrameJpeg:",
          error?.message || error,
        );
        return null;
      }
    }
  });
}

/**
 * Dimensions de la première piste vidéo (ffprobe).
 * @returns {Promise<{ widthPx: number | null, heightPx: number | null }>}
 */
export async function extractVideoDimensions(
  input,
  { mimeType, name } = {},
) {
  if (!isVideoFile({ mimeType, name })) {
    return { widthPx: null, heightPx: null };
  }
  if (!Buffer.isBuffer(input) || input.length === 0) {
    return { widthPx: null, heightPx: null };
  }

  try {
    return await withTempVideoDir(input, async (_dir, inputPath) => {
      const { stdout } = await runCommand("ffprobe", [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_streams",
        "-select_streams",
        "v:0",
        inputPath,
      ]);

      const data = JSON.parse(String(stdout || "{}"));
      const stream = Array.isArray(data.streams) ? data.streams[0] : null;
      if (!stream) return { widthPx: null, heightPx: null };

      let width = Number(stream.width);
      let height = Number(stream.height);
      const rotation = Number(
        stream.tags?.rotate ??
          stream.side_data_list?.find((entry) => entry.rotation != null)
            ?.rotation ??
          0,
      );

      if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
        const swap = width;
        width = height;
        height = swap;
      }

      if (width > 0 && height > 0) {
        return { widthPx: width, heightPx: height };
      }
      return { widthPx: null, heightPx: null };
    });
  } catch (error) {
    console.warn("extractVideoDimensions:", error?.message || error);
    return { widthPx: null, heightPx: null };
  }
}
