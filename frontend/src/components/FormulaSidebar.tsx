import styles from "./FormulaSidebar.module.css";
import { MathJax, MathJaxContext } from "better-react-mathjax";


interface FormulaSidebarProps {
  formulas?: string[];
  isOpen: boolean;
  selectedFormula: string | null;
  onFormulaClick: (latex: string) => void;
}

export default function FormulaSidebar({
  formulas = [],
  isOpen,
  selectedFormula,
  onFormulaClick,
}: FormulaSidebarProps) {
  return (
    <MathJaxContext
      version={3} // Use MathJax v3
      config={{
        tex: { inlineMath: [["\\(", "\\)"]] }, // Configure inline math delimiters
        svg: { fontCache: "global" },          // Optional SVG config
      }}
    >
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
        <div className={styles.header}>Extracted Formulas</div>

        {formulas.length === 0 && (
          <p className={styles.empty}>No formulas found.</p>
        )}

        <div className={styles.formulaList}>
          {formulas.map((latex, i) => {
            const isSelected = selectedFormula === latex;
            return (
              <button
                key={i}
                onClick={() => onFormulaClick(latex)}
                className={`${styles.formulaButton} ${isSelected ? styles.selected : ""}`}
              >
                <MathJax dynamic>{`\\(${latex}\\)`}</MathJax>
              </button>
            );
          })}
        </div>
      </aside>
    </MathJaxContext>
  );
}
