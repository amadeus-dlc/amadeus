# Unit Test Instructions

Unit: hooks-state-bugfix（Test Strategy: Minimal — 要件 1 件につき検証 1 件以上）

## 要件と検証の対応

| 要件 | 検証 | コマンド |
|---|---|---|
| R001 Phase Progress 更新 | hooks-state-bugfix eval 観点 (a) | `bun run dev-scripts/evals/hooks-state-bugfix/check.ts` |
| R002 phase-check 要求 | 同 eval 観点 (b) ＋ aidlc-state eval の追随 fixture | 同上、`npm run test:it:aidlc-state` |
| R003 stop hook 所有×進行中 | 同 eval 観点 (d) | 同上 |
| R004 mint-presence skip | 同 eval 観点 (c) | 同上 |
| R005 解放ガード無変更 | 既存 stop hook 挙動の回帰（eval 内アサーション） | 同上 |
| AC-5 発見元 record 整合 | AmadeusValidator | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-engine-validator-gap` |

## 実行方法

一括実行は `npm run test:all`。eval は隔離 temp workspace でエンジン実 CLI・hook 実スクリプトを駆動し、本番 aidlc/ を変更しない。

## カバレッジ目標

- R001〜R005 の全要件に検証があり、eval は 19 assertion（実装前 12 件 FAIL → 実装後 19/19 GREEN の RED→GREEN 証跡あり）。
