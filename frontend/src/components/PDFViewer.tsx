import { useState, memo} from 'react';
import { Document } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';

import { pdfjs } from 'react-pdf';
import type { DocumentCallback } from 'react-pdf/dist/shared/types.js';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

import type { PDFDocumentMetadata } from '../types';
import PDFPage from './PDFPage';
import SelectionButton from './SelectionButton';
import "mathlive"
import { API } from '../App';

// Import the CSS module
import styles from './PDFViewer.module.css';

// Add TypeScript declaration for the custom element
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'math-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { placeholder?: string };
        }
    }
}



export interface PDFViewerProps {
  pdfDocumentMetadata: PDFDocumentMetadata

  mathFieldRef: React.RefObject<MathfieldElement>
  onFormulaClick: (latex: string) => void
}

interface MathfieldElement extends HTMLElement {
  executeCommand: (command: string, ...args: any[]) => void;
  focus: () => void;
  setValue: (value: string) => void;
  getValue: () => string;
  latex: string;
}

function PDFViewer({ pdfDocumentMetadata, mathFieldRef }: PDFViewerProps,) {

  const [numPages, setNumPages] = useState<number | null>(null);
  async function onDocumentLoadSuccess(pdf: DocumentCallback) {
    console.log('PDF loaded successfully:', pdf.numPages, 'pages');
    setNumPages(pdf.numPages);
  }
  
  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
    console.error('Error details:', error.message);
  }

  const pageNumbers = Array.from({ length: numPages || 0 }, (_, i) => i + 1);

  const handleSelectionAction = (selectedText: string) => {
    // Check if the selected text is empty
    if (!selectedText.trim()) {
      console.warn('No text selected for MathMex search.');
      return;
    }
    // Always append selected text as plain text
    mathFieldRef.current?.setValue(mathFieldRef.current.getValue() + ' ' + "\\text{" + selectedText + "}");
  };

  return (
      <div className={styles.pdfColumn}>
    
        {/* ================= MAIN CONTENT ================= */}
        <div className={styles.pdfContent}>
  <Document
            file={`${API}/get_pdf/${pdfDocumentMetadata?.url}`}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
          >
            {pageNumbers.map((pageNumber) => (
              <div key={pageNumber} className={styles.pdfPageWrapper}>
                <PDFPage
                  pageNumber={pageNumber}
                  regions={
                    pdfDocumentMetadata?.regions.filter(
                      region => region.pageNumber === pageNumber
                    ) || []
                  }
                  pdfUrl={pdfDocumentMetadata?.url || ''}
                  onHighlightClick={latex => {
                    if (mathFieldRef.current) {
                      mathFieldRef.current.setValue(
                        mathFieldRef.current.getValue() + ' ' + latex
                      )
                      mathFieldRef.current.focus()
                    }
                  }}
                />
              </div>
            ))}
          </Document>
          </div>
    
          <SelectionButton onAction={handleSelectionAction} />
        </div>
    
       
    )
    
}  
export default memo(PDFViewer)
