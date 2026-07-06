# Requirements Analysis — 質問

Intent: 260704-grilling-mode-wiring
対象 Issue: https://github.com/amadeus-dlc/amadeus/issues/442

Issue #442 の grilling session（2026-07-04）で主要判断は確定済みである。
ここでは requirements 確定に必要な残りの実装境界だけを確認する。

## Q1. 決定論的 wiring 検査の実装形態

grilling で「annex の Grill me mode 定義・29 skill の結線文言・source と昇格先の一致を assert する決定論的検査を追加する」ことは確定した。
検査をどこに実装し、どの検証連鎖に組み込むか。

A. 新規 dev-script（例: `dev-scripts/check-grilling-wiring.ts`）を作り、`package.json` に専用エントリを追加して `test:ci:mock` 連鎖（`npm run test:all` が呼ぶ経路）に組み込む
B. 既存の `claude-wiring:check`（`check-claude-host-wiring.ts`）に検査観点を追加する
C. 新規 dev-script を作るが検証連鎖には入れず、手動実行のみとする
D. 既存の parity:check に検査観点を追加する
X. Other (please specify)

[Answer]: A. 新規 dev-script（`dev-scripts/check-grilling-wiring.ts`）を作り、`package.json` に専用エントリを追加して `test:ci:mock` 連鎖に組み込む

## Q2. mode 選択に挿入する Grill me 選択肢の表記

4 択の 2 番目に挿入する選択肢のラベルと説明の方針を確認する。
（Guide me / I'll edit the file / Chat の既存 3 択の表記は変更しない）

A. ラベルは「Grill me」とし、説明に「one question at a time, recommended answer attached（amadeus-grilling bridge 準拠）」の趣旨を英語で書く（既存 3 択の表記言語に合わせる）
B. ラベルは「Grill me (amadeus-grilling)」とし、skill 名を明示する
C. ラベルは「Grill me」とし、説明は日本語で書く
X. Other (please specify)

[Answer]: A. ラベルは「Grill me」とし、説明は既存 3 択の表記言語（英語）に合わせて one question at a time, recommended answer attached（amadeus-grilling bridge 準拠）の趣旨を書く
