import { useEffect, useRef } from 'react';
import SearchResultItem from './SearchResultItem';
import "mathlive"; // Ensure MathLive is imported for the custom element
import styles from './QueryAndResult.module.css'; // Import the CSS module

// Define the type for a single search result item (re-use from SearchResultItem.tsx)
export interface SearchResult { // Exporting so SearchResultItem can use it
    body_text: string;
    link: string;
    media_type: string;
    score: number;
    title: string;
}

// Define props for the QueryAndResult component
interface QueryAndResultProps {
    query: string; // The search query, potentially containing LaTeX
    results: SearchResult[]; // Array of search results
    setCurrentQueryAndResults: (value: any[]) => void;

}

// Extend HTMLElement to add MathLive specific properties for the ref
interface MathfieldElement extends HTMLElement {
    setValue: (value: string) => void; // Method to set the LaTeX value
    readOnly: boolean;
}

function QueryAndResult({ query, results, setCurrentQueryAndResults }: QueryAndResultProps) {
    const mathFieldRef = useRef<MathfieldElement>(null);

    // Use useEffect to set the LaTeX value when the query prop changes
    useEffect(() => {
        if (mathFieldRef.current) {
            mathFieldRef.current.setValue(query); // Set the LaTeX value to the math field
            mathFieldRef.current.readOnly = true; // Ensure it's read-only for display
        }
    }, [query]); // Re-run effect if the query changes

    return (
        <div>

        <div className={styles.container}>
            {/* Query Section */}
            <div className={styles.querySection}>
                <div className={styles.queryLabel}>Your Query:</div>
                {/* MathLive field for rendering the query */}
                <math-field ref={mathFieldRef} style={{ width: '100%', border: 'none', background: 'transparent' }}></math-field>
            </div>

            {/* Results Section */}
            <div className={styles.resultsSection}>
                <div className={styles.resultsLabel}>Results:</div>
                {results.length > 0 ? (
                    // Slice results to ensure only up to 5 are displayed
                    results.slice(0, 5).map((result, index) => (
                        <SearchResultItem key={index} result={result} />
                    ))
                ) : (
                    <p className={styles.noResults}>No results found for this query.</p>
                )}
            </div>
        </div>
        </div>
    );
}

export default QueryAndResult;
