import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const dataDirectory = join(projectDirectory, "data");
const dataFile = join(dataDirectory, "expenses.json");
const settingsFile = join(dataDirectory, "settings.json");

async function loadJsonFile(file, initialValue) {
  await mkdir(dataDirectory, { recursive: true });

  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await writeFile(file, `${JSON.stringify(initialValue, null, 2)}\n`, "utf8");
    return initialValue;
  }
}

export async function load() {
  const expenses = await loadJsonFile(dataFile, []);
  if (!Array.isArray(expenses)) {
    throw new Error(`${dataFile} must contain a JSON array`);
  }
  return expenses;
}

export async function save(expenses) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(expenses, null, 2)}\n`, "utf8");
}

export async function loadSettings() {
  const settings = await loadJsonFile(settingsFile, {});
  if (
    settings === null ||
    typeof settings !== "object" ||
    Array.isArray(settings) ||
    (settings.budget !== undefined &&
      (!Number.isFinite(settings.budget) || settings.budget <= 0))
  ) {
    throw new Error(`${settingsFile} must contain an object with a positive numeric budget`);
  }
  return settings;
}

export async function saveSettings(settings) {
  await mkdir(dirname(settingsFile), { recursive: true });
  await writeFile(settingsFile, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}
