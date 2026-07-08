import { createInterface } from "node:readline/promises";

// US-A2: the wizard's only I/O boundary. Kept minimal (select/input/confirm)
// so runWizard has no direct dependency on stdin/stdout — tests inject a fake.
export type TtyIO = {
  readonly isTTY: boolean;
  select(prompt: string, options: readonly string[]): Promise<string>;
  input(prompt: string, defaultValue: string): Promise<string>;
  confirm(prompt: string): Promise<boolean>;
};

export function createTtyIO(): TtyIO {
  return Object.freeze({
    isTTY: process.stdin.isTTY === true,

    async select(prompt: string, options: readonly string[]): Promise<string> {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        const menu = options.map((option, index) => `  ${index + 1}) ${option}`).join("\n");
        for (;;) {
          const answer = (await rl.question(`${prompt}\n${menu}\nEnter a number: `)).trim();
          const index = Number.parseInt(answer, 10) - 1;
          if (Number.isInteger(index) && index >= 0 && index < options.length) {
            return options[index] as string;
          }
        }
      } finally {
        rl.close();
      }
    },

    async input(prompt: string, defaultValue: string): Promise<string> {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        const answer = (await rl.question(`${prompt} [${defaultValue}]: `)).trim();
        return answer.length === 0 ? defaultValue : answer;
      } finally {
        rl.close();
      }
    },

    // BR-I18: default is "N" (safe side) — anything other than y/yes aborts.
    async confirm(prompt: string): Promise<boolean> {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        const answer = (await rl.question(`${prompt} [y/N]: `)).trim().toLowerCase();
        return answer === "y" || answer === "yes";
      } finally {
        rl.close();
      }
    },
  });
}
