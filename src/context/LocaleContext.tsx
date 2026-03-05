"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { translations, Lang, pickLang } from "@/lib/translations";

const COOKIE_NAME = "lang";

function getCookieLang(): Lang {
  if (typeof document === "undefined") return "th";
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  const val = match ? decodeURIComponent(match[1]) : "";
  return val === "en" ? "en" : "th";
}

function setCookieLang(lang: Lang) {
  document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

type TFunc = (key: string, section?: string) => string;

interface LocaleContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  /** Translate a UI label from the dictionary, e.g. t('home', 'nav') */
  t: TFunc;
  /** Pick between a TH value and EN value based on current lang */
  pick: (th: string | null | undefined, en: string | null | undefined) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children, initialLang = "th" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    const cookieLang = getCookieLang();
    setLangState(cookieLang);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setCookieLang(l);
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "th" ? "en" : "th");
  }, [lang, setLang]);

  const t: TFunc = useCallback((key: string, section = "common") => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sec = (translations as any)[section];
    if (!sec) return key;
    const entry = sec[key];
    if (!entry) return key;
    return entry[lang] ?? entry["th"] ?? key;
  }, [lang]);

  const pick = useCallback((th: string | null | undefined, en: string | null | undefined) => {
    return pickLang(th, en, lang);
  }, [lang]);

  return (
    <LocaleContext.Provider value={{ lang, setLang, toggle, t, pick }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
