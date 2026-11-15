import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const columns = ["id", "amount", "category", "note", "date"];

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(expenses) {
  const rows = [
    columns,
    ...expenses.map((expense) => columns.map((column) => expense[column] ?? "")),
  ];
  return `${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

function parseCsvRecord(record) {
  const fields = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;

  for (let index = 0; index < record.length; index += 1) {
    const character = record[index];

    if (inQuotes) {
      if (character === '"') {
        if (record[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (afterQuote) {
      if (character !== ",") {
        throw new Error("Unexpected character after a quoted CSV field.");
      }
      fields.push(field);
      field = "";
      afterQuote = false;
      continue;
    }

    if (character === ",") {
      fields.push(field);
      field = "";
    } else if (character === '"') {
      if (field !== "") {
        throw new Error("A quote may only appear at the start of a CSV field.");
      }
      inQuotes = true;
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new Error("Unterminated quoted CSV field.");
  }
  fields.push(field);
  return fields;
}

function updateQuoteState(line, inQuotes) {
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] !== '"') {
      continue;
    }
    if (inQuotes && line[index + 1] === '"') {
      index += 1;
    } else {
      inQuotes = !inQuotes;
    }
  }
  return inQuotes;
}

export async function* readCsvRecords(filePath) {
  const input = createReadStream(filePath, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  let record = "";
  let startLine = 0;
  let lineNumber = 0;
  let inQuotes = false;

  for await (const line of lines) {
    lineNumber += 1;
    if (record === "") {
      startLine = lineNumber;
    } else {
      record += "\n";
    }
    record += line;
    inQuotes = updateQuoteState(line, inQuotes);

    if (!inQuotes) {
      try {
        yield { line: startLine, endLine: lineNumber, fields: parseCsvRecord(record) };
      } catch (error) {
        yield { line: startLine, endLine: lineNumber, error };
      }
      record = "";
    }
  }

  if (record !== "" || inQuotes) {
    yield {
      line: startLine,
      endLine: lineNumber,
      error: new Error("Unterminated quoted CSV field."),
    };
  }
}
