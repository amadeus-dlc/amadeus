# Units of Work — 260720-leader-store-sync(#1281)

上流入力(consumes 全数): requirements, components, component-methods, services, component-dependency, decisions — U1 の内容は components.md C1〜C6 と component-methods.md M1〜M8 の全数、外部面は services.md(GhRunner/GitRunner/read-only FS)、規模は components.md の機械再計算 450行、方式根拠は decisions.md ADR-1〜4 に依拠

## U1: leader-sync-tool

- **内容**: `scripts/amadeus-leader-sync.ts` の新設(C1〜C6 全部+M1〜M8)+2層テスト(unit: 純関数 M1/M2/M3/M5/M7 判定部・ドリフト検知 / integration: mkdtempSync workspace+fake GitRunner/GhRunner port、落ちる実証2注入+transient 3形 corpus sweep)。
- **規模**: 実装 ~450行+テスト ~300行(components.md の機械再計算値)。
- **完成条件**: AC-3a〜3d・AC-5a〜5c・E-LSSRA1 留保2件(実証シナリオ節)・全検証 exit 0・ローカル lcov 新規行未カバー0。
- **含まない**: 同期契機ノルムの persist(FR-2 — leader 執行の norm PR。delivery-planning で引き渡し事項として固定)。

## 単一 unit 構成の根拠

単一構成: 設計 6コンポーネントは全て単一 CLI ファイル+単一テスト帯に凝集し(C-1 scripts/ 限定)、分割は worktree 隔離・レビュー単位のいずれにも利得がない(凝集性判定 — intent-capture:c4 の様式)。
