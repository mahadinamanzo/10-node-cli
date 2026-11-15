function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validateExpense(expense) {
  const amount = Number(expense.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a number greater than zero.");
  }

  if (typeof expense.category !== "string" || expense.category.trim() === "") {
    throw new Error("Category is required.");
  }

  if (!isValidDate(expense.date)) {
    throw new Error("Date must be a valid calendar date in YYYY-MM-DD format.");
  }

  const note = expense.note ?? "";
  if (typeof note !== "string") {
    throw new Error("Note must be text.");
  }

  return {
    ...expense,
    amount,
    category: expense.category.trim(),
    note,
  };
}

function findExpenseIndex(list, id) {
  if (typeof id !== "string" || id.length < 8 || id.length > 36) {
    throw new Error("Expense ID must be at least 8 characters.");
  }

  const matches = [];
  list.forEach((expense, index) => {
    if (typeof expense.id === "string" && expense.id.toLowerCase().startsWith(id.toLowerCase())) {
      matches.push(index);
    }
  });

  if (matches.length === 0) {
    throw new Error(`No expense found for ID "${id}".`);
  }
  if (matches.length > 1) {
    throw new Error(`ID "${id}" is ambiguous; use a longer ID.`);
  }
  return matches[0];
}

export function addExpense(list, input) {
  if (typeof input.id !== "string" || input.id.trim() === "") {
    throw new Error("Expense ID is required.");
  }

  if (list.some((expense) => expense.id === input.id)) {
    throw new Error(`Expense ID "${input.id}" already exists.`);
  }

  return [...list, validateExpense(input)];
}

export function editExpense(list, id, updates) {
  const index = findExpenseIndex(list, id);
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    throw new Error("Provide at least one field to edit.");
  }

  const updatedExpense = validateExpense({ ...list[index], ...updates, id: list[index].id });
  return list.map((expense, currentIndex) =>
    currentIndex === index ? updatedExpense : expense,
  );
}

export function deleteExpense(list, id) {
  const index = findExpenseIndex(list, id);
  return list.filter((_, currentIndex) => currentIndex !== index);
}

export function findExpenseById(list, id) {
  return list[findExpenseIndex(list, id)];
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
