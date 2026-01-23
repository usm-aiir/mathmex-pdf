import { useState, memo, useRef } from 'react';
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
import { useVirtualizer } from '@tanstack/react-virtual';

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
  const parentRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  
  async function onDocumentLoadSuccess(pdf: DocumentCallback) {
    console.log('PDF loaded successfully:', pdf.numPages, 'pages');
    setNumPages(pdf.numPages);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
    console.error('Error details:', error.message);
  }

  const rowVirtualizer = useVirtualizer({
    count: numPages || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 800, 
    overscan: 1, 
  });

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
    <div className={styles.pdfColumn} >

      {/* ================= MAIN CONTENT ================= */}
      <div ref={parentRef} className={styles.pdfContent} style={{ overflow: 'auto', display: 'block' }}>
        <Document
          file={`${API}/get_pdf/${pdfDocumentMetadata?.url}`}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
        >
         
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              maxWidth: '800px',
              margin: '0 auto',
              position: 'relative',
            }}
          >
            
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const pageNumber = virtualRow.index + 1;
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    justifyContent: 'center',
                    display: 'flex',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className={styles.pdfPageWrapper}>
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
                </div>
              );
            })}
          </div>
        </Document>
      </div>

      <SelectionButton onAction={handleSelectionAction} />
    </div>


  )

}
export default memo(PDFViewer)
