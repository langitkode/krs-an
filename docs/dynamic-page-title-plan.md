# Dynamic Page Title Plan

## Problem
SPA — browser tab always shows "KRSan - Penyusun Jadwal Kuliah Otomatis & Rencana Studi" regardless of which view user is on. Poor UX for multi-tab users, no context in tab title.

## Approach
Custom `useDocumentTitle` hook. No extra dependency — `react-helmet-async` is overkill for just `<title>`. The hook is a `useEffect` that sets `document.title` and restores on unmount.

OG/Twitter meta tags stay static (they describe the app, not the current step). Only `<title>` changes.

## Changes

### 1. New file: `src/hooks/useDocumentTitle.ts`
Custom hook:
```ts
import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

const BASE = "KRSan - ";

export function useDocumentTitle(key?: string) {
  const { t } = useLanguage();
  useEffect(() => {
    const prev = document.title;
    document.title = key ? BASE + t(key) : BASE + "Penyusun Jadwal Kuliah";
    return () => { document.title = prev; };
  }, [key, t]);
}
```

### 2. New i18n keys in `LanguageContext.tsx`
Add to `translations` record:

```
"page.title.config": "Konfigurasi"
"page.title.select": "Pilih Mata Kuliah"
"page.title.view": "Lihat Jadwal"
"page.title.archive": "Arsip Rencana Studi"
"page.title.admin": "Dashboard Admin"
"page.title.share": "Jadwal Dibagikan"
"page.title.privacy": "Kebijakan Privasi"
"page.title.terms": "Syarat & Ketentuan"
```

### 3. Call `useDocumentTitle` in each view

| File | Component | Key |
|------|-----------|-----|
| `src/components/maker/ScheduleConfig.tsx` | `ScheduleConfig` | `"page.title.config"` |
| `src/components/maker/ScheduleSelector.tsx` | `ScheduleSelector` | `"page.title.select"` |
| `src/components/maker/ScheduleViewer.tsx` | `ScheduleViewer` | `"page.title.view"` |
| `src/components/maker/ScheduleArchive.tsx` | `ScheduleArchive` | `"page.title.archive"` |
| `src/components/AdminDashboard.tsx` | `AdminDashboard` | `"page.title.admin"` |
| `src/components/SharePage.tsx` | `SharePage` | `"page.title.share"` |
| `src/components/PrivacyPage.tsx` | `PrivacyPage` | `"page.title.privacy"` |
| `src/components/TermsPage.tsx` | `TermsPage` | `"page.title.terms"` |

### 4. Files touched
- `src/hooks/useDocumentTitle.ts` — new
- `src/context/LanguageContext.tsx` — add 8 keys
- 8 component files — add one line each

## Not in scope
- OG/Twitter meta tags (static is fine for SPA tool)
- `react-helmet-async` (not needed for just `<title>`)
