export function parseArgs(argv) {
  const [command, ...args] = argv;
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--") || token.length === 2) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const name = token.slice(2);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}`);
    }

    if (Object.hasOwn(options, name)) {
      throw new Error(`Option --${name} was provided more than once`);
    }

    options[name] = value;
    index += 1;
  }

  return { command, options };
}
