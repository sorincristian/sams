/**
 * generate-previews.ts
 *
 * Generates PNG preview images for all PDFs in apps/api/diagrams/.
 * Saves previews to apps/api/diagram-previews/ with deterministic names.
 *
 * Can be run standalone:
 *   pnpm exec tsx prisma/scripts/generate-previews.ts
 *
 * Or imported as a helper by register-catalog-attachments.ts.
 *
 * Rendering backend (auto-detected):
 *   1. pdftoppm (poppler-utils) — preferred when available (Linux/CI/macOS with poppler)
 *   2. pdfjs-dist + canvas     — fallback, works on all Node environments
 *
 * Scale: 150 DPI (1x) → outputs ~1224px wide for a standard US Letter page.
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, renameSync } from "fs";
import { basename, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Absolute paths (script lives in prisma/scripts/, PDFs are in apps/api/diagrams/)
export const DIAGRAMS_DIR    = join(__dirname, "../../diagrams");
export const PREVIEWS_DIR    = join(__dirname, "../../diagram-previews");

// ─── Name normalization ────────────────────────────────────────────────────────
/**
 * Convert a PDF filename to a deterministic slug used for the preview PNG.
 *
 * Examples:
 *   "Proterra Bus #3725 - 3749 (1).pdf"            → "proterra-3725-3749-page1.png"
 *   "New Flyer 40 ft. Electric - Bus #3700 - 3709 (1).pdf" → "new-flyer-3700-3709-page1.png"
 */
export function pdfToPreviewName(pdfFileName: string): string {
  const name = basename(pdfFileName, ".pdf");
  const slug = name
    .toLowerCase()
    // keep only letters, digits, spaces, hyphens
    .replace(/[^a-z0-9 -]/g, " ")
    // collapse multiple spaces/hyphens
    .replace(/[\s-]+/g, "-")
    // trim leading/trailing hyphens
    .replace(/^-+|-+$/g, "");
  return `${slug}-page1.png`;
}

// ─── Backend detection ─────────────────────────────────────────────────────────
function hasPdftoppm(): boolean {
  try {
    execSync("pdftoppm -v 2>&1", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ─── Generation using pdftoppm ─────────────────────────────────────────────────
function generateWithPdftoppm(pdfPath: string, outPath: string): void {
  // pdftoppm outputs <prefix>-1.png or <prefix>.ppm depending on version
  const tmpPrefix = outPath.replace(/\.png$/, "");
  execSync(
    `pdftoppm -png -f 1 -l 1 -r 150 "${pdfPath}" "${tmpPrefix}"`,
    { stdio: "pipe" }
  );
  // pdftoppm adds "-1" suffix → rename to the clean output name
  const candidate = `${tmpPrefix}-1.png`;
  if (existsSync(candidate) && candidate !== outPath) {
    renameSync(candidate, outPath);
  }
}

// ─── Generation using pdfjs-dist + canvas ─────────────────────────────────────
async function generateWithPdfjs(pdfPath: string, outPath: string): Promise<void> {
  // Dynamic imports — only loaded when needed
  const { createCanvas } = await import("canvas");
  const { readFileSync, writeFileSync } = await import("fs");
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);

  const data = new Uint8Array(readFileSync(pdfPath));
  const loadingTask = (pdfjsLib as any).getDocument({ data, disableFontFace: true });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const SCALE = 2; // Renders at 144 DPI effective (72 * 2)
  const viewport = page.getViewport({ scale: SCALE });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");

  await page.render({ canvasContext: ctx as any, viewport }).promise;

  writeFileSync(outPath, canvas.toBuffer("image/png"));
}

// ─── Public helper ─────────────────────────────────────────────────────────────
/**
 * Generate a preview PNG for a single PDF file.
 *
 * @param pdfFileName  Basename of the PDF inside DIAGRAMS_DIR
 * @returns            The /api/diagram-previews/ path stored in the DB, or null on failure
 */
export async function generatePreview(pdfFileName: string): Promise<string | null> {
  const pdfPath     = join(DIAGRAMS_DIR, pdfFileName);
  const previewName = pdfToPreviewName(pdfFileName);
  const outPath     = join(PREVIEWS_DIR, previewName);

  if (!existsSync(pdfPath)) {
    console.warn(`    ⚠ PDF not found locally: ${pdfFileName} — skipping preview`);
    return null;
  }

  mkdirSync(PREVIEWS_DIR, { recursive: true });

  // Skip if already generated (idempotent)
  if (existsSync(outPath)) {
    console.log(`    ↺ Preview exists: ${previewName}`);
    return `/api/diagram-previews/${previewName}`;
  }

  try {
    if (hasPdftoppm()) {
      console.log(`    → Generating preview via pdftoppm: ${previewName}`);
      generateWithPdftoppm(pdfPath, outPath);
    } else {
      console.log(`    → Generating preview via pdfjs-dist: ${previewName}`);
      await generateWithPdfjs(pdfPath, outPath);
    }

    if (!existsSync(outPath)) {
      throw new Error("Output file not created after generation");
    }

    const sizeKB = Math.round(require("fs").statSync(outPath).size / 1024);
    console.log(`    ✓ Preview generated: ${previewName} (${sizeKB} KB)`);
    return `/api/diagram-previews/${previewName}`;
  } catch (err: any) {
    console.error(`    ✗ Preview generation failed for ${pdfFileName}: ${err?.message ?? err}`);
    return null;
  }
}

// ─── Standalone runner ─────────────────────────────────────────────────────────
async function main() {
  console.log("=== Generating PDF previews ===\n");

  if (!existsSync(DIAGRAMS_DIR)) {
    console.error(`Diagrams directory not found: ${DIAGRAMS_DIR}`);
    process.exit(1);
  }

  const pdfs = readdirSync(DIAGRAMS_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (pdfs.length === 0) {
    console.log("No PDFs found in", DIAGRAMS_DIR);
    return;
  }

  let ok = 0, failed = 0;
  for (const pdf of pdfs) {
    const result = await generatePreview(pdf);
    if (result) ok++; else failed++;
  }

  console.log(`\nDone. Generated: ${ok}  Failed/Skipped: ${failed}`);
}

// Run if invoked directly
const isMain = process.argv[1]?.endsWith("generate-previews.ts") ||
               process.argv[1]?.endsWith("generate-previews.js");
if (isMain) { main().catch((e) => { console.error(e); process.exit(1); }); }
