export function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0 || !data[0]) return "";

  const headers = Object.keys(data[0]!);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = typeof val === "object" ? JSON.stringify(val) : String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}
