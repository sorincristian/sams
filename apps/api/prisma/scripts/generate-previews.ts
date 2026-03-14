/**
 * generate-previews.ts
 *
 * Generates PNG preview images for all PDFs in apps/api/diagrams/.
 * Saves to apps/api/diagram-previews/ with deterministic slug names.
 *
 * Rendering: uses pdftoppm (poppler-utils) when available — always true
 * on ubuntu-latest in GitHub Actions.
 *
 * Usage (from apps/api):
 *   pnpm exec tsx prisma/scripts/generate-previews.ts
 *
 * Also importable as a helper:
 *   import { generatePreview } from "./generate-previews.js"
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "fs";
import { basename, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Absolute paths (this script lives at prisma/scripts/ inside apps/api)
export const DIAGRAMS_DIR   = join(__dirname, "../../diagrams");
export const PREVIEWS_DIR   = join(__dirname, "../../diagram-previews");

// ─── Name normalization ────────────────────────────────────────────────────────
/**
 * Convert a PDF filename to a deterministic slug for the preview PNG.
 *
 * "Proterra Bus #3725 - 3749 (1).pdf"                   → "proterra-3725-3749-1-page1.png"
 * "New Flyer 40 ft. Electric - Bus #3700 - 3709 (1).pdf" → "new-flyer-40-ft-electric-bus-3700-3709-1-page1.png"
 */
export function pdfToPreviewName(pdfFileName: string): string {
  const name = basename(pdfFileName, ".pdf");
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")   // non-alphanum → hyphen
    .replace(/^-+|-+$/g, "");       // trim leading/trailing hyphens
  return `${slug}-page1.png`;
}

// ─── pdftoppm check ────────────────────────────────────────────────────────────
function pdftoppmPath(): string | null {
  try {
    const result = execSync("which pdftoppm 2>/dev/null || where pdftoppm 2>nul", {
      stdio: "pipe",
      encoding: "utf8",
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

// ─── Generate one PDF → PNG ────────────────────────────────────────────────────
export async function generatePreview(pdfFileName: string): Promise<string | null> {
  const pdfPath     = join(DIAGRAMS_DIR, pdfFileName);
  const previewName = pdfToPreviewName(pdfFileName);
  const outPath     = join(PREVIEWS_DIR, previewName);

  if (!existsSync(pdfPath)) {
    console.warn(`    ⚠ PDF not found: ${pdfFileName} — skipping`);
    return null;
  }

  mkdirSync(PREVIEWS_DIR, { recursive: true });

  // Idempotent: skip if already generated
  if (existsSync(outPath) && statSync(outPath).size > 0) {
    console.log(`    ↺ Preview already exists: ${previewName}`);
    return `/api/diagram-previews/${previewName}`;
  }

  const bin = pdftoppmPath();

  try {
    if (bin) {
      // pdftoppm outputs <prefix>-1.png (page index suffix)
      const tmpPrefix = outPath.replace(/\.png$/, "");
      execSync(`pdftoppm -png -f 1 -l 1 -r 150 "${pdfPath}" "${tmpPrefix}"`, {
        stdio: "pipe",
      });
      // Rename the generated file (pdftoppm adds "-1")
      const candidate = `${tmpPrefix}-1.png`;
      if (existsSync(candidate)) {
        renameSync(candidate, outPath);
      }
    } else {
      // Fallback: pdfjs-dist + canvas (pure Node, no system binaries required)
      const { default: canvas }  = await import("canvas");
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
      const { readFileSync, writeFileSync } = await import("fs");

      const data = new Uint8Array(readFileSync(pdfPath));
      const loadingTask = (pdfjsLib as any).getDocument({
        data,
        disableFontFace: true,
        verbosity: 0,
      });
      const pdf  = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const SCALE    = 2;
      const viewport = page.getViewport({ scale: SCALE });
      const cnv      = (canvas as any).createCanvas(viewport.width, viewport.height);
      const ctx      = cnv.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      writeFileSync(outPath, cnv.toBuffer("image/png"));
    }

    if (!existsSync(outPath) || statSync(outPath).size === 0) {
      throw new Error("Output PNG not created or empty after generation");
    }

    const sizeKB = Math.round(statSync(outPath).size / 1024);
    console.log(`    ✓ Generated: ${previewName} (${sizeKB} KB)`);
    return `/api/diagram-previews/${previewName}`;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`    ✗ Preview generation failed for ${pdfFileName}: ${msg}`);
    // Clean up partial output
    try { if (existsSync(outPath)) { const { unlinkSync } = await import("fs"); unlinkSync(outPath); } } catch { /* ignore */ }
    return null;
  }
}

// ─── Standalone runner ─────────────────────────────────────────────────────────
async function main() {
  console.log("=== Generating PDF preview images ===\n");

  if (!existsSync(DIAGRAMS_DIR)) {
    console.error(`Diagrams directory not found: ${DIAGRAMS_DIR}`);
    console.error("Expected at: apps/api/diagrams/");
    process.exit(1);
  }

  const pdfs = readdirSync(DIAGRAMS_DIR).filter((f) =>
    f.toLowerCase().endsWith(".pdf")
  );

  if (pdfs.length === 0) {
    console.log("No PDF files found in", DIAGRAMS_DIR);
    return;
  }

  console.log(`Found ${pdfs.length} PDFs. Rendering page 1 of each...\n`);

  let ok = 0, skipped = 0, failed = 0;
  for (const pdf of pdfs) {
    console.log(`  Processing: ${pdf}`);
    const result = await generatePreview(pdf);
    if (result === null) {
      // Check if it was a skip (file not found) or a real failure
      const pdfPath = join(DIAGRAMS_DIR, pdf);
      if (!existsSync(pdfPath)) skipped++;
      else failed++;
    } else {
      ok++;
    }
  }

  console.log(`\nDone.  Generated: ${ok}  Skipped: ${skipped}  Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
