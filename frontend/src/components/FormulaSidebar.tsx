import styles from "./FormulaSidebar.module.css";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, memo, useState, useCallback, useEffect } from "react";

interface FormulaSidebarProps {
  formulas?: string[];
  selectedFormula: string | null;
  onFormulaClick: (latex: string) => void;
}

function FormulaSidebar({
  formulas = [],
  selectedFormula,
  onFormulaClick,
}: FormulaSidebarProps) {

  const parentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: formulas.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // initial estimate
    overscan: 12,
    measureElement: (el) => el.getBoundingClientRect().height,
  });


  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // If a user clicks outside the sidebar when it's open, it should close it. This handles this
  useEffect(() => {
    // Side bar is not open, so don't listen for outside clicks
    if (!sidebarOpen) return;

    function handlePointerDown(e: PointerEvent) {
      const el = wrapperRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (target && !el.contains(target)) {
        setSidebarOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    // Cleanup, dont leave event listener around
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [sidebarOpen]);

  return (

    <div ref={wrapperRef} className={`${styles.wrapper} ${sidebarOpen ? styles.wrapperOpen : styles.wrapperClosed}`}>
      {/* ---------- FORMULA SIDEBAR TOGGLE ---------- */}
      <button
        onClick={toggleSidebar}
        className={styles.sidebarButton}
      >
        {sidebarOpen ? "Hide Formulas" : "Show Formulas"}
      </button>


      <aside className={styles.sidebar}>
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
                    data-index={virtualRow.index}
                    ref={(el) => rowVirtualizer.measureElement(el)}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      paddingBottom: "16px",
                    }}
                  >
                    <button
                      onClick={() => onFormulaClick(latex)}
                      className={`${styles.formulaButton} ${isSelected ? styles.selected : ""
                        }`}
                    >

                      <InlineMath math={latex} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export default memo(FormulaSidebar, (prev, next) =>
  prev.selectedFormula === next.selectedFormula &&
  prev.formulas === next.formulas
);