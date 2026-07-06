# Unit Test Instructions

Unit: skill-quality-repair（Test Strategy: Minimal — 要件 1 件につき検証 1 件）

## 要件と検証の対応

| 要件 | 検証 | コマンド |
|---|---|---|
| R001 監査記録 / R006 #341 disposition | audit-report.md を含む Intent 成果物の構造検証 | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-skill-quality-repair` |
| R002 非ステージ補修 / R003 ステージ finding 記録 | ステージ skill パリティ維持と昇格同期 | `npm run parity:check`、`npm run test:it:promote-skill` |
| R004 Grilling 規約 | 生成側 skill の規約結線検査 | `npm run grilling-wiring:check` |
| R005 入力契約 | 契約記載の決定論的検査＋eval | `npm run issue-ref-contract:check` |

## 実行方法

一括実行は標準検証入口で行う。

```sh
npm run test:all
```

個別実行は上表のコマンドを使う。

## カバレッジ目標

- R001〜R006 の各要件に対応する検証が 1 件以上存在する（Minimal 戦略の下限）。
- 新規スクリプト（issue-ref-contract）は TDD で作成済みであり、eval（`dev-scripts/evals/issue-ref-contract/`）が RED→GREEN の証跡を担う。

## テストデータ

- 追加のテストデータ管理は不要である。検査対象は repo 内の SKILL.md と references の実体である。
