"use client";

import { useLocale } from "@/context/LocaleContext";

interface AdminPageTitleProps {
  /** Key in adminPages translations */
  keyName: string;
  /** Optional suffix, e.g. ": {name}" */
  suffix?: string;
  className?: string;
}

export default function AdminPageTitle({ keyName, suffix = "", className = "text-2xl font-bold text-stone-800" }: AdminPageTitleProps) {
  const { t } = useLocale();
  return <h1 className={className}>{t(keyName, "adminPages")}{suffix}</h1>;
}
