// U001-registry-issues-field: intents.json の任意フィールド `issues` の契約検証。
// - issues 有無が混在しても registry 全体が読めること（FR-1.1 / FR-1.2、BR-1 / BR-5）
// - issues がある entry は正の整数の重複なし配列であること（BR-2）
// - 遡及補完済みの代表 entry（本 Intent 自身）が Issue #470 を持つこと（FR-1.3）
import { readFileSync } from "node:fs";
import { join } from "node:path";

let failures = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`ok: ${name}`);
  } else {
    failures++;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const registryPath = join(
  import.meta.dir,
  "../../../aidlc/spaces/default/intents/intents.json"
);

type Entry = {
  uuid: string;
  slug: string;
  dirName?: string;
  scope?: string;
  status: string;
  repos?: string[];
  issues?: number[];
};

const raw: unknown = JSON.parse(readFileSync(registryPath, "utf-8"));
ok("registry が配列である", Array.isArray(raw));
const entries = raw as Entry[];

ok("全 entry が uuid / slug / status を持つ", entries.every(
  (e) => typeof e.uuid === "string" && typeof e.slug === "string" && typeof e.status === "string"
));

// issues 契約（BR-1 / BR-2）: 省略可。ある場合は正の整数・重複なしの配列。
for (const e of entries) {
  if (e.issues === undefined) continue;
  ok(
    `${e.slug}: issues が正の整数の配列である`,
    Array.isArray(e.issues) && e.issues.every((n) => Number.isInteger(n) && n > 0),
    JSON.stringify(e.issues)
  );
  ok(
    `${e.slug}: issues に重複がない`,
    new Set(e.issues).size === (e.issues as number[]).length
  );
}

// 混在互換（FR-1.2）: issues を持つ entry と持たない entry の両方が存在してもよい。
// 遡及補完（FR-1.3）は「判別できない entry には付与しない」ため、無い entry の存在は正常。
const withIssues = entries.filter((e) => e.issues !== undefined);
ok("issues を持つ entry が 1 件以上ある（遡及補完済み）", withIssues.length >= 1);

// 代表 entry: 本 Intent 自身は Issue #470 に紐づく（FR-1.3 の検証アンカー）。
const self = entries.find((e) => e.dirName === "260705-github-kanban-sync");
ok("260705-github-kanban-sync entry が存在する", self !== undefined);
ok(
  "260705-github-kanban-sync の issues が [470] を含む",
  Array.isArray(self?.issues) && (self!.issues as number[]).includes(470),
  JSON.stringify(self?.issues)
);

if (failures > 0) {
  console.error(`kanban-registry eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("kanban-registry eval: ok");
