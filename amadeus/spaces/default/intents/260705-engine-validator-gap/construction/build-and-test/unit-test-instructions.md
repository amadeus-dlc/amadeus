# Unit Test Instructions

Test Strategy: Minimal（要求 1 件につき検証 1 件）。
テスト基盤は dev-scripts/evals 配下の check.ts 方式であり、vitest / jest は使わない。
検証の内訳は code-generation-plan.md の traceability、実装内容は code-summary.md に対応する。

## 実行コマンド

要求対応の検証を含むスイートは次の 2 つ。

```bash
npm run test:it:aidlc-state         # R001（#457）: advance stdout の memory_path
npm run test:it:amadeus-validator   # R002（#458）: scope 外ステージの [ ] ＋ SKIP annotation 受理
```

全体確認（受け入れ条件 GREEN）:

```bash
npm run test:all
```

## 要求と検証の対応

| 検証 | 要求 |
|------|------|
| aidlc-state eval：隔離 workspace で intent-birth → advance を実 CLI 起動し、stdout JSON の `memory_path` が record prefix（`aidlc/spaces/<space>/intents/<dirName>/`）で始まる | R001（#457） |
| amadeus-validator eval：エンジン実出力形（scope 外ステージが `- [ ] <slug> — SKIP`）の state fixture が「scope 外ステージ」検査を pass する | R002（#458） |

## 検証の設計方針

- fixture はエンジンの実出力形を正とする。validator の期待に手書きで合わせた fixture は不整合を隠すため使わない（#458 の見逃し原因の再発防止）。
