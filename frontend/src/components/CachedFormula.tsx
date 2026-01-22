import { MathJax, MathJaxContext } from "better-react-mathjax"
import { memo } from "react"

interface CachedFormulaProps {
  latex: string
}

const CachedFormula = memo(
  ({ latex }: CachedFormulaProps) => {
    return (
        <MathJaxContext
        version={3}
        config={{
          tex: { inlineMath: [["\\(", "\\)"]] },
          svg: { fontCache: "global" },
        }}
      >
      <MathJax hideUntilTypeset="first">
        {`\\(${latex}\\)`}
        </MathJax>
        </MathJaxContext>
    )
  },
  (prev, next) => prev.latex === next.latex
)

export default CachedFormula
