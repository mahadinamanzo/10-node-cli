# Expense Tracker CLI

A dependency-free expense tracker for Node.js 20 or newer. It stores expenses in
`data/expenses.json` and the configured budget in `data/settings.json`.

## Setup

```bash
npm test
```

No npm packages need to be installed.

## Usage

Run commands from this project directory with `node bin/expense.js`, or follow
the [npm link](#run-expense-from-any-folder) instructions to use `expense`.

### Add an expense

```bash
node bin/expense.js add --amount 2500 --category food --note "lunch"
node bin/expense.js add --amount 1800 --category transport --note "bus fare" --date 2026-11-03
```

`--date` is optional and defaults to today's UTC date. The CLI generates a UUID
for each expense and displays its first eight characters as the ID.

### List expenses

```bash
node bin/expense.js list
node bin/expense.js list --category food
node bin/expense.js list --month 2026-11
node bin/expense.js list --category food --month 2026-11
```

### Edit an expense

Use the eight-character ID printed by `add` or `list`. Supply one or more
fields to change:

```bash
node bin/expense.js edit --id 12345678 --amount 3000
node bin/expense.js edit --id 12345678 --category groceries --note "weekly shop"
```

Available fields are `--amount`, `--category`, `--note`, and `--date`.

### Delete an expense

```bash
node bin/expense.js delete --id 12345678
```

### Show a summary

```bash
node bin/expense.js summary
node bin/expense.js summary --month 2026-11
```

The summary shows total spending, totals by category with a scaled text bar
chart, and the largest single expense. A configured budget warning is based on
the expenses in the selected summary (all expenses when `--month` is omitted).

### Set a budget

```bash
node bin/expense.js budget --set 50000
```

The summary warns at 80% and 100% of the configured budget.

### Export expenses to CSV

```bash
node bin/expense.js export --format csv --out expenses.csv
```

The CSV includes `id`, `amount`, `category`, `note`, and `date` columns and
quotes commas, quotes, and embedded newlines correctly.

### Import a bank CSV

```bash
node bin/expense.js import --file sample-bank.csv
```

The input must have a header row containing `date`, `amount`, and `category`;
`note` is optional. Header order does not matter. Invalid rows are skipped and
reported with their line numbers. New UUIDs are generated for imported rows.
The included [sample-bank.csv](./sample-bank.csv) is a ready-to-run example.

### Help and output options

```bash
node bin/expense.js help
node bin/expense.js summary --no-color
```

ANSI colors are enabled only when stdout is a terminal. Append `--no-color` to
disable them. Set `DEBUG=1` to include stack traces with errors.

## Run `expense` from any folder

The `bin` entry in `package.json` maps the command name `expense` to
`bin/expense.js`. The script's `#!/usr/bin/env node` shebang tells supported
systems to execute it with Node.js. From this project directory, run:

```bash
npm link
expense help
```

`npm link` creates a global symlink to this local package and the executable
shim for its `bin` command; it does not install dependencies or publish the
project. On Windows, npm creates a command shim such as `expense.cmd`. To
remove the global link later, run:

```bash
npm unlink --global node-cli-expense-tracker
```

## Tests

Tests use Node.js's built-in `node:test` runner and `node:assert/strict`:

```bash
npm test
```
