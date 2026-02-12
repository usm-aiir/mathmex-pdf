import { useState, memo, useRef, useEffect } from 'react';
import { Document, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';

import { useVirtualizer } from '@tanstack/react-virtual';
import type { MathfieldElement } from 'mathlive';
import 'mathlive';

import PDFPage from './PDFPage';
import SelectionButton from './SelectionButton';

import type { PDFDocumentMetadata } from '../types';
import { API } from '../App';

import styles from './PDFViewer.module.css';
import pageStyles from './PDFPage.module.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Normalizes LaTeX strings for comparison by removing unnecessary braces around single characters.
 * This allows matching between 'a^2' and 'a^{2}', 'x_i' and 'x_{i}', etc.
 * @param latex - The LaTeX string to normalize
 * @returns The normalized LaTeX string
 */
function normalizeLatex(latex: string): string {
  if (!latex) return '';
  
  return latex
    // Remove braces around single characters/digits after ^ and _
    .replace(/([\^_])\{([a-zA-Z0-9])\}/g, '$1$2')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Custom element typing for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { placeholder?: string };
    }
  }
}

export interface PDFViewerProps {
  pdfDocumentMetadata: PDFDocumentMetadata;
  mathFieldRef: React.RefObject<MathfieldElement>;
  scrollToPage?: number;
  searchBarContent: string;
  onSearchBarContentChange: (content: string) => void;
}

function PDFViewer({
  pdfDocumentMetadata,
  mathFieldRef,
  scrollToPage,
  searchBarContent,
  onSearchBarContentChange,
}: PDFViewerProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  function onDocumentLoadSuccess(pdf: PDFDocumentProxy) {
    if (process.env.NODE_ENV === 'development') {
      console.log('PDF loaded successfully:', pdf.numPages, 'pages');
    }
    setNumPages(pdf.numPages);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
  }

  const rowVirtualizer = useVirtualizer({
    count: numPages ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 900,
    overscan: 1,
  });

  // Track which highlights are currently selected based on search bar content
  const lastAppliedHighlightsRef = useRef<Set<number>>(new Set());

  // Apply/remove permanent selection styling based on search bar content
  useEffect(() => {
    console.log('PDFViewer: searchBarContent changed:', searchBarContent);
    
    // Get all regions that match the search bar content
    const matchingRegionIds = new Set<number>();
    
    if (searchBarContent.trim()) {
      const normalizedSearchContent = normalizeLatex(searchBarContent);
      console.log('PDFViewer: Normalized search content:', normalizedSearchContent);
      
      pdfDocumentMetadata.regions.forEach(region => {
        if (region.latex) {
          const normalizedRegionLatex = normalizeLatex(region.latex);
          if (normalizedSearchContent.includes(normalizedRegionLatex)) {
            matchingRegionIds.add(region.id);
            console.log('PDFViewer: Found matching region:', region.id, 'original:', region.latex, 'normalized:', normalizedRegionLatex);
          }
        }
      });
    }

    console.log('PDFViewer: Matching region IDs:', Array.from(matchingRegionIds));
    console.log('PDFViewer: Previously highlighted:', Array.from(lastAppliedHighlightsRef.current));

    // Remove highlighting from previously selected elements that no longer match
    lastAppliedHighlightsRef.current.forEach(regionId => {
      if (!matchingRegionIds.has(regionId)) {
        const el = document.getElementById(`highlight-${regionId}`);
        console.log('PDFViewer: Removing highlight from region:', regionId, 'element:', el);
        el?.classList.remove(pageStyles.selected);
      }
    });

    // Add highlighting to newly matching elements
    matchingRegionIds.forEach(regionId => {
      const el = document.getElementById(`highlight-${regionId}`);
      if (el) {
        console.log('PDFViewer: Adding highlight to region:', regionId);
        el.classList.add(pageStyles.selected);
      }
    });

    lastAppliedHighlightsRef.current = matchingRegionIds;
  }, [searchBarContent, pdfDocumentMetadata.regions]);

  // Observe DOM additions ONLY inside the PDF container
  useEffect(() => {
    if (!parentRef.current) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement && node.id?.startsWith('highlight-')) {
            const regionIdStr = node.id.replace('highlight-', '');
            const regionId = parseInt(regionIdStr, 10);
            
            // Check if this region's latex exists in search bar content
            const region = pdfDocumentMetadata.regions.find(r => r.id === regionId);
            if (region?.latex) {
              const normalizedSearchContent = normalizeLatex(searchBarContent);
              const normalizedRegionLatex = normalizeLatex(region.latex);
              if (normalizedSearchContent.includes(normalizedRegionLatex)) {
                node.classList.add(pageStyles.selected);
                lastAppliedHighlightsRef.current.add(regionId);
              }
            }
          }
        }
      }
    });

    observer.observe(parentRef.current, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [searchBarContent, pdfDocumentMetadata.regions]);

  // Scroll to requested page after load
  useEffect(() => {
    if (!scrollToPage || !numPages) return;

    const idx = Math.max(0, Math.min(numPages - 1, scrollToPage - 1));
    rowVirtualizer.scrollToIndex(idx, { align: 'center' });
  }, [scrollToPage, numPages, rowVirtualizer]);

  const handleSelectionAction = (selectedText: string) => {
    if (!selectedText.trim()) {
      console.warn('No text selected for math insertion.');
      return;
    }

    const escapedText = selectedText
      .replace(/\\/g, '\\\\')
      .replace(/[{}]/g, '');

    const field = mathFieldRef.current;
    if (!field) return;

    field.setValue(`${field.getValue()} \\text{${escapedText}}`);
    field.focus();
  };

  return (
    <div className={styles.pdfColumn}>
      <div
        ref={parentRef}
        className={styles.pdfContent}
        style={{ overflow: 'auto' }}
      >
        <Document
          file={`${API}/get_pdf/${pdfDocumentMetadata.url}`}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
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
                    display: 'flex',
                    justifyContent: 'center',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className={styles.pdfPageWrapper}>
                    <PDFPage
                      pageNumber={pageNumber}
                      regions={
                        pdfDocumentMetadata.regions.filter(
                          (r) => r.pageNumber === pageNumber
                        )
                      }
                      pdfUrl={pdfDocumentMetadata.url}
                      onHighlightClick={(latex) => {
                        const field = mathFieldRef.current;
                        if (!field) return;

                        const newValue = `${field.getValue()} ${latex}`;
                        field.setValue(newValue);
                        onSearchBarContentChange(newValue);
                        field.focus();
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
  );
}

export default memo(PDFViewer);
