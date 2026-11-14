#!/usr/bin/env node

import { parseArgs } from "../src/args.js";
import { addExpense, listExpenses } from "../src/expenses.js";
import { load, save } from "../src/store.js";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

function printHelp() {
  console.log(`Expense Tracker

Usage:
  node bin/expense.js add --amount 2500 --category food --note "lunch" [--date YYYY-MM-DD]
  node bin/expense.js list [--category food] [--month YYYY-MM]
  node bin/expense.js help`);
}

function printExpenses(expenses) {
  if (expenses.length === 0) {
    console.log("No expenses found.");
    return;
  }

  console.table(
    expenses.map(({ date, category, amount, note }) => ({
      Date: date,
      Category: category,
      Amount: currency.format(amount),
      Note: note,
    })),
  );
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === "help" || command === undefined) {
    printHelp();
    return;
  }

  if (command === "add") {
    const expenses = await load();
    const updatedExpenses = addExpense(expenses, {
      ...options,
      date: options.date ?? new Date().toISOString().slice(0, 10),
    });
    const expense = updatedExpenses[updatedExpenses.length - 1];
    await save(updatedExpenses);
    console.log(`Added expense: ${currency.format(expense.amount)} for ${expense.category}.`);
    return;
  }

  if (command === "list") {
    const expenses = await load();
    printExpenses(listExpenses(expenses, options));
    return;
  }

  throw new Error(`Unknown command: ${command}. Run "node bin/expense.js help" for usage.`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
