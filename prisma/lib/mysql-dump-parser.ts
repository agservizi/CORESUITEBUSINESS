export type SqlRow = (string | number | null)[];

function unescapeSqlString(value: string) {
  return value.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
}

export function parseSqlTuple(tuple: string): SqlRow {
  const row: SqlRow = [];
  let i = 0;
  const s = tuple.trim();
  if (!s.startsWith("(") || !s.endsWith(")")) {
    throw new Error(`Invalid SQL tuple: ${tuple.slice(0, 80)}`);
  }
  i = 1;

  while (i < s.length - 1) {
    while (s[i] === " " || s[i] === ",") i++;
    if (i >= s.length - 1) break;

    if (s.slice(i, i + 4).toUpperCase() === "NULL") {
      row.push(null);
      i += 4;
      continue;
    }

    if (s[i] === "'") {
      i++;
      let buf = "";
      while (i < s.length) {
        if (s[i] === "\\" && i + 1 < s.length) {
          buf += s[i + 1];
          i += 2;
          continue;
        }
        if (s[i] === "'") {
          i++;
          break;
        }
        buf += s[i];
        i++;
      }
      row.push(unescapeSqlString(buf));
      continue;
    }

    let num = "";
    while (i < s.length - 1 && s[i] !== ",") {
      num += s[i];
      i++;
    }
    const trimmed = num.trim();
    if (trimmed.includes(".")) {
      row.push(Number(trimmed));
    } else {
      row.push(Number.parseInt(trimmed, 10));
    }
  }

  return row;
}

export function extractInsertTuples(sql: string, tableName: string): SqlRow[] {
  const pattern = new RegExp(
    `INSERT INTO \`${tableName}\` \\([^)]+\\) VALUES\\s*([\\s\\S]*?);`,
    "gi"
  );
  const rows: SqlRow[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(sql)) !== null) {
    const block = match[1];
    const tupleRegex = /\([^()]*(?:\([^()]*\)[^()]*)*\)/g;
    let tupleMatch: RegExpExecArray | null;
    while ((tupleMatch = tupleRegex.exec(block)) !== null) {
      try {
        rows.push(parseSqlTuple(tupleMatch[0]));
      } catch {
        // skip malformed tuples
      }
    }
  }

  return rows;
}

export function extractInsertColumns(sql: string, tableName: string): string[] {
  const pattern = new RegExp(
    `INSERT INTO \`${tableName}\` \\(([^)]+)\\) VALUES`,
    "i"
  );
  const match = pattern.exec(sql);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((c) => c.trim().replace(/`/g, ""));
}

export function rowsToObjects(sql: string, tableName: string): Record<string, SqlRow[number]>[] {
  const columns = extractInsertColumns(sql, tableName);
  const tuples = extractInsertTuples(sql, tableName);
  return tuples.map((tuple) => {
    const obj: Record<string, SqlRow[number]> = {};
    columns.forEach((col, idx) => {
      obj[col] = tuple[idx] ?? null;
    });
    return obj;
  });
}
