import { useState, useRef, useEffect } from "react";
import type { FormulaRegion, PDFDocumentMetadata } from "./types";
import PDFViewer from "./components/PDFViewer";
import PDFOpener from "./components/PDFOpener";
import PDFLoadingPage from "./components/PDFLoadingPage";
import PDFErrorPage from "./components/PDFErrorPage";
import FormulaSidebar from "./components/FormulaSidebar";
import type { SearchResult } from "./components/QueryAndResult";
import HistorySidebar from "./components/HistorySidebar";
import PDFContainer from "./components/PDFContainer";

import './App.css';
import './styles/global.css';
import Header from "./components/Header";

export const API = import.meta.env.MODE === 'development' ? 'http://localhost:5010/pdf_reader/api' : 'https://mathmex.com/pdf_reader/api';

/**
 * Fetches mathematical formula regions from a PDF file.
 *
 * @param {string} pdfUrl - The URL of the PDF file to analyze.
 * @returns {Promise<FormulaRegion[]>} A promise that resolves to an array of formula regions.
 * Each region includes an ID, page number, and bounding rectangle coordinates.
 *
 * @throws {Error} Throws an error if the fetch request fails or if an error is returned from the API.
 *
 * @example
 * const pdfUrl = "https://example.com/sample.pdf";
 * fetchPDFRegions(pdfUrl)
 *   .then((regions) => {
 *     console.log("Formula regions:", regions);
 *   })
 *   .catch((error) => {
 *     console.error("Error fetching formula regions:", error);
 *   });
 */
async function fetchPDFRegions(pdfUrl: string): Promise<FormulaRegion[]> {
  const response = await fetch(`${API}/predict_math_regions/${pdfUrl}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch formula regions for ${pdfUrl}`);
  }
  const data = await response.json();
  if (data.message && data.message === 'No math formulas found in the PDF.') {
    console.warn(`No math formulas found in the PDF: ${pdfUrl}`);
    return []; // Return an empty array if no regions are found
  }
  if (data.error && data.error !== '') {
    console.error(`Error fetching regions for ${pdfUrl}:`, data.error);
    throw new Error(data.error);
  }
  return data.regions.map((region: any) => ({
    id: region.id,
    pageNumber: region.pagenum,
    boundingRect: {
      x1: region.bbox[0],
      y1: region.bbox[1],
      x2: region.bbox[2],
      y2: region.bbox[3],
    },
  }));
}
 

/**
 * Fetches and retrieves regions from a PDF document based on the provided URL.
 * 
 * @constant regions - An array of objects representing specific regions extracted from the PDF.
 * Each region typically contains metadata such as coordinates, dimensions, and content.
 * 
 * @async
 * @function fetchPDFRegions
 * @param {string} pdfUrl - The URL of the PDF document to extract regions from.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of region objects.
 */
async function fetchPDFMetadata(pdfUrl: string, onProgress: (progress: number) => void): Promise<PDFDocumentMetadata & { formulas: string[] }> {
  const regions = await fetchPDFRegions(pdfUrl);
  onProgress(50); // Update progress after fetching regions
  let regionsLoaded = 0;
  const formulas: string[] = [];
  // Make it so that the regions are all fetched in parallel
  const fetchPromises = regions.map(region =>
    fetch(`${API}/get_latex_for_region/${region.id}/${pdfUrl}`)
      .then(response => {
        if (!response.ok) {
          console.warn(`No LaTeX content found for region ${region.id}`);
          regionsLoaded++;
          onProgress(Math.min(50 + (regionsLoaded / regions.length) * 50, 100));
          return { id: region.id, latex: '' }; // Return empty LaTeX if
          // the fetch fails
        }
        regionsLoaded++;
        onProgress(Math.min(50 + (regionsLoaded / regions.length) * 50, 100));
        return response.json().then(data => ({
          id: region.id,
          latex: data.latex || '', // Use empty string if no LaTeX is found
        }));
      })
  );
  const latexResults = await Promise.all(fetchPromises);
  for (const region of regions) {
    const latexResult = latexResults.find(result => result.id === region.id);
    const latex = latexResult ? latexResult.latex : '[Formula loading error]';

    region.latex = latex;

    if (latex.trim()) {
      formulas.push(latex);
    }
  }
  return {
    url: pdfUrl,
    regions,
    formulas
  };
}

interface MathfieldElement extends HTMLElement {
  executeCommand: (command: string, ...args: any[]) => void;
  focus: () => void;
  setValue: (value: string) => void;
  getValue: () => string;
  latex: string;
}
interface PDFSearchHistoryItem {
  query: string
  results: SearchResult[]
}

function App() {
  const path = window.location.pathname;
  const delimiterIndex = path.indexOf('/pdf/');
  const pdfUrl = delimiterIndex !== -1 ? path.substring(delimiterIndex + 5) : '';
  const mathFieldRef = useRef<MathfieldElement>(null);
  if (!pdfUrl || pdfUrl.trim() === '') {
    return <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden',position: "relative", }}>
        <Header />
        <PDFOpener />
      </div>
    </>
  }
  const [pdfDocumentMetadata, setPdfDocumentMetadata] = useState<PDFDocumentMetadata | null>(null);
  const [progress, setProgress] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [currentQueryAndResults, setCurrentQueryAndResults] = useState<{ query: string; results: SearchResult[] }[]>([]);
  const [searchHistory, setSearchHistory] = useState<PDFSearchHistoryItem[]>(() => {
    const stored = localStorage.getItem("pdfSearchHistory")
    return stored ? JSON.parse(stored) : []
  })
  useEffect(() => {
    fetchPDFMetadata(pdfUrl, (progressValue: number) => {
      setProgress(progressValue);
    })
      .then(metadata => setPdfDocumentMetadata(metadata))
      .catch(error => { console.error('Error fetching PDF metadata:', error), setPdfError(error.message || 'An error occurred while fetching PDF metadata') });
  }, [pdfUrl]);
      /* ---------- Persist history ---------- */
      useEffect(() => {
        localStorage.setItem(
          "pdfSearchHistory",
          JSON.stringify(searchHistory)
        )
      }, [searchHistory])
  if (!pdfDocumentMetadata) {
    if (pdfError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
          <Header />
          <PDFErrorPage errorMessage={pdfError} />
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Header />
        <PDFLoadingPage progress={progress} statusMessage={progress >= 50 ? "Loading LaTeX content..." : "Loading PDF metadata..."} />
      </div>
    );
  }
  const handleFormulaClick = (latex: string) => {
    if (mathFieldRef.current) {
      // Insert formula at current cursor position
      const currentValue = mathFieldRef.current.getValue();
      const separator = currentValue && !currentValue.endsWith(' ') ? ' ' : '';
      mathFieldRef.current.setValue(currentValue + separator + latex);
      mathFieldRef.current.focus(); // keep focus for immediate editing/searching
    }
  };



    /* ---------- Restore ---------- */
    const restoreFromHistory = (item: PDFSearchHistoryItem) => {
      setCurrentQueryAndResults(prev => [...prev, item])
      setSearchHistory(prev => [item, ...prev])
      }
    
    /* ---------- Clear history ---------- */
    const clearHistory = () => {
      setSearchHistory([])
      localStorage.removeItem("pdfSearchHistory")
    }
    
    /* ---------- Export ---------- */
    const exportHistory = () => {
      const blob = new Blob(
        [JSON.stringify(searchHistory, null, 2)],
        { type: "application/json" }
      )

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "pdf-search-history.json"
      a.click()
      URL.revokeObjectURL(url)
    }

    
      
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Header
  isHistoryOpen={isHistoryOpen}
  onToggleHistory={() => setIsHistoryOpen(prev => !prev)}
/>

        {/* ================= HISTORY SIDEBAR (NEW) ================= */}
        {/* <HistorySidebar
          history={searchHistory}
          isOpen={isHistoryOpen}
          onClear={clearHistory}
          onExport={exportHistory}
          onSelect={restoreFromHistory}
        /> */}
  
      {/* Toggle sidebar button */}
      <button
  onClick={() => setSidebarOpen(!sidebarOpen)}
  style={{
    position: "fixed",
    top: "50%",                  // vertically centered
    right: sidebarOpen ? "385px" : "15px", // sidebar width
    transform: "translateY(-50%) rotate(-90deg)", // rotate and center
    transformOrigin: "right center", // rotate around the edge
    zIndex: 1000,
    padding: "0.5rem 1rem",
    borderRadius: "0.25rem 0.25rem 0.25rem  0.25rem",
    backgroundColor: "#a200ff",
    border: "2px solid #fff",
    color: "#fff",
    cursor: "pointer",
    transition: "right 0.4s ease",
    whiteSpace: "nowrap",       // prevent text wrap after rotation
  }}
>
  {sidebarOpen ? "Hide Formulas" : "Show Formulas"}
</button>
        {/* ---------- Formula Sidebar ---------- */}
        {pdfDocumentMetadata?.formulas && (
          <FormulaSidebar
            formulas={pdfDocumentMetadata.formulas}
            isOpen={sidebarOpen}
            selectedFormula={selectedFormula}
            onFormulaClick={handleFormulaClick}
          />
        )}
  
  <PDFContainer
  pdfUrl={pdfUrl}
  sidebarOpen={sidebarOpen}
  historyOpen={isHistoryOpen}
/>
    </div>
  );
}
  export default App;
  