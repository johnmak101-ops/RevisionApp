import pdfParse from "pdf-parse";
import { pdf } from "pdf-to-img";
import Tesseract from "tesseract.js";

export interface PdfPage {
  text: string;
  pageNumber: number;
}

// 壓制 pdfjs-dist 嘅 verbose internal warnings（如 "Image too small to scale"）
function suppressPdfjsWarnings() {
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const suppress = (msg: unknown) => {
    const s = String(msg);
    if (
      s.includes("Image too small to scale") ||
      s.includes("Line cannot be recognized") ||
      s.includes("Error: Image too small") ||
      s.includes("Line cannot be recognized!!")
    ) return;
    originalWarn(msg);
  };
  console.warn = suppress as typeof console.warn;
  console.error = (msg: unknown, ...rest: unknown[]) => {
    const s = String(msg);
    if (
      s.includes("Image too small to scale") ||
      s.includes("Line cannot be recognized")
    ) return;
    originalError(msg, ...rest);
  };
  return () => {
    console.warn = originalWarn;
    console.error = originalError;
  };
}

/** 從可選取文字的 PDF 提取文字 */
async function extractWithPdfParse(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  const data = await pdfParse(buffer);
  return { text: data.text || "", numPages: data.numpages || 1 };
}

/** 使用 OCR 從掃描檔/圖片 PDF 提取文字。遇 Invalid page 即停止，避免 pdfjs 與實際頁數不一致。 */
async function extractWithOcr(buffer: Buffer): Promise<PdfPage[]> {
  // 壓制 pdfjs 嘅 "Image too small to scale" / "Line cannot be recognized" warnings
  const restoreConsole = suppressPdfjsWarnings();

  const document = await pdf(buffer, { scale: 2 });
  const pages: PdfPage[] = [];
  const worker = await Tesseract.createWorker("eng", 1, { logger: () => {} });

  try {
    for (let pageNum = 1; pageNum <= 999; pageNum++) {
      try {
        const imageBuffer = await document.getPage(pageNum);
        const result = await worker.recognize(imageBuffer as Buffer);
        const text = result.data.text?.trim() ?? "";
        if (text) {
          pages.push({ text, pageNumber: pageNum });
        }
      } catch {
        break;
      }
    }
  } finally {
    await worker.terminate();
    restoreConsole();
  }

  return pages;
}

export async function extractPdfText(buffer: Buffer): Promise<PdfPage[]> {
  const { text: fullText, numPages } = await extractWithPdfParse(buffer);

  if (fullText.trim()) {
    const charsPerPage = Math.max(1, Math.ceil(fullText.length / numPages));
    const pages: PdfPage[] = [];

    for (let i = 0; i < numPages; i++) {
      const start = i * charsPerPage;
      const end = Math.min((i + 1) * charsPerPage, fullText.length);
      const pageText = fullText.slice(start, end).trim();
      if (pageText) {
        pages.push({ text: pageText, pageNumber: i + 1 });
      }
    }

    if (pages.length === 0) {
      pages.push({ text: fullText.trim(), pageNumber: 1 });
    }

    return pages;
  }

  return extractWithOcr(buffer);
}
