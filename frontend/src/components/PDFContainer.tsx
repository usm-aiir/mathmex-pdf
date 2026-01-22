import { useEffect, useRef, useState, memo } from "react"
import type { FormulaRegion, PDFDocumentMetadata } from "../types"
import PDFViewer from "./PDFViewer"
import PDFLoadingPage from "./PDFLoadingPage"
import PDFErrorPage from "./PDFErrorPage"
import type { SearchResult } from "./QueryAndResult"
import { API } from "../App"
import { fetchPDFMetadata } from "../api/pdf"


interface MathfieldElement extends HTMLElement {
  executeCommand: (command: string, ...args: any[]) => void
  focus: () => void
  setValue: (value: string) => void
  getValue: () => string
}

interface PDFContainerProps {
  pdfUrl: string
  sidebarOpen: boolean
  historyOpen: boolean
}
interface MathfieldElement extends HTMLElement {
    executeCommand: (command: string, ...args: any[]) => void;
    focus: () => void;
    setValue: (value: string) => void;
    getValue: () => string;
    latex: string;
  }

function PDFContainer({
  pdfUrl,
  sidebarOpen,
  historyOpen,
}: PDFContainerProps) {
  const mathFieldRef = useRef<MathfieldElement>(null)

  const [pdfDocumentMetadata, setPdfDocumentMetadata] =
    useState<PDFDocumentMetadata | null>(null)
  const [progress, setProgress] = useState(0)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [currentQueryAndResults, setCurrentQueryAndResults] = useState<
    { query: string; results: SearchResult[] }[]
  >([])

  /* ---------- Fetch PDF metadata ---------- */
  useEffect(() => {
    let cancelled = false

    setPdfDocumentMetadata(null)
    setPdfError(null)
    setProgress(0)

    fetchPDFMetadata(pdfUrl, (p: number) => {
      if (!cancelled) setProgress(p)
    })
    .then((metadata: PDFDocumentMetadata & { formulas: string[] }) => {
        if (!cancelled) setPdfDocumentMetadata(metadata)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "An unknown error occurred"
          setPdfError(message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [pdfUrl])

  /* ---------- Formula insertion ---------- */
  const handleFormulaClick = (latex: string) => {
    if (!mathFieldRef.current) return

    const currentValue = mathFieldRef.current.getValue()
    const sep = currentValue && !currentValue.endsWith(" ") ? " " : ""
    mathFieldRef.current.setValue(currentValue + sep + latex)
    mathFieldRef.current.focus()
  }

  /* ---------- Loading / error states ---------- */
  if (!pdfDocumentMetadata) {
    if (pdfError) {
      return <PDFErrorPage errorMessage={pdfError} />
    }

    return (
      <PDFLoadingPage
        progress={progress}
        statusMessage={
          progress >= 50
            ? "Loading LaTeX content..."
            : "Loading PDF metadata..."
        }
      />
    )
  }

  /* ---------- Render PDF ---------- */
  return (
<PDFViewer
  pdfDocumentMetadata={pdfDocumentMetadata}
  sidebarOpen={sidebarOpen}
  historyOpen={historyOpen}
  mathFieldRef={mathFieldRef}
  onFormulaClick={handleFormulaClick}
/>
  )
}

export default memo(PDFContainer)
