import { useState, useRef, useEffect } from "react";
import type { FormulaRegion, PDFDocumentMetadata, SpokenMathData } from "./types";
import type { MathfieldElement } from 'mathlive';
import PDFOpener from "./components/PDFOpener";
import PDFLoadingPage from "./components/PDFLoadingPage";
import PDFErrorPage from "./components/PDFErrorPage";
import FormulaSidebar from "./components/FormulaSidebar";
import type { SearchResult } from "./components/QueryAndResult";
import HistorySidebar from "./components/HistorySidebar";
import PDFContainer from "./components/PDFContainer";
import QueryAndResult from "./components/QueryAndResult";
import PDFstyles from './components/PDFViewer.module.css';
import { fetchAllSpokenMath, downloadAnnotatedPdf, triggerAnnotatedPdfDownload } from "./api/pdf";

import './App.css';
import './styles/global.css';
import Header from "./components/Header";

export const API = import.meta.env.MODE === 'development' ? 'http://localhost:9095/pdf_reader/api' : 'http://mathmex.com/pdf_reader/api';


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
  const [selectedFormula] = useState<string | null>(null);
  const [searchBarContent, setSearchBarContent] = useState<string>('');
  const [scrollToPage, setScrollToPage] = useState<number | undefined>();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [searchHistory, setSearchHistory] = useState<PDFSearchHistoryItem[]>(() => {
    const stored = localStorage.getItem("pdfSearchHistory")
    return stored ? JSON.parse(stored) : []
  })
  const [isMathMode, setIsMathMode] = useState<boolean>(false); // State to track mode
  
  // Spoken math / accessibility states
  const [spokenMathLoaded, setSpokenMathLoaded] = useState(false);
  const [isDownloadingAnnotatedPdf, setIsDownloadingAnnotatedPdf] = useState(false);
  const [isSearching, setIsSearching] = useState<boolean>(false); // State to track loading
  const [searchError, setSearchError] = useState<string | null>(null); // State to track search errors

const [currentQueryAndResults, setCurrentQueryAndResults] = useState<{
  query: string;
  results: SearchResult[];
}[]>([]);



useEffect(() => {
  const element = mathFieldRef.current;
  if (!element) return; // Bail out if ref not yet assigned

  // Initialize in text mode
  element.executeCommand("switchMode", "text");
  element.focus();

  // Input handler
  const handleInput = () => {
    if (element.getValue().trim() === '') {
      element.executeCommand("switchMode", "text");
    }
  };

  // Mode change handler
  const handleModeChange = (event: CustomEvent) => {
    setIsMathMode(event.detail.mode === 'math');
  };

  element.addEventListener('input', handleInput);
  element.addEventListener('mode-change', handleModeChange);

  return () => {
    element.removeEventListener('input', handleInput);
    element.removeEventListener('mode-change', handleModeChange);
  };
}, []); // run once

useEffect(() => {
  if (mathFieldRef.current) {
    mathFieldRef.current.executeCommand("switchMode", isMathMode ? "math" : "text");
    mathFieldRef.current.focus(); // Keep focus on the mathfield after mode switch
  }
}, [isMathMode]); // Re-run when isMathMode changes


  useEffect(() => {

    fetchPDFMetadata(pdfUrl, (progressValue: number) => {
      setProgress(progressValue);
    })
      .then(metadata => setPdfDocumentMetadata(metadata))
      .catch(error => { console.error('Error fetching PDF metadata:', error), setPdfError(error.message || 'An error occurred while fetching PDF metadata') });
  }, [pdfUrl]);

  // Fetch spoken math data after metadata is loaded (for accessibility)
  useEffect(() => {
    if (!pdfDocumentMetadata || spokenMathLoaded) return;
    
    fetchAllSpokenMath(pdfUrl)
      .then((spokenMathData: SpokenMathData[]) => {
        if (spokenMathData.length > 0) {
          // Update regions with spoken math
          setPdfDocumentMetadata(prev => {
            if (!prev) return prev;
            const updatedRegions = prev.regions.map(region => {
              const match = spokenMathData.find(s => s.id === region.id);
              return match ? { ...region, spokenMath: match.spoken_math } : region;
            });
            return { ...prev, regions: updatedRegions };
          });
        }
        setSpokenMathLoaded(true);
      })
      .catch(error => {
        console.error('Error fetching spoken math:', error);
        setSpokenMathLoaded(true); // Mark as loaded even on error to prevent retries
      });
  }, [pdfDocumentMetadata, pdfUrl, spokenMathLoaded]);

  // Handler to download annotated PDF with spoken math tooltips
  const handleDownloadAnnotatedPdf = async () => {
    setIsDownloadingAnnotatedPdf(true);
    try {
      const blob = await downloadAnnotatedPdf(pdfUrl);
      if (blob) {
        // Extract filename from URL or use default
        const urlParts = pdfUrl.split('/');
        const originalFilename = urlParts[urlParts.length - 1] || 'document';
        const annotatedFilename = originalFilename.replace('.pdf', '_annotated.pdf');
        triggerAnnotatedPdfDownload(blob, annotatedFilename);
      } else {
        console.error('Failed to download annotated PDF');
      }
    } catch (error) {
      console.error('Error downloading annotated PDF:', error);
    } finally {
      setIsDownloadingAnnotatedPdf(false);
    }
  };
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

  // A formula in the siderbar was clicked
  const handleFormulaClick = (latex: string) => {
    if (mathFieldRef.current) {
      // Insert formula at current cursor position
      const currentValue = mathFieldRef.current.getValue();
      const separator = currentValue && !currentValue.endsWith(' ') ? ' ' : '';
      mathFieldRef.current.setValue(currentValue + separator + latex);
      setSearchBarContent(currentValue + separator + latex); // Update state immediately
      mathFieldRef.current.focus(); // keep focus for immediate editing/searching
    }
    // Find the region matching this latex and scroll to it
    const region = pdfDocumentMetadata?.regions.find(r => r.latex === latex);
    if (region) {
      setScrollToPage(region.pageNumber);
    }
  };
  const handleSearch = () => {
    const searchValue = mathFieldRef.current?.getValue();
    if (searchValue) {
      console.log("Performing search for:", searchValue);
      setIsSearching(true);
      setSearchError(null); // Clear any previous errors
      performSearch(searchValue)
        .then(results => {
          // Always add to history even if empty results
          addSearch(searchValue, results);
          if (mathFieldRef.current) {
            mathFieldRef.current.setValue('');
            setSearchBarContent(''); // Manually update state when clearing
            mathFieldRef.current.focus();
          }
        })
        .catch(error => {
          console.error("Search failed:", error);
          setSearchError("Search failed. Please try again.");
        })
        .finally(() => {
          setIsSearching(false);
        });
    } else {
      console.warn("Search initiated, but the MathField is empty.");
    }
  };

  async function performSearch(query: string): Promise<SearchResult[]> {
    console.log(`Searching with query: ${query}`)
    // Use pdf-reader proxy to avoid CORS issues
    const result = await fetch(`${API}/fusion-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        sources: [],
        mediaTypes: [],
        top_k: 50
      })
    });
    
    if (!result.ok) {
      throw new Error(`Search request failed with status ${result.status}`);
    }
    
    const json = await result.json();
    console.log("Search results:", json);
    
    if (!json.results || !Array.isArray(json.results)) {
      throw new Error("Invalid search response format");
    }
    
    return json.results as SearchResult[];
  }

    /* ---------- Add search ---------- */
    const addSearch = (query: string, results: SearchResult[]) => {
      const item = { query, results }
      setSearchHistory(prev => [item, ...prev])
      setCurrentQueryAndResults(prev => [item, ...prev])
    }

    /* ---------- Restore ---------- */
    const restoreFromHistory = (item: PDFSearchHistoryItem) => {
      setCurrentQueryAndResults(prev => [item, ...prev])
      // Move clicked item to the top of history
      setSearchHistory(prev => {
        const filtered = prev.filter(historyItem => historyItem !== item)
        return [item, ...filtered]
      })
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
        {/* ---------- HEADER ---------- */}
        <Header
          isHistoryOpen={isHistoryOpen}
          onToggleHistory={() => setIsHistoryOpen(prev => !prev)}
        />
    
        {/* ================= HISTORY SIDEBAR ================= */}
        <HistorySidebar
          history={searchHistory}
          isOpen={isHistoryOpen}
          onClear={clearHistory}
          onExport={exportHistory}
          onSelect={restoreFromHistory}
          onClose={() => setIsHistoryOpen(false)}
        />
    

    
        {/* ---------- FORMULA SIDEBAR ---------- */}
        {pdfDocumentMetadata?.formulas && (
          <FormulaSidebar
            formulas={pdfDocumentMetadata.formulas}
            selectedFormula={selectedFormula}
            onFormulaClick={handleFormulaClick}
          />
        )}
    
        {/* ---------- MAIN CONTENT: PDF + RIGHT SIDEBAR ---------- */}
        <div style={{ display: "flex", flexGrow: 1, width: "100%", overflowY: "auto" }}>
          
          {/* Left: PDF Viewer (50%) */}
          <div style={{ width: "50%", overflowY: "auto", display: "flex", flexDirection: "column" }} >
            <div style={{ flexGrow: 1, overflowY: "auto" }}>
              <PDFContainer 
                pdfDocumentMetadata={pdfDocumentMetadata}
                    mathFieldRef={mathFieldRef}
             searchBarContent={searchBarContent}
            scrollToPage={scrollToPage}
            onSearchBarContentChange={setSearchBarContent}
             />
            </div>
            
            {/* Accessibility Controls Bar */}
            <div style={{ 
              padding: "10px 16px", 
              borderTop: "1px solid #eee", 
              display: "flex", 
              alignItems: "center", 
              gap: "12px",
              backgroundColor: "#f8f9fa"
            }}>
              <button
                onClick={handleDownloadAnnotatedPdf}
                disabled={isDownloadingAnnotatedPdf || !spokenMathLoaded}
                style={{
                  padding: "8px 16px",
                  backgroundColor: isDownloadingAnnotatedPdf ? "#ccc" : "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: isDownloadingAnnotatedPdf ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background-color 0.2s"
                }}
                title="Download a PDF with spoken math annotations that appear when hovering over formulas"
              >
                {isDownloadingAnnotatedPdf ? (
                  <>
                    <span style={{ 
                      display: "inline-block", 
                      width: "14px", 
                      height: "14px", 
                      border: "2px solid #fff",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }} />
                    Generating...
                  </>
                ) : (
                  <>
                    Download Annotated PDF
                  </>
                )}
              </button>
            </div>
          </div>
    
          {/* Right: Query + Search Results Sidebar (50%) */}
          <div className={PDFstyles.sidebar} style={{ width: "50%", display: "flex", flexDirection: "column" }}>
            
            {/* ---------- Search Bar ---------- */}
            <div className={PDFstyles.searchBarContainer}>
              <button
                className={PDFstyles.modeToggleButton}
                onClick={() => setIsMathMode(!isMathMode)}
                title={isMathMode ? "Switch to Text Mode" : "Switch to Math Mode"}
              >
                {isMathMode ? "𝟄𝐚𝐛𝐜" : "𝑎𝑏𝑐"}
              </button>
    
              <math-field
                ref={mathFieldRef}
                placeholder="\[Search\ mathematics...\]"
                style={{ flexGrow: 1 }}
                onInput={() => {
                  // Update the shared searchBarContent state whenever the math-field changes
                  const v = mathFieldRef.current?.getValue() || '';
                  setSearchBarContent(v);
                }}
              ></math-field>
    
              <button
                className={PDFstyles.searchButton}
                onClick={handleSearch}
              >
                Search
              </button>
            </div>
    
            {/* ---------- Search Results ---------- */}
            <div style={{ flexGrow: 1, overflowY: "auto", marginTop: "10px" }}>
              {currentQueryAndResults.length > 0 && (
                <button
                  className={PDFstyles.clearButton}
                  onClick={() => setCurrentQueryAndResults([])}
                >
                  Clear Results
                </button>
              )}
    
              {isSearching && (
                <div className={PDFstyles.loadingContainer}>
                  <div className={PDFstyles.loadingSpinner}></div>
                  <p className={PDFstyles.loadingText}>Searching...</p>
                </div>
              )}

              {searchError && (
                <div className={PDFstyles.errorContainer}>
                  <p className={PDFstyles.errorText}>{searchError}</p>
                </div>
              )}
    
              {!isSearching && currentQueryAndResults.length > 0 ? (
                currentQueryAndResults
                  .slice()
                  .map((item, index) => (
                    <QueryAndResult
                      key={index}
                      query={item.query}
                      results={item.results}
                    />
                  ))
              ) : !isSearching && !searchError ? (
                <p className={PDFstyles.noResultsMessage}>
                  Perform a search to see results here.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
    }
  export default App;
  