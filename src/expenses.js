function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function addExpense(list, input) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a number greater than zero.");
  }

  if (typeof input.category !== "string" || input.category.trim() === "") {
    throw new Error("Category is required.");
  }

  const date = input.date;
  if (!isValidDate(date)) {
    throw new Error("Date must be a valid calendar date in YYYY-MM-DD format.");
  }

  const note = input.note ?? "";
  if (typeof note !== "string") {
    throw new Error("Note must be text.");
  }

  const expense = {
    amount,
    category: input.category.trim(),
    note,
    date,
  };
  return [...list, expense];
}

export function listExpenses(list, filters = {}) {
  const { category, month } = filters;

  if (month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Month must be in YYYY-MM format.");
  }

  return list.filter((expense) => {
    const matchesCategory =
      category === undefined ||
      expense.category.toLowerCase() === category.toLowerCase();
    const matchesMonth = month === undefined || expense.date.startsWith(month);
    return matchesCategory && matchesMonth;
  });
}
