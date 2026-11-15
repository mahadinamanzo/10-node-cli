#!/usr/bin/env node

import { parseArgs } from "../src/args.js";
import {
  addExpense,
  deleteExpense,
  editExpense,
  findExpenseById,
  listExpenses,
} from "../src/expenses.js";
import { summarizeExpenses } from "../src/report.js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { load, loadSettings, save, saveSettings } from "../src/store.js";
import { readCsvRecords, toCsv } from "../src/csv.js";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});
let colorEnabled = false;

function colorize(text, code) {
  return colorEnabled ? `\u001b[${code}m${text}\u001b[0m` : text;
}

function printHelp() {
  console.log(`Expense Tracker

Usage:
  node bin/expense.js add --amount 2500 --category food --note "lunch" [--date YYYY-MM-DD]
  node bin/expense.js list [--category food] [--month YYYY-MM]
  node bin/expense.js export --format csv --out expenses.csv
  node bin/expense.js import --file bank.csv
  node bin/expense.js edit --id <id> [--amount 3000] [--category food] [--note "updated"] [--date YYYY-MM-DD]
  node bin/expense.js delete --id <id>
  node bin/expense.js summary [--month YYYY-MM]
  node bin/expense.js budget --set 50000
  node bin/expense.js help

Import CSV requires date, amount, and category headers; note is optional.
Append --no-color to any command to disable terminal colors.
Set DEBUG=1 to include stack traces for errors.`);
}

function validateOptions(options, allowed) {
  for (const option of Object.keys(options)) {
    if (!allowed.includes(option)) {
      throw new Error(`Unknown option --${option}.`);
    }
  }
}

function lineLabel(record) {
  return record.line === record.endLine
    ? `line ${record.line}`
    : `lines ${record.line}-${record.endLine}`;
}

function csvHeaderIndexes(fields) {
  const header = fields.map((field) => field.replace(/^\uFEFF/, "").trim().toLowerCase());
  const indexes = {};
  for (const column of ["amount", "category", "date", "note"]) {
    const matches = header.flatMap((name, index) => (name === column ? [index] : []));
    if (matches.length > 1 || (column !== "note" && matches.length === 0)) {
      throw new Error(`CSV header must contain one each of amount, category, and date; note is optional.`);
    }
    if (matches.length === 1) {
      indexes[column] = matches[0];
    }
  }
  return { headerLength: fields.length, indexes };
}

function fieldValue(fields, index) {
  return index === undefined ? "" : fields[index];
}

function friendlyError(error) {
  if (error?.code === "ENOENT") {
    return `Could not find or access "${error.path ?? "the requested file"}".`;
  }
  if (error?.code === "EACCES") {
    return `Permission denied while accessing "${error.path ?? "a file"}".`;
  }
  if (error instanceof SyntaxError) {
    return "Stored JSON data is invalid.";
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function printExpenses(expenses) {
  if (expenses.length === 0) {
    console.log("No expenses found.");
    return;
  }

  console.table(
    expenses.map(({ id, date, category, amount, note }) => ({
      ID: typeof id === "string" ? id.slice(0, 8) : "",
      Date: date,
      Category: category,
      Amount: currency.format(amount),
      Note: note,
    })),
  );
}

function printSummary(summary) {
  console.log(colorize(`Summary${summary.month ? ` for ${summary.month}` : ""}`, "36"));
  console.log(`Total spent: ${colorize(currency.format(summary.total), "1;36")}`);

  if (summary.categories.length === 0) {
    console.log("No expenses found.");
  } else {
    console.log("\nSpending by category:");
    for (const { category, amount, barLength } of summary.categories) {
      console.log(
        `${category.padEnd(16)} ${currency.format(amount).padStart(14)}  ${colorize("█".repeat(barLength), "32")}`,
      );
    }
  }

  if (summary.biggestExpense === null) {
    console.log("\nBiggest single expense: none");
  } else {
    const { biggestExpense } = summary;
    console.log(
      `\nBiggest single expense: ${currency.format(biggestExpense.amount)} (${biggestExpense.category}, ${biggestExpense.date})`,
    );
  }

  if (summary.budgetWarning !== null) {
    const warning = `WARNING: Spending has reached ${summary.budgetWarning} of your ${currency.format(summary.budget)} budget.`;
    console.log(colorize(warning, summary.budgetWarning === "100%" ? "31;1" : "33;1"));
  }
}

async function main() {
  const { command, options: parsedOptions } = parseArgs(process.argv.slice(2));
  const noColor = parsedOptions["no-color"] === true;
  const options = Object.fromEntries(
    Object.entries(parsedOptions).filter(([name]) => name !== "no-color"),
  );
  colorEnabled = Boolean(process.stdout.isTTY && !noColor);

  if (command === "help" || command === undefined) {
    printHelp();
    return;
  }

  if (command === "add") {
    validateOptions(options, ["amount", "category", "note", "date"]);
    const expenses = await load();
    const updatedExpenses = addExpense(expenses, {
      ...options,
      id: randomUUID(),
      date: options.date ?? new Date().toISOString().slice(0, 10),
    });
    const expense = updatedExpenses[updatedExpenses.length - 1];
    await save(updatedExpenses);
    console.log(colorize(
      `Added expense ${expense.id.slice(0, 8)}: ${currency.format(expense.amount)} for ${expense.category}.`,
      "32",
    ));
    return;
  }

  if (command === "list") {
    validateOptions(options, ["category", "month"]);
    const expenses = await load();
    printExpenses(listExpenses(expenses, options));
    return;
  }

  if (command === "delete") {
    validateOptions(options, ["id"]);
    const expenses = await load();
    const expense = findExpenseById(expenses, options.id);
    await save(deleteExpense(expenses, options.id));
    console.log(colorize(`Deleted expense ${expense.id.slice(0, 8)}.`, "32"));
    return;
  }

  if (command === "edit") {
    validateOptions(options, ["id", "amount", "category", "note", "date"]);
    const expenses = await load();
    const { id, ...updates } = options;
    const updatedExpenses = editExpense(expenses, id, updates);
    const expense = findExpenseById(updatedExpenses, id);
    await save(updatedExpenses);
    console.log(colorize(
      `Updated expense ${expense.id.slice(0, 8)}: ${currency.format(expense.amount)} for ${expense.category}.`,
      "32",
    ));
    return;
  }

  if (command === "budget") {
    validateOptions(options, ["set"]);
    const budget = Number(options.set);
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new Error("Budget must be a number greater than zero.");
    }
    const settings = await loadSettings();
    await saveSettings({ ...settings, budget });
    console.log(colorize(`Budget set to ${currency.format(budget)}.`, "32"));
    return;
  }

  if (command === "summary") {
    validateOptions(options, ["month"]);
    const [expenses, settings] = await Promise.all([load(), loadSettings()]);
    printSummary(summarizeExpenses(expenses, { ...options, budget: settings.budget }));
    return;
  }

  if (command === "export") {
    validateOptions(options, ["format", "out"]);
    if (options.format?.toLowerCase() !== "csv" || !options.out) {
      throw new Error('Export requires --format csv and an output path with --out.');
    }
    const expenses = await load();
    await writeFile(options.out, toCsv(expenses), "utf8");
    console.log(colorize(`Exported ${expenses.length} expenses to ${options.out}.`, "32"));
    return;
  }

  if (command === "import") {
    validateOptions(options, ["file"]);
    if (!options.file) {
      throw new Error("Import requires an input path with --file.");
    }

    let columns;
    const imported = [];
    let skipped = 0;
    let sawHeader = false;

    for await (const record of readCsvRecords(options.file)) {
      if (!sawHeader) {
        if (record.error) {
          throw new Error(`Invalid CSV header at ${lineLabel(record)}: ${record.error.message}`);
        }
        if (record.fields.every((field) => field.trim() === "")) {
          continue;
        }
        columns = csvHeaderIndexes(record.fields);
        sawHeader = true;
        continue;
      }

      if (record.error) {
        skipped += 1;
        console.log(colorize(`Skipped ${lineLabel(record)}: ${record.error.message}`, "33"));
        continue;
      }
      if (record.fields.every((field) => field.trim() === "")) {
        continue;
      }
      if (record.fields.length !== columns.headerLength) {
        skipped += 1;
        console.log(colorize(`Skipped ${lineLabel(record)}: wrong number of CSV fields.`, "33"));
        continue;
      }

      try {
        const expense = addExpense([], {
          id: randomUUID(),
          amount: fieldValue(record.fields, columns.indexes.amount),
          category: fieldValue(record.fields, columns.indexes.category),
          date: fieldValue(record.fields, columns.indexes.date),
          note: fieldValue(record.fields, columns.indexes.note),
        })[0];
        imported.push(expense);
      } catch (error) {
        skipped += 1;
        console.log(colorize(`Skipped ${lineLabel(record)}: ${friendlyError(error)}`, "33"));
      }
    }

    if (!sawHeader) {
      throw new Error("CSV file is empty or has no header row.");
    }

    const expenses = await load();
    await save([...expenses, ...imported]);
    console.log(
      colorize(`Imported ${imported.length} expense(s); skipped ${skipped} row(s).`, "32"),
    );
    return;
  }

  throw new Error(`Unknown command: ${command}. Run "node bin/expense.js help" for usage.`);
}

main().catch((error) => {
  console.error(colorize(`Error: ${friendlyError(error)}`, "31"));
  if (process.env.DEBUG === "1" && error instanceof Error) {
    console.error(error.stack);
  }
  process.exitCode = 1;
});
