import { useState, useEffect, useCallback } from 'react';

/**
 * Fetches a static labels file (labels.json or labels_p.json) used across
 * forms and predictions. Returns { labels, loading, error, reload }.
 */
const useLabels = (path = '/labels.json') => {
  const [labels, setLabels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to fetch ${path}`);
      const data = await response.json();
      setLabels(data);
    } catch (err) {
      console.error(`Error loading ${path}:`, err);
      setError(`Failed to load form options (${path}).`);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { labels, loading, error, reload: load };
};

export default useLabels;
