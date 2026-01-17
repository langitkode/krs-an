import * as pdfjsLib from "pdfjs-dist";

// Use UNPKG for worker to avoid build/bundler headaches in MVP
// Logic: simpler than configuring workers manually in Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // Simple join with space.
      // Improved logic: try to preserve some structure?
      // For now, raw text dump is fine for LLM to parse.
      const pageText = textContent.items.map((item: any) => item.str).join(" "); // Adding spaces between items

      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    return fullText;
  } catch (error) {
    console.error("PDF Parsing Error", error);
    throw new Error("Failed to parse PDF");
  }
}
