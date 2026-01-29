// src/hooks/useRecentPDFs.ts

import { useState, useEffect } from 'react';

export interface RecentPDF {
  url: string;
  name: string;
  timestamp: number;
}

const STORAGE_KEY = 'recent_pdfs';
const MAX_RECENT = 4;

export const useRecentPDFs = () => {
  const [recents, setRecents] = useState<RecentPDF[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecents(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent PDFs", e);
      }
    }
  }, []);

  const addRecent = (url: string, name?: string) => {
    setRecents((prev) => {
      // 1. Determine display name (use existing name if file is already in list)
      let displayName = name;
      
      // If no name provided (e.g. clicking a link), try to find the old name 
      // from the list so we don't overwrite a nice name with a raw URL.
      if (!displayName) {
        const existing = prev.find(p => p.url === url);
        if (existing) {
            displayName = existing.name;
        } else {
            // Fallback parsing logic
            try {
                const cleanUrl = url.split(/[?#]/)[0];
                displayName = cleanUrl.split('/').pop() || 'Untitled PDF';
                if (displayName.length > 30 || !displayName.includes('.')) {
                    displayName = "Web Document"; 
                }
            } catch {
                displayName = 'Untitled PDF';
            }
        }
      }

      // 2. Remove ANY existing entry with this URL (prevents duplicates)
      const filtered = prev.filter((item) => item.url !== url);

      // 3. Create new entry with current timestamp
      const newItem: RecentPDF = { 
        url, 
        name: displayName, 
        timestamp: Date.now() 
      };
      
      // 4. Add to TOP and slice
      const updated = [newItem, ...filtered].slice(0, MAX_RECENT);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return { recents, addRecent };
};