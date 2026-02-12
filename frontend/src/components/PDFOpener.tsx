import { useState, type SetStateAction } from 'react';
// Import the CSS module
import styles from './PDFOpener.module.css';

/**
 * PDFOpener Component
 * A modular React component for users to input a link and open it as a PDF.
 * It takes up the whole screen and provides basic URL validation.
 */
const PDFOpener = () => {
    // State to store the user-entered link
    const [link, setLink] = useState('');
    // State to manage messages displayed to the user (e.g., error, success)
    const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' or 'error'

    /**
     * Handles the change event for the input field.
     * Updates the 'link' state with the current value of the input.
     * Clears any existing messages when the user starts typing.
     * @param {Object} e - The event object from the input change.
     */
    const handleLinkChange = (e: { target: { value: SetStateAction<string>; }; }) => {
        setLink(e.target.value);
        // Clear any previous messages when the user starts typing again
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

    /**
     * Handles the click event for the "Open PDF" button.
     * Performs validation on the input link.
     * If valid, it attempts to open the link in a new browser tab.
     * Displays appropriate messages based on validation results.
     */
    const handleOpenPdf = () => {
        if (!link.trim()) {
            // If the input is empty or only whitespace, show an error message
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
        // Main container for the whole page
        <div className={styles.container}>
            {/* Card-like container for the input and button */}
            <div className={styles.card}>
                {/* Title of the UI */}
                <h1 className={styles.title}>
                    Open Your PDF
                </h1>

                {/* Input field for the URL */}
                <div className={styles.inputWrapper}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Enter or paste your PDF link here..."
                        value={link}
                        onChange={handleLinkChange}
                        aria-label="PDF Link Input"
                    />
                </div>

                {/* Message display area */}
                {message.text && (
                    <div
                        className={`${styles.message} ${message.type === 'error' ? styles.messageError : styles.messageSuccess}`}
                        role={message.type === 'error' ? 'alert' : 'status'}
                    >
                        {message.text}
                    </div>
                )}

                {/* Button to trigger the PDF opening action */}
                <button
                    onClick={handleOpenPdf}
                    className={styles.button}
                    aria-label="Open PDF Button"
                >
                    Open PDF
                </button>
            </div>
        </div>
    );
};

export default PDFOpener;
