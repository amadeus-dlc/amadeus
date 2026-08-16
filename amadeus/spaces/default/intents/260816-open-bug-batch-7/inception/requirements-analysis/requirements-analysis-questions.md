# Requirements Analysis — 明確化質問(260816-open-bug-batch-7)

Intent Autonomy Mode = `full` のため、各質問は `amadeus-bolt decide-question` の梯子で裁定した(stage-protocol §1。solo-election 結果は不在のため loud degradation を記録のうえ agent recommendation を採用)。E-code `E-AD-<hex8>` は当該 AUTO_DECIDED 裁定(intent audit)への参照であり、full grant `intent-grant-f3cd750783eded708416acde804af0b5` 下の裁定 ID 先頭 8 hex を大文字化したもの(260814-priority-bug-batch で確立した規約)。既決事項(Issue 本文・RE 成果物)の再質問はしない(cid:requirements-analysis:c5)。

## Q1. #2363 の是正方向

RE 実測(codekb `architecture.md` / `component-inventory.md` の #2363 節)により、実害は §12a reviewer read-only allowlist(`frontmatterAdditions`)の未配布 1 点に絞られ、model ピンは driver fallback で有効、外部導入経路(`bunx @amadeus-dlc/setup install --harness pi`)は無傷と確定している。この前提でどの方向を採るか。

A. pi を dogfood self-install 配布集合へ追加する(kimi の #1522 と同型の昇格。3 面の集合定義 + gitignore 生成面 + 固定件数テスト 3 本 + docs 2 面を同一変更で同期)
B. リポジトリ内は手動配置手順の文書化のみに留める(`dist/pi/.pi` の手動 cp)
C. 裁定を保留し Issue を open のまま残す
X. Other (please specify)

[Answer]: A — 裁定 E-AD-5E2DC8EC(= AUTO_DECIDED `auto-decision-5e2dc8ec33f4cf2610a1a45026d3b66b`、agent recommendation、evidence = RE scan 結果)。根拠: 欠陥の構造的解消は配布のみで達成でき、kimi が同一昇格経路の先例(#1522/#1549)。B は手動手順のため allowlist 未配布の構造欠陥が残る。

## Q2. #2162 の修正対象スコープ

RE 実測(codekb `component-inventory.md` の #2162 節)により、起票時の 3 不整合のうち 2 つ(baseline.json digest 不一致・generatedFrom 等値契約)は ULID event 台帳移行(#2338/#2353)で消滅済み。現存欠陥は (i) `postRevision` への git 到達性検査の不在 (ii) `ledger.ts` の `baselineAtRevision` / `CANONICAL_PATHS.baseline` が不在ファイルを指す死経路、の 2 点。どこまでを本 intent の修正対象とするか。

A. 両方を修正対象とする(修復 vs fallback 退役の方式詳細は application-design で裁定)
B. (i) 到達性検査のみ
C. (ii) 死経路除去のみ
X. Other (please specify)

[Answer]: A — 裁定 E-AD-4BC73E5C(= AUTO_DECIDED `auto-decision-4bc73e5c3d3433910fe4c916f5b513bc`)。根拠: 2 点は同一ファイル群(`tests/no-silent-drop/`)の同根残余であり、片方のみでは Issue の期待結果(fail-closed の型付き診断と再現可能な bootstrap)を満たさない。

## Q3. #3097 の同期方式

RE 実測(codekb `component-inventory.md` §D)により、同期先は Issue 記載の 14 でなく「`matches` 宣言を持つ 13 manifest」(`amadeus-git-drift.md` は matches 非宣言で、追加すると 07 自身の発火規約 :210-212 と矛盾)、加えて既存 2 行の値陳腐化(`codekb` glob 欠落)があると確定している。どの形で解消するか。

A. 07(en/ja)の表を 13 件へ同期(欠落 4 行追加 + 陳腐化 2 行是正)し、t3028 の件数フリー検査対象へ 07 を追加する
B. 07 の表を 06(harness-engineering/06-sensors)への参照に置換して固定表を解消する
X. Other (please specify)

[Answer]: A — 裁定 E-AD-90A2E836(= AUTO_DECIDED `auto-decision-90a2e836bd95519f7ee8abec23743ce8`)。根拠: 既存 t3028 の導出述語を再利用でき、07 の matches 表は周辺 prose(ルーティング解説)と一体の参照価値を持つ。件数フリー guard の拡張で drift クラス自体が閉じる。
