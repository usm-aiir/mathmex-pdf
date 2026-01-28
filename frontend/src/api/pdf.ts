import type { FormulaRegion, PDFDocumentMetadata } from "../types"
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
