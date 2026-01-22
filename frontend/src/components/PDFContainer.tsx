import { memo } from "react"
import type { PDFDocumentMetadata } from "../types"
import PDFViewer from "./PDFViewer"



interface PDFContainerProps {
  pdfDocumentMetadata: PDFDocumentMetadata;
  onFormulaClick: (latex: string) => void;
  mathFieldRef: React.RefObject<MathfieldElement>
}
interface MathfieldElement extends HTMLElement {
    executeCommand: (command: string, ...args: any[]) => void;
    focus: () => void;
    setValue: (value: string) => void;
    getValue: () => string;
    latex: string;
  }

function PDFContainer({
  pdfDocumentMetadata,
  onFormulaClick,
  mathFieldRef,
}: PDFContainerProps) {


  return (
<PDFViewer
  pdfDocumentMetadata={pdfDocumentMetadata}
  mathFieldRef={mathFieldRef}
  onFormulaClick={onFormulaClick}
/>
  )
}

export default memo(PDFContainer)
