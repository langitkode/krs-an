/**
 * Parser for UGM's copy-pasted TSV course table (see docs/ugm-tsv-import-plan.md).
 *
 * This is the real UGM export shape: a tab-separated table with a header row
 * (`No | Mata Kuliah | SKS | Semester | Prasyarat | Dosen | Jadwal`) where quoted
 * cells span multiple lines. The block parser (ugmBlockParser.ts) handles the
 * older hand-crafted multi-line block format; this one handles the quoted TSV.
 * The importer auto-detects which format was pasted and routes accordingly.
 *
 * Output matches ParsedMasterCourse exactly so it can be handed straight to
 * api.admin.bulkImportMaster with no further mapping.
 */

import type { ParsedMasterCourse } from "./ugmBlockParser";

const SCHEDULE_RE =
  /(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),\s*(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/;

const DAY_MAP: Record<string, string> = {
  senin: "Mon",
  selasa: "Tue",
  rabu: "Wed",
  kamis: "Thu",
  jumat: "Fri",
  sabtu: "Sat",
  minggu: "Sun",
};

/**
 * True when the pasted text looks like the quoted TSV export: a header row
 * starting with "No", or any line that starts with an index then a quoted cell.
 * The block format never quotes its first cell, so this cannot false-positive.
 */
export function isUgmTsvFormat(rawText: string): boolean {
  for (const line of rawText.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith("No\t") || /^\d+\t"/.test(trimmed)) return true;
    return false;
  }
  return false;
}

/**
 * Splits quoted TSV into rows of cells. A `"` toggles quote mode; inside quotes
 * `""` is an escaped quote and `\n`/`\t` are literal cell content. CRLF is
 * handled (the `\r` before a `\n` is dropped).
 */
function tokenizeTsv(rawText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < rawText.length; i++) {
    const ch = rawText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (rawText[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    switch (ch) {
      case '"':
        inQuotes = true;
        break;
      case "\t":
        row.push(cell);
        cell = "";
        break;
      case "\n":
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        break;
      case "\r":
        // Ignore; the following \n closes the row.
        break;
      default:
        cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function extractLecturer(cell: string): string {
  if (!cell.trim()) return "-";
  const matches = [...cell.matchAll(/\d+\.\s*([^\n]+)/g)].map((m) =>
    m[1].trim(),
  );
  return matches.length > 0 ? matches.join(", ") : "-";
}

function extractSchedule(
  cell: string,
): { day: string; start: string; end: string }[] {
  const match = cell.match(SCHEDULE_RE);
  if (!match) return [];
  const day = DAY_MAP[match[1].toLowerCase()] ?? match[1];
  return [{ day, start: match[2], end: match[3] }];
}

export function parseUgmTsvFormat(
  rawText: string,
  prodi: string,
): ParsedMasterCourse[] {
  const rows = tokenizeTsv(rawText);
  const results: ParsedMasterCourse[] = [];

  for (const row of rows) {
    // Header row, or anything too short to be a course row.
    if (row.length < 2 || row[0].trim().toLowerCase() === "no") continue;

    const courseCell = row[1];
    const firstLine = courseCell.split("\n")[0].trim();
    const nameMatch = firstLine.match(/^(\S+)\s{2,}(.+)$/);
    if (!nameMatch) continue;

    const classMatch = courseCell.match(/Kelas:\s*(\S+)/);

    results.push({
      code: nameMatch[1],
      name: nameMatch[2].trim(),
      sks: parseInt(row[2] ?? "0", 10) || 0,
      prodi,
      class: classMatch ? classMatch[1] : "",
      lecturer: extractLecturer(row[5] ?? ""),
      room: "-",
      schedule: extractSchedule(row[6] ?? ""),
    });
  }

  return results;
}
