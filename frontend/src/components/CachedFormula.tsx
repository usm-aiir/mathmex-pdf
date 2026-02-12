import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { memo } from "react"

interface CachedFormulaProps {
  latex: string
}

const CachedFormula = memo(
  ({ latex }: CachedFormulaProps) => {
    return (
      <InlineMath math={latex} />
    )
  },
  (prev, next) => prev.latex === next.latex
)

export default CachedFormula
