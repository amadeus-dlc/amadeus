# Tech Stack Decisions — metrics-observation

- **T-1: Bun/TypeScript 単独**(project.md Tech Stack 準拠)。新規 npm/pip 依存ゼロ(external-dependency-map 再確認)。
- **T-2: lizard 1.23.0 pin 継承**(#837 の CI pin をそのまま消費 — バージョンは tool_version として snapshot に自己記録)。
- **T-3: 検証配線** — 新規テストは既存 4層ランナーの unit 層(in-process seam 中心)。lint(Biome)/typecheck(tsc)は既存2構成に自動包含(scripts/ は lint 対象グロブ内 — package.json :18 実測)。
- **T-4: 配置** — scripts/metrics-snapshot.ts(D1 確定)。dist 非同期面のため C2 コストなし。
