# コード生成計画 — unit: hooks-state-bugfix

上流入力は requirements.md（R001〜R005、N001〜N004、AC-1〜AC-5）である。
scope bugfix により functional-design / nfr-design / infrastructure-design は SKIP（設計どおりの不在）。要求と既存コード構造を事実上の設計として参照する。
Test Strategy は Minimal（要件駆動。TDD: RED 先行）。実行単位は単一 unit / 1 PR である。

## トレーサビリティ

| Step | 対応要求 | 対象 |
|---|---|---|
| Step 1 | N001 | RED fixture・検証ハーネスの整備 |
| Step 2 | R001 | amadeus-state.ts: Phase Progress の Verified 更新 |
| Step 3 | R002 | amadeus-state.ts: phase-check 成果物の存在要求 |
| Step 4 | R004 | amadeus-mint-presence.ts: complete Intent への mint skip |
| Step 5 | R003（R005 は無変更確認） | amadeus-stop.ts: 所有×進行中の 2 条件 AND |
| Step 6 | 制約（parity） | parity-map 例外宣言と skills/ 正準ソース同期 |
| Step 7 | AC-5 | 発見元 record 260705-engine-validator-gap の整合 |
| Step 8 | N002〜N004、AC-1〜AC-4 | 検証一式 |
| Step 9 | （stage 成果物契約） | code-summary.md |

## 実行ステップ

- [x] **Step 1: RED 先行の検証整備（N001）** — 既存の検証ハーネス（`dev-scripts/evals/engine-e2e/` ほか）を調査し、次の 4 観点の決定論的検証を追加して、修正前に fail することを確認する: (a) phase 境界通過後の Phase Progress が Verified になること、(b) phase-check 不在時に境界完了が拒否されること、(c) complete な registry entry を指す cursor で mint-presence が HUMAN_TURN を書かないこと、(d) stop hook の督促判定が「所有×進行中」の 2 条件 AND であること（hook のロジックを検証可能な形に切り出してよい）。
- [x] **Step 2: R001 実装** — `amadeus-state.ts` の PHASE_VERIFIED を emit する経路（advance の phase 境界処理、complete-workflow）で、同一トランザクション内に `## Phase Progress` の該当 phase を `Verified` へ更新する。
- [x] **Step 3: R002 実装** — 同経路で `verification/phase-check-<phase>.md` の存在を要求し、不在なら phase 境界の完了を拒否して conductor へ生成を指示するエラーを返す（produces 不在拒否と同型）。
- [x] **Step 4: R004 実装** — `amadeus-mint-presence.ts` で、cursor の指す Intent の registry entry status が complete 系なら mint を skip する。
- [x] **Step 5: R003 実装** — `amadeus-stop.ts` の督促判定に「所有（.aidlc-sessions の対応一致）」×「進行中（registry status が complete 系でない）」の 2 条件 AND を追加する。解放ガード本体は変更しない（R005）。
- [x] **Step 6: parity 同期** — 変更した engine ファイルを `dev-scripts/data/parity-map.json` の engineFileExceptions へ宣言し、`skills/` 正準ソースへ同一反映する。skill の promote が必要なら promote-skill.ts 経由で行う。
- [x] **Step 7: AC-5 対応** — 発見元 record `260705-engine-validator-gap` の state フィールド整合（Phase Progress の Verified 化）と `verification/phase-check-<phase>.md` の追補を行う（audit 非改変、e10f8294 と同じ型）。validator fail 2 件の解消を確認する。
- [x] **Step 8: 検証（N002〜N004、AC-4）** — `npm run test:all`、`npm run test:it:engine-e2e`、`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-hooks-state-bugfix` を実行し pass を確認する（本 record の Initialization: Active fail は Step 2 の修正確認に使い、必要な整合を行う）。
- [x] **Step 9: code-summary 作成** — 変更ファイル、主要判断、RED→GREEN 証跡、検証結果、逸脱を `code-summary.md` に記録する。

## 制約（requirements.md より）

- audit の記録済みイベントは書き換えない。
- kanban-sync 系 hook（main に入った #470 の成果物）には触れない。
- 解放ガードの signature 計算は変更しない。
- 新規検証は Bun + TypeScript、`package.json` には短い名前の薄い入口だけ足す。
