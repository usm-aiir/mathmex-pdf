import type { FormulaRegion } from "../types";
import styles from './Highlight.module.css';

interface HighlightProps {
    region: FormulaRegion;
    pageWidth?: number;
    pageHeight?: number;
    pdfUrl: string;
    isHighlighted?: boolean; // Optional prop to indicate if the highlight is active
    onClick?: (region: FormulaRegion) => void; // Optional click handler
}

function Highlight({ region, pageWidth, pageHeight, isHighlighted, onClick }: HighlightProps) {
    const width = (pageWidth || 1) * (region.boundingRect.x2 - region.boundingRect.x1);
    const height = (pageHeight || 1) * (region.boundingRect.y2 - region.boundingRect.y1);
    
    const hasSpokenMath = region.spokenMath && region.spokenMath.trim().length > 0;
    
    return (
        <div
            className={styles.tooltipWrapper}
            style={{
                width: `${width}px`,
                height: `${height}px`,
            }}
        >
            <div
                className={`${styles.mathHighlight} ${isHighlighted ? styles.mathHighlight_active : ''}`}
                style={{
                    width: '100%',
                    height: '100%',
                }}
                id={`highlight-${region.id}`}
                aria-label={region.spokenMath || region.latex || '[Formula not yet loaded]'}
                onClick={onClick ? () => onClick(region) : undefined}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onClick(region);
                    }
                }}
            />
            {/* Tooltip showing spoken math on hover */}
            <div className={styles.tooltip}>
                <div className={styles.tooltipHeader}>Spoken Math</div>
                <div className={styles.spokenMathText}>
                    {hasSpokenMath 
                        ? region.spokenMath 
                        : region.latex 
                            ? `Loading spoken math for: ${region.latex.substring(0, 50)}${region.latex.length > 50 ? '...' : ''}`
                            : 'Formula not yet loaded'
                    }
                </div>
            </div>
        </div>
    );
}

export default Highlight;