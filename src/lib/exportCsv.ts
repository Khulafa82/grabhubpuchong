const escape = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const toCsv = (rows: Array<Record<string, unknown>>, headers?: string[]): string => {
  if (rows.length === 0 && !headers) return "";
  const cols = headers ?? Object.keys(rows[0] ?? {});
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => escape(r[c])).join(","));
  return lines.join("\n");
};

export interface CsvSection {
  title: string;
  headers?: string[];
  rows: Array<Record<string, unknown>>;
}

export const buildSectionedCsv = (sections: CsvSection[]): string => {
  const parts: string[] = [];
  for (const s of sections) {
    parts.push(`# ${s.title}`);
    if (s.rows.length === 0) {
      parts.push("(no data)");
    } else {
      parts.push(toCsv(s.rows, s.headers));
    }
    parts.push("");
  }
  return parts.join("\n");
};

export const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const todayStamp = () => new Date().toISOString().slice(0, 10);