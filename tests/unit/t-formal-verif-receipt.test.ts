import { describe, expect, test } from "bun:test";
import { receiptIdentity, redactReceipt } from "../../scripts/formal-verif/receipt.ts";

describe("formal verification safe receipt", () => {
  test.each(["secret", "credential", "token", "password", "home", "sealed", "rawPayload"])("drops private key %s", (key) => expect(redactReceipt({ [key]: "value", identity: "safe" })).toEqual({ identity: "safe" }));
  test("redacts absolute path value", () => expect(redactReceipt({ path: "/Users/person/private" })).toEqual({ path: "[redacted-path]" }));
  test("recursively drops secrets and redacts paths", () => expect(redactReceipt({ nested: { token: "drop", values: ["safe", "error at /home/me/key", "C:\\Users\\me\\key", "~/key"] } })).toEqual({ nested: { values: ["safe", "[redacted-path]", "[redacted-path]", "[redacted-path]"] } }));
  test("redacts UNC and embedded quoted paths", () => expect(redactReceipt({ values: ["open \\\\server\\share", "file '/tmp/private.json'"] })).toEqual({ values: ["[redacted-path]", "[redacted-path]"] }));
  test("redacts forward-slash Windows and arbitrary embedded POSIX paths", () => expect(redactReceipt({ values: ["open C:/work/private.txt", "failed at /opt/vendor/data.json", "binary=/usr/local/bin/tool"] })).toEqual({ values: ["[redacted-path]", "[redacted-path]", "[redacted-path]"] }));
  test("keeps safe identities", () => expect(redactReceipt({ commandIdentity: "c", transactionIdentity: "t" })).toEqual({ commandIdentity: "c", transactionIdentity: "t" }));
  test("creates deterministic identity", () => expect(receiptIdentity({ state: "ok" }).identity).toBe(receiptIdentity({ state: "ok" }).identity));
  test("binds safe content", () => expect(receiptIdentity({ state: "a" }).identity).not.toBe(receiptIdentity({ state: "b" }).identity));
  test("does not bind dropped secret", () => expect(receiptIdentity({ state: "a", secret: "one" }).identity).toBe(receiptIdentity({ state: "a", secret: "two" }).identity));
  test("returns lowercase sha", () => expect(receiptIdentity({ x: 1 }).identity).toMatch(/^[0-9a-f]{64}$/));
});
