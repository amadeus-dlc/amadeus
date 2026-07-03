import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { skillContracts } from "../amadeus-contracts/catalog";

const root = resolve(import.meta.dir, "..");

type GeneratedFile = {
  path: string;
  content: string;
};

export function generatedContractFiles(): GeneratedFile[] {
  const skillsJson = stableJson({
    skillContracts,
  });
  const references = [
    "# Amadeus DLC Contract Catalog Reference",
    "",
    "この文書は `amadeus-contracts/catalog/**` から生成する。",
    "直接編集せず、Catalog を更新してから `npm run contracts:generate` を実行する。",
    "",
    "旧契約（schemaVersion 1）の Artifact / Stage / Functional Design / Task Generation 契約は #381 で退役した。",
    "現在の lifecycle 契約は `docs/amadeus/lifecycle/` を参照する。",
    "",
    "## Skill Contracts",
    "",
    ...skillContracts.flatMap((contract) => [
      `### ${contract.skillId}`,
      "",
      `- reference: \`${contract.generatedReferencePaths[0]}\``,
      "",
    ]),
  ].join("\n");

  return [
    { path: "amadeus-contracts/generated/skills.json", content: skillsJson },
    { path: "amadeus-contracts/generated/references.md", content: references },
    ...skillContracts.flatMap((contract) =>
      contract.generatedReferencePaths.map((path) => ({
        path,
        content: renderSkillContractReference(contract),
      })),
    ),
  ];
}

export function writeGeneratedContractFiles(baseRoot = root): void {
  for (const file of generatedContractFiles()) {
    const target = join(baseRoot, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
}

export function staleGeneratedContractFiles(baseRoot = root): string[] {
  const stale: string[] = [];
  for (const file of generatedContractFiles()) {
    const target = join(baseRoot, file.path);
    let current = "";
    try {
      current = readFileSync(target, "utf8");
    } catch {
      stale.push(file.path);
      continue;
    }
    if (current !== file.content) stale.push(file.path);
  }
  return stale;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

function renderSkillContractReference(contract: (typeof skillContracts)[number]): string {
  return [
    `# Skill Contract: ${contract.skillName}`,
    "",
    "この文書は `amadeus-contracts/catalog/**` から生成する。",
    "直接編集せず、Catalog を更新してから `npm run contracts:generate` を実行する。",
    "",
    "## Source Paths",
    "",
    ...contract.sourcePaths.map((path) => `- \`${path}\``),
    "",
    "## Prerequisites",
    "",
    ...renderConditions(contract.prerequisites),
    "",
    "## Invariants",
    "",
    ...renderConditions(contract.invariants),
    "",
    "## Postconditions",
    "",
    ...renderConditions(contract.postconditions),
    "",
    "## Read Boundary",
    "",
    "### Allowed",
    "",
    ...renderList(contract.readBoundary.allowed),
    "",
    "### Prohibited",
    "",
    ...renderList(contract.readBoundary.prohibited),
    "",
    "## Write Boundary",
    "",
    "### Allowed",
    "",
    ...renderList(contract.writeBoundary.allowed),
    "",
    "### Prohibited",
    "",
    ...renderList(contract.writeBoundary.prohibited),
    "",
    "## Delegation",
    "",
    "### Allowed",
    "",
    ...(
      contract.delegation.allowed.length > 0
        ? contract.delegation.allowed.map((item: { skillId: string; purpose: string }) => `- \`${item.skillId}\`: ${item.purpose}`)
        : ["- なし"]
    ),
    "",
    "### Order",
    "",
    ...renderList(contract.delegation.order),
    "",
    "### Prohibited",
    "",
    ...renderList(contract.delegation.prohibited),
    "",
    "## Grilling Conditions",
    "",
    ...renderConditions(contract.grillingConditions),
    "",
    "## Feedback Conditions",
    "",
    ...renderConditions(contract.feedbackConditions),
    "",
    "## Consumer References",
    "",
    "| consumer | purpose | inputs |",
    "|---|---|---|",
    ...contract.consumerReferences.map((item) => (
      `| \`${item.consumer}\` | ${item.purpose} | ${item.inputs.map((input) => `\`${input}\``).join(", ")} |`
    )),
    "",
  ].join("\n");
}

function renderConditions(conditions: readonly { id: string; description: string }[]): string[] {
  if (conditions.length === 0) return ["- なし"];
  return conditions.map((condition) => `- \`${condition.id}\`: ${condition.description}`);
}

function renderList(items: readonly string[]): string[] {
  if (items.length === 0) return ["- なし"];
  return items.map((item) => `- ${item}`);
}
