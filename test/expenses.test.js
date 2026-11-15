import assert from "node:assert/strict";
import { describe, it, test } from "node:test";
import { parseArgs } from "../src/args.js";
import { addExpense, listExpenses } from "../src/expenses.js";
import { summarizeExpenses } from "../src/report.js";
import { toCsv } from "../src/csv.js";

const makeExpense = (overrides = {}) => ({
  id: "12345678-1234-4234-8234-123456789abc",
  amount: 1000,
  category: "food",
  note: "lunch",
  date: "2026-11-03",
  ...overrides,
});

describe("parseArgs", () => {
  it("parses a command and valued options", () => {
    assert.deepEqual(
      parseArgs(["add", "--amount", "2500", "--category", "food", "--note", "lunch"]),
      {
        command: "add",
        options: { amount: "2500", category: "food", note: "lunch" },
      },
    );
  });

  it("parses --no-color as a boolean flag", () => {
    assert.deepEqual(parseArgs(["list", "--no-color"]), {
      command: "list",
      options: { "no-color": true },
    });
  });

  it("rejects an option without a value", () => {
    assert.throws(() => parseArgs(["add", "--amount"]), /Missing value for --amount/);
  });

  it("rejects duplicate options", () => {
    assert.throws(
      () => parseArgs(["add", "--amount", "10", "--amount", "20"]),
      /provided more than once/,
    );
  });

  it("rejects positional arguments after the command", () => {
    assert.throws(() => parseArgs(["list", "extra"]), /Unexpected argument/);
  });
});

describe("addExpense", () => {
  it("returns a new list with a normalized expense", () => {
    const original = [];
    const updated = addExpense(original, {
      id: makeExpense().id,
      amount: "2500",
      category: " food ",
      date: "2026-11-03",
    });

    assert.equal(original.length, 0);
    assert.equal(updated.length, 1);
    assert.deepEqual(updated[0], { ...makeExpense(), amount: 2500, note: "" });
  });

  it("rejects an amount of zero", () => {
    assert.throws(
      () => addExpense([], { ...makeExpense(), amount: 0 }),
      /greater than zero/,
    );
  });

  it("rejects a non-numeric amount", () => {
    assert.throws(
      () => addExpense([], { ...makeExpense(), amount: "not-money" }),
      /greater than zero/,
    );
  });

  it("rejects an empty category", () => {
    assert.throws(
      () => addExpense([], { ...makeExpense(), category: "  " }),
      /Category is required/,
    );
  });

  it("rejects an impossible calendar date", () => {
    assert.throws(
      () => addExpense([], { ...makeExpense(), date: "2026-02-30" }),
      /valid calendar date/,
    );
  });

  it("rejects a non-text note", () => {
    assert.throws(
      () => addExpense([], { ...makeExpense(), note: 123 }),
      /Note must be text/,
    );
  });
});

describe("listExpenses", () => {
  const expenses = [
    makeExpense({ amount: 1000, category: "Food", date: "2026-11-03" }),
    makeExpense({ id: "abcdefgh-1234-4234-8234-123456789abc", amount: 2000, category: "travel", date: "2026-10-12" }),
    makeExpense({ id: "87654321-1234-4234-8234-123456789abc", amount: 3000, category: "food", date: "2026-11-20" }),
  ];

  it("filters categories without case sensitivity", () => {
    assert.equal(listExpenses(expenses, { category: "FOOD" }).length, 2);
  });

  it("filters expenses by month", () => {
    assert.equal(listExpenses(expenses, { month: "2026-11" }).length, 2);
  });

  it("combines category and month filters", () => {
    assert.equal(
      listExpenses(expenses, { category: "food", month: "2026-11" }).length,
      2,
    );
  });

  it("rejects an invalid month filter", () => {
    assert.throws(() => listExpenses(expenses, { month: "2026-13" }), /YYYY-MM/);
  });
});

describe("summarizeExpenses", () => {
  const expenses = [
    makeExpense({ amount: 2500, category: "food", date: "2026-11-03" }),
    makeExpense({ id: "abcdefgh-1234-4234-8234-123456789abc", amount: 500, category: "Food", date: "2026-11-04" }),
    makeExpense({ id: "87654321-1234-4234-8234-123456789abc", amount: 1200, category: "transport", date: "2026-10-01" }),
  ];

  it("calculates filtered total, case-insensitive category totals, and biggest expense", () => {
    const summary = summarizeExpenses(expenses, { month: "2026-11" });
    assert.equal(summary.total, 3000);
    assert.deepEqual(summary.categories.map(({ category, amount }) => ({ category, amount })), [
      { category: "food", amount: 3000 },
    ]);
    assert.equal(summary.biggestExpense.amount, 2500);
  });

  it("scales category bars against the largest category", () => {
    const summary = summarizeExpenses(expenses);
    assert.deepEqual(
      summary.categories.map(({ category, barLength }) => ({ category, barLength })),
      [
        { category: "food", barLength: 30 },
        { category: "transport", barLength: 12 },
      ],
    );
  });

  it("warns at the 80 percent budget threshold", () => {
    const summary = summarizeExpenses(expenses, { month: "2026-11", budget: 3750 });
    assert.equal(summary.budgetWarning, "80%");
  });

  it("warns at the 100 percent budget threshold", () => {
    const summary = summarizeExpenses(expenses, { month: "2026-11", budget: 3000 });
    assert.equal(summary.budgetWarning, "100%");
  });

  it("returns an empty summary for an empty list", () => {
    const summary = summarizeExpenses([]);
    assert.equal(summary.total, 0);
    assert.deepEqual(summary.categories, []);
    assert.equal(summary.biggestExpense, null);
  });
});

describe("toCsv", () => {
  it("quotes fields containing commas", () => {
    const csv = toCsv([makeExpense({ category: "food, home" })]);
    assert.match(csv, /"food, home"/);
  });

  it("escapes quotes by doubling them", () => {
    const csv = toCsv([makeExpense({ note: 'said "thanks"' })]);
    assert.match(csv, /"said ""thanks"""/);
  });

  it("quotes and preserves embedded newlines", () => {
    const csv = toCsv([makeExpense({ note: "first line\nsecond line" })]);
    assert.match(csv, /"first line\nsecond line"/);
  });

  it("writes the header for an empty expense list", () => {
    assert.equal(toCsv([]), "id,amount,category,note,date\r\n");
  });
});

test("toCsv does not mutate the expenses it serializes", () => {
  const expense = makeExpense();
  const expenses = [expense];
  const original = { ...expense };

  toCsv(expenses);

  assert.deepEqual(expenses, [original]);
});
