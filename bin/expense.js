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
import { load, loadSettings, save, saveSettings } from "../src/store.js";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

function printHelp() {
  console.log(`Expense Tracker

Usage:
  node bin/expense.js add --amount 2500 --category food --note "lunch" [--date YYYY-MM-DD]
  node bin/expense.js list [--category food] [--month YYYY-MM]
  node bin/expense.js edit --id <id> [--amount 3000] [--category food] [--note "updated"] [--date YYYY-MM-DD]
  node bin/expense.js delete --id <id>
  node bin/expense.js summary [--month YYYY-MM]
  node bin/expense.js budget --set 50000
  node bin/expense.js help`);
}

function validateOptions(options, allowed) {
  for (const option of Object.keys(options)) {
    if (!allowed.includes(option)) {
      throw new Error(`Unknown option --${option}.`);
    }
  }
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
  console.log(`Summary${summary.month ? ` for ${summary.month}` : ""}`);
  console.log(`Total spent: ${currency.format(summary.total)}`);

  if (summary.categories.length === 0) {
    console.log("No expenses found.");
  } else {
    console.log("\nSpending by category:");
    for (const { category, amount, barLength } of summary.categories) {
      console.log(`${category.padEnd(16)} ${currency.format(amount).padStart(14)}  ${"█".repeat(barLength)}`);
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
    console.log(
      `WARNING: Spending has reached ${summary.budgetWarning} of your ${currency.format(summary.budget)} budget.`,
    );
  }
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

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
    console.log(
      `Added expense ${expense.id.slice(0, 8)}: ${currency.format(expense.amount)} for ${expense.category}.`,
    );
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
    console.log(`Deleted expense ${expense.id.slice(0, 8)}.`);
    return;
  }

  if (command === "edit") {
    validateOptions(options, ["id", "amount", "category", "note", "date"]);
    const expenses = await load();
    const { id, ...updates } = options;
    const updatedExpenses = editExpense(expenses, id, updates);
    const expense = findExpenseById(updatedExpenses, id);
    await save(updatedExpenses);
    console.log(
      `Updated expense ${expense.id.slice(0, 8)}: ${currency.format(expense.amount)} for ${expense.category}.`,
    );
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
    console.log(`Budget set to ${currency.format(budget)}.`);
    return;
  }

  if (command === "summary") {
    validateOptions(options, ["month"]);
    const [expenses, settings] = await Promise.all([load(), loadSettings()]);
    printSummary(summarizeExpenses(expenses, { ...options, budget: settings.budget }));
    return;
  }

  throw new Error(`Unknown command: ${command}. Run "node bin/expense.js help" for usage.`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
