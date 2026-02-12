import { useState, useMemo, type SetStateAction } from 'react';
import styles from './PDFOpener.module.css';
import { Upload, Loader2, Clock, FileText } from 'lucide-react'; // Added icons
import { useRecentPDFs } from '../hooks/useRecentPDFs'; // Import the hook

/**
 * PDFOpener Component
 * A modular React component for users to input a link, or upload a file and open it as a PDF.
 * It takes up the whole screen and provides basic URL validation.
 */
const PDFOpener = () => {
  const [link, setLink] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isUploading, setIsUploading] = useState(false);

  const { recents, addRecent } = useRecentPDFs();

  /**
   * Handles the change event for the input field.
   * Updates the 'link' state with the current value of the input.
   * Clears any existing messages when the user starts typing.
   * @param {Object} e - The event object from the input change.
   */
  const handleLinkChange = (e: { target: { value: SetStateAction<string> } }) => {
    setLink(e.target.value);
    setMessage({ text: '', type: '' });
  };

  /**
   * Validates the URL format.
   * This is a basic check to ensure the string can be parsed as a URL
   * and has an http or https protocol.
   * @param {string} urlString - The URL string to validate.
   * @returns {boolean} - True if the URL is valid, false otherwise.
   */
  const isValidUrl = (urlString: string | URL) => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      // If URL constructor throws an error, the string is not a valid URL
      return false;
    }
  };

  const navigateToPdf = (pdfSrc: string) => {
    const basePath = window.location.pathname.split('/pdf/')[0];
    // Ensure we don't double slash if basePath is "/"
    const prefix = basePath === '/' ? '' : basePath;
    window.location.href = `${prefix}/pdf/${encodeURIComponent(pdfSrc)}`;
  };

  const handleOpenPdf = () => {
    if (!link.trim()) {
      setMessage({ text: 'Please enter a link.', type: 'error' });
      return;
    }

    if (isValidUrl(link)) {
      // Add to history (auto-generates name from URL)
      addRecent(link);
      navigateToPdf(link);
    } else {
      setMessage({
        text: 'Please enter a valid PDF URL.',
        type: 'error',
      });
    }
  };

    // Define the expiration constant (1 hour in milliseconds)
  const FILE_EXPIRATION_MS = 3600000; 

  // Filter recents to only show files less than 1 hour old
  const validRecents = useMemo(() => {
    const now = Date.now();
    return recents.filter(item => {
      // If no timestamp exists, assume it's old/invalid
      if (!item.timestamp) return false;
      return (now - item.timestamp) < FILE_EXPIRATION_MS;
    });
  }, [recents]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage({ text: '', type: '' });

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("https://api.pdf.mathmex.com/upload_pdf", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      
      // Add to history using the REAL filename from the file object
      addRecent(data.pdf_url, file.name);

      navigateToPdf(data.pdf_url);
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Failed to upload PDF.', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Open Your PDF</h1>

        <div className={styles.inputGroup}>
          <input
            type="text"
            className={styles.input}
            placeholder="Enter or paste your PDF link here..."
            value={link}
            onChange={handleLinkChange}
            onKeyDown={(e) => e.key === 'Enter' && handleOpenPdf()}
          />

          <label 
            className={`${styles.iconButton} ${isUploading ? styles.disabled : ''}`}>
            {isUploading ? (
              <Loader2 className={styles.spin} size={24} />
            ) : (
              <Upload size={24} />
            )}
            <input
              type="file"
              accept="application/pdf"
              hidden
              disabled={isUploading}
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {message.text && (
          <div className={`${styles.message} ${message.type === 'error' ? styles.messageError : styles.messageSuccess}`}>
            {message.text}
          </div>
        )}

        <button onClick={handleOpenPdf} className={styles.button}>
          Open PDF
        </button>

        {/* --- RECENT FILES LIST --- */}
        {validRecents.length > 0 && (
          <div className={styles.recentSection}>
            <div className={styles.recentHeader}>
              <Clock size={16} />
              <span>Recent Files</span>
            </div>
            
            <div className={styles.recentList}>
              {recents.map((item, index) => (
                <div 
                  key={index} 
                  className={styles.recentItem}
                  onClick={() => {
                    addRecent(item.url, item.name);
                    navigateToPdf(item.url);
                  }}
                  // -----------------------                  title={item.url}
                >
                  <FileText size={16} className={styles.fileIcon} />
                  <span className={styles.fileName}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PDFOpener;