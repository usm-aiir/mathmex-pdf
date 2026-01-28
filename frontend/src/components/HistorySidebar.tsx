import styles from "./HistorySidebar.module.css"
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

interface PDFSearchHistoryItem {
  query: string
  results: any[] // or SearchResult[]?
}

interface HistorySidebarProps {
  history: PDFSearchHistoryItem[]
  isOpen: boolean
  onClear: () => void
  onSelect: (item: PDFSearchHistoryItem) => void
  onExport: () => void
}

export default function HistorySidebar({
  history,
  isOpen,
  onClear,
  onSelect,
  onExport,
}: HistorySidebarProps) { 
  
  const MAX_VISIBLE_HISTORY = 20
  const visibleHistory = history.slice(0, MAX_VISIBLE_HISTORY)

  return (
<aside
  className={`${styles.historySidebar} ${isOpen ? styles.open : ""}`}
>
  {/* Header */}
  <div className={`${styles.historyHeader} ${styles.glass}`}>
    <h4 className={styles.historyTitle}>Search History</h4>

    <div>
      <button
        className={styles.clearHistoryBtn}
        onClick={onExport}
      >
        Export
      </button>

      <button
        className={styles.clearHistoryBtn}
        onClick={onClear}
      >
        Clear
      </button>
    </div>
  </div>

  {/* History list */}
  <div className={styles.historyList}>
    {visibleHistory.length === 0 ? (
      <p className={styles.emptyHistory}>No searches yet</p>
    ) : (
      visibleHistory.map((item, index) => (
        <div
          key={index}
          className={styles.historyItem}
          onClick={() => onSelect(item)}
        >
          <div className={styles.historyFormula}>
            <InlineMath math={item.query} />
          </div>

        </div>
      ))
    )}
  </div>
</aside>

  )
}
