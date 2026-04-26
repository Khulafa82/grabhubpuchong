import { useEffect, useState, useCallback } from "react";
import {
  DEFAULT_HOMEPAGE_CONTENT,
  HomepageContent,
  fetchHomepageContent,
} from "@/lib/homepageContent";

export const useHomepageContent = () => {
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const next = await fetchHomepageContent();
    setContent(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { content, loading, reload, setContent };
};