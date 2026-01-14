import styles from "./HistorySidebar.module.css"

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
    {history.length === 0 ? (
      <p className={styles.emptyHistory}>No searches yet</p>
    ) : (
      history.map((item, index) => (
        <div
          key={index}
          className={styles.historyItem}
          onClick={() => onSelect(item)}
        >
          <div className={styles.historyFormula}>
            <math-field
              read-only
              default-mode="inline-math"
              virtual-keyboard-mode="off"
            >
              {item.query}
            </math-field>
          </div>
        </div>
      ))
    )}
  </div>
</aside>

  )
}
