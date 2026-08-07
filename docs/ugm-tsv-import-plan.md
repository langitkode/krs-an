# UGM quoted-TSV import (auto-detect alongside block format)

## Why this exists

`docs/ugm-format-import.md` covers the **multi-line block** format (`parseUgmBlockFormat`),
built from a hand-crafted sample. The real UGM export (`_temp/ugm-format-7-aug-2026.txt`) is
structurally different: it is a **quoted TSV** table with a header row, where quoted cells span
multiple lines. The block parser's line-based regexes silently mangle it (embedded newlines
split fields, `"` leaks into `code`/`class`). It needs a proper quoted-TSV tokenizer, not more
regexes.

The two formats coexist. The importer **auto-detects** which one was pasted and routes to the
right parser. The block parser stays untouched for anyone still pasting the old shape.

## Format reference (quoted TSV)

Header: `No | Mata Kuliah | SKS | Semester | Prasyarat | Dosen | Jadwal` (tab-separated).

```
No	Mata Kuliah	SKS	Semester	Prasyarat	Dosen	Jadwal
1	"TKKF262101  Aljabar
 Kelas: A"	3	1		"1. Dr.-Ing. Yohan Fajar Sidik, S.T., M.Eng.
2. Dr. Rian Fatah Mochamad, S.T., M.Eng."	Senin, 07:00-09:30
```

Variations seen in the real sample:

- **Dosen unquoted, single line** (`row 5`): `2. Dr. Hifni Mukhtar Ariyadi, S.T., M.Sc.` with
  no surrounding quotes.
- **No Dosen, no Jadwal** (`row 128`, Kerja Praktik): `2	5	#SKS>=80` is the last column.
- **Only 3 columns** (`row 154`, Publikasi Ilmiah): `2	8` after the course cell, no
  Prasyarat/Dosen/Jadwal at all.
- **Prasyarat present** (`row 134`): `#SKS>106` sits between Semester and Dosen.
- **Lecturers numbered with a stray leading `2.`** (`row 5`): numbering does not restart per
  cell; strip any `N. ` prefix regardless.

## Column mapping

| col | header | use |
|-----|--------|-----|
| 0 | No | ignore |
| 1 | Mata Kuliah | code + name (first line, `^(\S+)\s{2,}(.+)$`), class via `Kelas:\s*(\S+)` |
| 2 | SKS | sks |
| 3 | Semester | ignore (no field in `master_courses`) |
| 4 | Prasyarat | ignore |
| 5 | Dosen | `/\d+\.\s*([^\n]+)/g` -> lecturers joined `", "`, `"-"` if empty |
| 6 | Jadwal | existing `SCHEDULE_RE` + `DAY_MAP`, `[]` if empty |

## Parser

New `src/lib/parsers/ugmTsvParser.ts`, exporting `parseUgmTsvFormat(rawText, prodi)` and
`isUgmTsvFormat(rawText)`. Pure functions, no React/Convex imports.

- `tokenizeTsv(raw)` - character state machine: `"` toggles quote mode, `""` escapes a quote,
  embedded `\n`/`\t` inside quotes are preserved verbatim, CRLF handled. Returns `string[][]`.
- `parseUgmTsvFormat`:
  - skip header row (cell 0 is `No`), skip rows with < 2 cells
  - col 1: first line -> code/name; `Kelas:` anywhere -> class
  - col 2 -> `parseInt` sks
  - col 5 -> numbered lecturers, strip `N. `, join `", "`, `"-"` if none
  - col 6 -> schedule via the same day-name regex + map the block parser uses (comma after
    day name; parallel implementation, not shared - see existing doc)
  - col 0/3/4 dropped
- `isUgmTsvFormat(rawText)` - true if the first non-empty line starts with `No` (header) or
  any line matches `^\d+\t"` (quoted first cell). Block format never has a quoted first cell.

`ParsedMasterCourse` shape matches the block parser's exactly, so output feeds
`api.admin.bulkImportMaster` unchanged.

## Dialog

`src/components/admin/dialogs/UgmFormatImportDialog.tsx`:

- `handleImport` calls `isUgmTsvFormat(rawText)`; TSV -> `parseUgmTsvFormat`, otherwise ->
  `parseUgmBlockFormat` (existing path).
- `TEMPLATE` becomes the real TSV sample (header + 1 quoted row) so "Copy Example" teaches the
  actual export shape.
- Dialog copy updated to describe tab-separated quoted export; note Prasyarat/No ignored.

## What this does NOT do

- No changes to `bulkImportMaster` or `master_courses` schema.
- No changes to `ugmBlockParser.ts` or its behavior - auto-detect routes, never rewrites.
- No semester/prasyarat ingestion - the schema has no home for them and nothing asks for them.
