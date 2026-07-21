# Intent Statement — 260719-ballot-failclosed-amend

上流入力(consumes 全数): (本ステージは consumes 宣言なし — 入力はユーザー記述 $ARGUMENTS と Issue #1252 / #1253)

## Problem Statement

選挙 CLI(`scripts/amadeus-election.ts` 系)の ballot 受理境界が fail-open である:

1. **#1252(bug, P2/S3-MAJOR)**: `Ballot.parse`(`scripts/amadeus-election-model.ts:184-204`)の 5 分類検証に submittedAt の様式検査がなく、`normalizeAt`(`scripts/amadeus-election-transport.ts:88-92`)は parse 不能入力を意図的に素通しする。非タイムスタンプ文字列(実例 `__NOW__`)が ledger まで到達し、選挙終盤の `verify`(timeline-order 検査)で初めて停止する — 検出がライフサイクル最終盤まで遅延し、レビュー済み選挙の完走を阻害する。
2. **#1253(enhancement, P3)**: `AmendBallot` 型と store 側の共存受理は実装済みだが、amend を生成・提出する CLI 経路が存在しない。`Ballot.parse` は入力の `kind` を読まず常に `kind:"original"` を返し(手書き `kind:"amend"` 入力も original に落ちる — write 側欠落)、duplicate 拒否により訂正再提出が構造的に不可能。

## Target Customer

amadeus チームの全エージェント(投票者・leader)。E-CCCRA の実事故(2026-07-19)では、ballot 生成ミス(`__NOW__`)が投票時に受理され、選挙終盤の verify 停止として顕在化し、CLI 内で訂正できず store 手是正(leader コミット 4f636eea5)とユーザー承認を要した。

## Success Metrics

1. `__NOW__` 級および「`new Date` が NaN にならない ISO 風文字列」(e1 クロスレビュー所見)が vote 受理段で exit 1 になる — regex+Date の二段検証(e4 クロスレビュー所見)の落ちる実証テストで固定。
2. `kind:"amend"` の ballot が vote 経路で受理され、original と共存して ledger に記録される(correction trail 維持)— 閉包テストで固定。tally 側 amend 解決規則は design 段の選挙裁定に従う。
3. 既存テストスイート(`bash tests/run-tests.sh --ci` ほか PR/CI 基準)の green 維持。

## Initiative Trigger

実運用事故起点の技術負債即時回収: E-CCCRA 投票事故(2026-07-19)の self-report → leader 裁定(14:56Z)で #1252/#1253 起票 → クロスレビュー2名成立 → ユーザー承認済み編成で同一 intent 修正がディスパッチされた(15:00:57Z)。

## Initial Scope Signal

`amadeus` スコープ(ユーザー明示決定 — enhancement #1253 同梱のため bugfix でない)。修正面は `scripts/amadeus-election-*.ts` 系+テストに限定。配布フレームワーク(`packages/framework/`、`dist/`)には触れない。`tests/unit/t238-election-record.test.ts` は e1 の #1226 intent が反転予定のため、交差時は着手前に非交差確認のうえ leader へ報告(直列化判断)。
