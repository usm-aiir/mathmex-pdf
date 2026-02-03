interface FormulaRegion {
    id: number;
    pageNumber: number;
    boundingRect: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    };
    latex?: string; // Optional field for storing LaTeX content
    spokenMath?: string; // Optional field for storing spoken math (accessibility)
}

interface PDFDocumentMetadata {
    url: string;
    formulas: string[];
    regions: FormulaRegion[];
}

interface SpokenMathData {
    id: number;
    latex: string;
    spoken_math: string;
}

export type { FormulaRegion, PDFDocumentMetadata, SpokenMathData }