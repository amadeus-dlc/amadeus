# Build and Test Results

実行日時：2026-07-05（build-and-test ステージ内で実行）

## ビルド結果

| コマンド | 結果 |
|----------|------|
| `npm run typecheck`（tsc --noEmit、`test:all` に含まれる） | 成功（exit 0、エラーなし） |

## テスト結果

| コマンド | 結果 |
|----------|------|
| `npm run test:it:aidlc-state` | pass（`aidlc-state eval: pass`。R001 の advance stdout 検査を含む） |
| `npm run test:it:amadeus-validator` | pass（`amadeus validator eval: ok`。R002 のエンジン実出力形 fixture 検査を含む） |
| `npm run test:it:promote-skill` | pass（昇格先同期の検証） |
| `npm run test:it:engine-e2e` | pass（`engine e2e eval: ok`） |
| `npm run test:all` | pass（exit 0。typecheck、lint、contracts、parity、wiring、全 evals、diff:check を含む全件。本ステージで再実行して確認） |

失敗、スキップはなし。

## RED 証拠（code-generation ステージで確認済み）

- R001（#457）: 修正前は `memory_path=aidlc/spaces/default/intents/inception/...`（dirName セグメント欠落）で fail。
- R002（#458）: 修正前は scope 外 26 ステージ全件が `[ ]` を根拠に「scope 外のステージが [S] である」で fail。

## 実 record の validator 検証

```bash
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-engine-validator-gap
```

- R002 の再現ケース（scope 外ステージの `[ ] — SKIP` 表記）は pass する（修正前は必ず fail していた）。
- 残 fail は 2 件のみで、いずれも本 Intent の範囲外の既存不整合（`PHASE_VERIFIED` 記録時に Phase Progress が `Verified` へ更新されないエンジン欠落、[Issue #464](https://github.com/amadeus-dlc/amadeus/issues/464) として起票済み）。requirements.md の追補（受け入れ条件の読み替え）を参照。

## 補足

- カバレッジレポートは check.ts 方式のため出力されない。要求との対応は unit-test-instructions.md の表で管理する。
