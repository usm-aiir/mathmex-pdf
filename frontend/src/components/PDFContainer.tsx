import { memo } from "react"
import type { PDFDocumentMetadata } from "../types"
import type { MathfieldElement } from 'mathlive'
import PDFViewer from "./PDFViewer"

interface PDFContainerProps {
  pdfDocumentMetadata: PDFDocumentMetadata;
  mathFieldRef: React.RefObject<MathfieldElement>;
  searchBarContent: string;
  scrollToPage?: number;
  onSearchBarContentChange: (content: string) => void;
}

function PDFContainer({
  pdfDocumentMetadata,
  mathFieldRef,
  searchBarContent,
  scrollToPage,
  onSearchBarContentChange,
}: PDFContainerProps) {


  return (
<PDFViewer
  pdfDocumentMetadata={pdfDocumentMetadata}
  mathFieldRef={mathFieldRef}
  searchBarContent={searchBarContent}
  scrollToPage={scrollToPage}
  onSearchBarContentChange={onSearchBarContentChange}
/>
  )
}

export default memo(PDFContainer)
