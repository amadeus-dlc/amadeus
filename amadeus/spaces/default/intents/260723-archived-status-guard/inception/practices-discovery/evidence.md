# Evidence — practices-discovery(260723-archived-status-guard)

上流入力(consumes 全数): business-overview、architecture、code-structure、technology-stack、dependencies、code-quality-assessment(同日 RE codekb — cid:practices-discovery:c1 によりスキャン代用)。

## 証跡スキャンの代用宣言(c1)

本 intent の RE(2026-07-23、observed 4310f686f)が CI・テスト・コードスタイル・監査面をカバー済みのため、独立スキャンは行わず codekb を証跡として代用する:

- CI/テスト: run-tests 4層+--ci tier 契約・coverage registry/patch gate(technology-stack / code-structure の current view)
- コードスタイル: TS/ESM+Bun 直接実行・Biome・enum は判別ユニオン様式(project.md Code Style と一致 — functional-domain-modeling-ts 採用済み)
- 監査: append-only シャード+audit-format 件数同期手順(architecture の current view)
- 依存境界: ガード挿入点→registry status 読取の一方向従属(dependencies の current view)— 循環なしで practices 上の懸念なし
- 業務境界: 棚上げ intent の機械制御対象化に限定(business-overview の current view)— 業務プロセス系 practices の変更は不要

## affirm 済み practices との差分ギャップ

team.md / project.md は本日(2026-07-23)までの §13 選挙・ノルム PR(#1386/#1392/#1399/#1400 ほか)で継続更新済み — RE 実測面との矛盾・欠落ギャップは検出なし(0件)。
