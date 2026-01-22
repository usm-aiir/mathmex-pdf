import styles from "./FormulaSidebar.module.css";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, memo } from "react";
import CachedFormula from "./CachedFormula";

interface FormulaSidebarProps {
  formulas?: string[];
  isOpen: boolean;
  selectedFormula: string | null;
  onFormulaClick: (latex: string) => void;
}

function FormulaSidebar({
  formulas = [],
  isOpen,
  selectedFormula,
  onFormulaClick,
}: FormulaSidebarProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: formulas.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // row height
    overscan: 6,
  });

  return (
    <MathJaxContext
    version={3}
    config={{
      tex: { inlineMath: [["\\(", "\\)"]] },
      svg: { fontCache: "global" },
    }}
  >
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
        <div className={styles.header}>Extracted Formulas</div>

        {formulas.length === 0 ? (
          <p className={styles.empty}>No formulas found.</p>
        ) : (
          <div
            ref={parentRef}
            className={styles.formulaList}
            style={{ overflow: "auto" }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const latex = formulas[virtualRow.index];
                const isSelected = selectedFormula === latex;

                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <button
                      onClick={() => onFormulaClick(latex)}
                      className={`${styles.formulaButton} ${
                        isSelected ? styles.selected : ""
                      }`}
                    >
      <MathJax hideUntilTypeset="first">
        {`\\(${latex}\\)`}
        </MathJax></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>
      </MathJaxContext>

  );
}

export default memo(FormulaSidebar, (prev, next) =>
  prev.isOpen === next.isOpen &&
  prev.selectedFormula === next.selectedFormula &&
  prev.formulas === next.formulas
);