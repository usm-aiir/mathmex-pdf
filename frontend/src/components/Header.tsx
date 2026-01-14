import styles from "./Header.module.css"
import type { FC } from "react"
import { History } from "lucide-react"


interface HeaderProps {
  onToggleHistory?: () => void
  isHistoryOpen?: boolean
}

const Header: FC<HeaderProps> = ({
    onToggleHistory,
    isHistoryOpen = false, // default value
  }) => {
    return (
      <header className={styles.header}>
        <div className={`${styles.buttonContainer} ${styles.right}`}>
                          <button
                className={styles.historyToggleButton}
                onClick={onToggleHistory}
                title={isHistoryOpen ? "Hide Search History" : "Show Search History"}
              >
                <History size={28} />
              </button>
        </div>
        <div className="container">
            <div className={styles.headerContent}>
            <div className={styles.titleContainer}>
              <h1 className={styles.title}>PDF Reader</h1>
              <p className={styles.tagline}>
                Powered by <a href="https://mathmex.com">MathMex</a>
              </p>
            </div>
          </div>
        </div>
      </header>
    )
  }
  export default Header
/*
              <button
                className={styles.historyToggleButton}
                onClick={onToggleHistory}
                title={isHistoryOpen ? "Hide Search History" : "Show Search History"}
              >
                <History size={28} />
              </button>
*/