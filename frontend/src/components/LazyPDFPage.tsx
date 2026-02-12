import { useEffect, useRef, useState } from 'react';
import PDFPage from './PDFPage';
import styles from './LazyPDFPage.module.css'

interface LazyPDFPageProps {
  pageNumber: number;
  regions: any[];
  pdfUrl: string;
  onHighlightClick: (latex: string) => void;
}

export default function LazyPDFPage({ pageNumber, regions, pdfUrl, onHighlightClick }: LazyPDFPageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // no need to observe once loaded
        }
      },
      { rootMargin: '200px' } // preload before fully visible
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ minHeight: '900px' }} className={styles.pdfPageWrapper}>
      {isVisible ? (
        <PDFPage
          pageNumber={pageNumber}
          regions={regions}
          pdfUrl={pdfUrl}
          onHighlightClick={onHighlightClick}
        />
      ) : (
        <div style={{ height: '900px' }} /> // placeholder
      )}
    </div>
  );
}
