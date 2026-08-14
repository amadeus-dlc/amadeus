export function requireFlagValue(
  argv: string[],
  index: number,
  flag: string,
  fail: (message: string) => never,
): string {
  if (index >= argv.length) fail(`${flag} expects a value, got end of arguments.`);
  const value = argv[index];
  if (value.startsWith("--")) fail(`${flag} expects a value, got another flag: "${value}".`);
  return value;
}
