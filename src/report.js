import { listExpenses } from "./expenses.js";

export function summarizeExpenses(expenses, { month, budget } = {}) {
  const filteredExpenses = listExpenses(expenses, { month });
  const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = new Map();

  for (const expense of filteredExpenses) {
    const key = expense.category.toLowerCase();
    const current = categoryTotals.get(key);
    categoryTotals.set(key, {
      category: current?.category ?? expense.category,
      amount: (current?.amount ?? 0) + expense.amount,
    });
  }

  const sortedCategories = [...categoryTotals.values()]
    .sort((left, right) => right.amount - left.amount || left.category.localeCompare(right.category));
  const largestCategoryAmount = sortedCategories[0]?.amount ?? 0;
  const categories = sortedCategories.map((category) => ({
    ...category,
    barLength: Math.max(1, Math.round((category.amount / largestCategoryAmount) * 30)),
  }));
  const biggestExpense = filteredExpenses.reduce(
    (biggest, expense) => (biggest === null || expense.amount > biggest.amount ? expense : biggest),
    null,
  );

  let budgetWarning = null;
  if (budget !== undefined) {
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new Error("Budget must be a number greater than zero.");
    }
    if (total >= budget) {
      budgetWarning = "100%";
    } else if (total >= budget * 0.8) {
      budgetWarning = "80%";
    }
  }

  return { month, total, categories, biggestExpense, budget, budgetWarning };
}
