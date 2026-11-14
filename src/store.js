import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const dataFile = join(projectDirectory, "data", "expenses.json");

export async function load() {
  await mkdir(dirname(dataFile), { recursive: true });

  let contents;
  try {
    contents = await readFile(dataFile, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    await save([]);
    return [];
  }

  const expenses = JSON.parse(contents);
  if (!Array.isArray(expenses)) {
    throw new Error(`${dataFile} must contain a JSON array`);
  }
  return expenses;
}

export async function save(expenses) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(expenses, null, 2)}\n`, "utf8");
}
