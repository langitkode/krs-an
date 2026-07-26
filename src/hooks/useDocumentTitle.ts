import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

const BASE = "KRSan - ";

export function useDocumentTitle(key?: string) {
  const { t } = useLanguage();
  useEffect(() => {
    const prev = document.title;
    document.title = key ? BASE + t(key) : BASE + "Penyusun Jadwal Kuliah";
    return () => {
      document.title = prev;
    };
  }, [key, t]);
}
