import React, { useEffect, useState } from 'react';
import { processMathMarkdown } from '../utils/markdownProcessor'; // Import the new utility
import type { SearchResult } from './QueryAndResult'; // Re-import SearchResult
import styles from './SearchResultItem.module.css'; // Import the CSS module

// Define props for the component
interface SearchResultItemProps {
    result: SearchResult;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ result }) => {
    const [processedTitle, setProcessedTitle] = useState<string>('');
    const [processedBodyText, setProcessedBodyText] = useState<string>('');

    useEffect(() => {
        const processContent = async () => {
            setProcessedTitle(await processMathMarkdown(result.title));
            setProcessedBodyText(await processMathMarkdown(result.body_text));
        };
        processContent();
    }, [result.title, result.body_text]);

    return (
        <a  
            href={
                result.media_type !== "pdf"
                ? result.link
                : "http://mathmex.com/pdf_reader//pdf/https://arxiv.org/pdf/" + result.link.substring(0, result.link.length - 5)
                // Open PDFs in new tab with PDF Reader.
            }
            target="_blank" // Open link in new tab
            rel="noopener noreferrer" // Security best practice for target="_blank"
            className={styles.item}
        >
            <div
                className={styles.title}
                title={result.title}
                dangerouslySetInnerHTML={{ __html: processedTitle }}
            ></div>
            <div
                className={styles.bodyText}
                dangerouslySetInnerHTML={{ __html: processedBodyText }}
            ></div>
            <div className={styles.meta}>
                <span className={styles.mediaType}>{result.media_type}</span>
                <span className={styles.score}>Score: {result.score.toFixed(2)}</span>
            </div>
        </a>
    );
};

export default SearchResultItem;
