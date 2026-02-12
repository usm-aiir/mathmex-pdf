import styles from "./Header.module.css"
import type { FC } from "react"

/**
 * Header.tsx
 *
 * Application header component. Displays the app title, tagline, and theme (dark/light) toggle buttons.
 */
/**
 * Header component for the MathMex app.
 *
 * Displays the app title, tagline, and theme toggle buttons for dark/light mode.
 *
 * @returns {JSX.Element} The rendered header.
 */
const Header: FC<{  }> = ({  }) => {

  return (
    <header className={styles.header}>

      {/* LEFT: Home Button */}
      {showHistoryToggle && (
      <div className={`${styles.buttonContainer} ${styles.left}`}>
        <button
          className={styles.homeButton}
          onClick={goHome}
          title="Go Home"
        >
          <Home size={28} />
        </button>
      </div>
      )}

      {/* CENTER: Title */}
      <div className="container">
        <div className={styles.headerContent}>
          <div className={styles.titleContainer}>
            <h1 className={styles.title}><a style={ { textDecoration:"none"} } href="https://mathmex.com">MathMex</a>-PDF</h1>
          </div>
        </div>
      </div>

      {/* RIGHT: History Toggle */}
      {showHistoryToggle && (
        <div className={`${styles.buttonContainer} ${styles.right}`}>
          <button
            className={styles.historyToggleButton}
            onClick={onToggleHistory}
            title={isHistoryOpen ? "Hide Search History" : "Show Search History"}
          >
            <History size={28} />
          </button>
        </div>
      )}

    </header>
  )
}

export default Header