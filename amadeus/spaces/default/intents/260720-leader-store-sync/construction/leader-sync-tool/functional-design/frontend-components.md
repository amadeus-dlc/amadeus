# Frontend Components — leader-sync-tool(U1)

上流入力(consumes 全数): requirements, components, component-methods, services, unit-of-work, unit-of-work-story-map — N/A 判定は requirements.md NFR-1(CLI 限定)、出力形は component-methods.md M7/M5 の構造化レポートと services.md の stdout/stderr 契約、ジャーニー3段は unit-of-work-story-map.md に依拠

## N/A 根拠と CLI 出力契約による充当(ui-less-mockups-as-output-contract)

UI は存在しない(scripts/ CLI)。本成果物は verb 別出力契約で充当する:

- `status`(exit 0): `unsynced elections: <n> / shard delta: <n> lines / norm delta: <n> lines (warning only)` + `threshold exceeded: <bool>` — 1行1メトリクス、機械 parse 可能な `key: value` 形。
- `plan`(exit 0/1): 抽出予定 path 一覧(sort 済み)+違反一覧(`EXCLUSION <kind> <path>` 形)。
- `create`(exit 0): 最終行に PR URL のみ(stdout 契約 — 上流の advisory は stderr。stdout-directive-stderr-advisory の類推)。
- 失敗時(exit 1/2): stderr へ `amadeus-leader-sync: <kind>: <detail>` 1行(mirror.ts 既習様式)。

## 契約の検証

- 出力契約は integration テストの stdout/stderr capture でピンする(業務出力 = stdout、advisory = stderr)。
