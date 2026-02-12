import type { FormulaRegion, PDFDocumentMetadata, SpokenMathData } from "../types"
import { API } from "../App"

export async function fetchPDFRegions(
  pdfUrl: string
): Promise<FormulaRegion[]> {
  const response = await fetch(`${API}/predict_math_regions/${pdfUrl}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch formula regions for ${pdfUrl}`)
  }

  const data = await response.json()
  if (data.message === "No math formulas found in the PDF.") return []

  return data.regions.map((region: any) => ({
    id: region.id,
    pageNumber: region.pagenum,
    boundingRect: {
      x1: region.bbox[0],
      y1: region.bbox[1],
      x2: region.bbox[2],
      y2: region.bbox[3],
    },
  }))
}

export async function fetchPDFMetadata(
  pdfUrl: string,
  onProgress: (progress: number) => void
): Promise<PDFDocumentMetadata & { formulas: string[] }> {
  const regions = await fetchPDFRegions(pdfUrl)
  onProgress(50)

  let regionsLoaded = 0
  const formulas: string[] = []

  const fetchPromises = regions.map(region =>
    fetch(`${API}/get_latex_for_region/${region.id}/${pdfUrl}`)
      .then(async response => {
        regionsLoaded++
        onProgress(50 + (regionsLoaded / regions.length) * 50)

        if (!response.ok) return { id: region.id, latex: "" }
        const data = await response.json()
        return { id: region.id, latex: data.latex || "" }
      })
  )

  const latexResults = await Promise.all(fetchPromises)

  for (const region of regions) {
    const match = latexResults.find(r => r.id === region.id)
    region.latex = match?.latex ?? ""
    if (region.latex &&region.latex.trim()) formulas.push(region.latex)
  }

  return { url: pdfUrl, regions, formulas }
}

/**
 * Fetch spoken math for all formula regions in a PDF.
 * This converts LaTeX formulas to natural language descriptions for accessibility.
 */
export async function fetchAllSpokenMath(pdfUrl: string): Promise<SpokenMathData[]> {
  try {
    const response = await fetch(`${API}/get_all_spoken_math/${pdfUrl}`)
    if (!response.ok) {
      console.error(`Failed to fetch spoken math for ${pdfUrl}`)
      return []
    }
    const data = await response.json()
    return data.spoken_math_data || []
  } catch (error) {
    console.error("Error fetching spoken math:", error)
    return []
  }
}

/**
 * Fetch spoken math for a single region.
 */
export async function fetchSpokenMathForRegion(
  pdfUrl: string,
  regionId: number
): Promise<{ latex: string; spoken_math: string } | null> {
  try {
    const response = await fetch(`${API}/get_spoken_math/${regionId}/${pdfUrl}`)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error(`Error fetching spoken math for region ${regionId}:`, error)
    return null
  }
}

/**
 * Download the annotated PDF with spoken math tooltips.
 */
export async function downloadAnnotatedPdf(pdfUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(`${API}/generate_annotated_pdf/${pdfUrl}`)
    if (!response.ok) {
      const error = await response.json()
      console.error("Failed to generate annotated PDF:", error)
      return null
    }
    return await response.blob()
  } catch (error) {
    console.error("Error downloading annotated PDF:", error)
    return null
  }
}

/**
 * Trigger download of the annotated PDF file.
 */
export function triggerAnnotatedPdfDownload(blob: Blob, filename: string = "annotated_pdf.pdf") {
  // Explicitly set the MIME type to application/pdf
  const pdfBlob = new Blob([blob], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = filename; 
  
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}