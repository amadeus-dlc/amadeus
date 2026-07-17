# Feasibility Assessment — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../market-research/competitive-analysis.md`(closed-enum は業界標準 — 焦点は全数性テスト)、`../market-research/market-trends.md`、`../market-research/build-vs-buy.md`(完全自作の継承)。

## 技術実現性: 高(全面 file:line 実測済み)

| 変更面 | 実測 | 実現性 |
| --- | --- | --- |
| `packages/setup/src/domain/harness.ts:9,19-24` | `HarnessName` union+`HarnessName.all` の4値 — 2値追加は型と frozen 配列の同時拡張 | 自明 |
| `packages/setup/src/domain/engine-layout.ts:8-13` | `ENGINE_DIR_BY_HARNESS` 写像 — `opencode: ".opencode"` / `cursor: ".cursor"` 追記。:15-20 の fail-fast throw(未定義写像)は既存の安全網 | 自明 |
| `packages/setup/src/modules/reporter.ts:24-25,137` | 表示列挙 — 2値追記 | 自明 |
| `tests/unit/setup-harness.test.ts:13` / `setup-harness-parse.test.ts:17` | 期待列挙の更新+全数性テストの設計余地 | 小 |
| dist 入力 | `dist/opencode/.opencode/tools/data/harness.json`・`dist/cursor/.cursor/tools/data/harness.json` の実在を ls 実測(2026-07-16)— installer が読む配布面は着地済み | 前提充足 |

## 外部前提(c1 — 実ツール検証)

- npm レジストリ面: 変更なし(パッケージ名・publish 経路は前 intent で検証済み・稼働中)。`npm pack --dry-run` の実検証は requirements の c4 チェックリストで再固定する
- 新規外部依存: ゼロ

## 見積もり

正味変更は installer 5ファイル+全数性テスト。前 intent の U 規模感で S(1 Bolt)。リスクは constraint-register / raid-log 参照。

## 結論

**GO** — 未知の技術前提なし。判断事項(付随4ファイルの同時更新可否)は requirements の pre-declared 分岐で確定する。
