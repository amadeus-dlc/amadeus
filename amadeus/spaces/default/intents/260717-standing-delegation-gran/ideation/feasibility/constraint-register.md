# Constraint Register — standing-delegation-grant

上流入力(consumes 全数): `../intent-capture/intent-statement.md`(成功基準1〜7・Out of Scope)

## 技術的制約

| # | 制約 | 反証可能根拠 / 出典 |
|---|---|---|
| C-1 | グラント受理は全条件 AND の fail-closed(発行行実在・根拠 HUMAN_TURN 実在・scope 適合・TTL 内・未撤回・チームモード)— どれか欠け=refuse で per-gate HUMAN_TURN 要求へフォールバック | 成功基準1/7、verifyDelegatedProvenance :2528 の fail-closed 様式対照 |
| C-2 | チームモード判定は `AMADEUS_OPERATING_MODE` env **唯一**(発行時・受理時の両方)— agmsg 登録等から推測しない | ユーザー指示(Issue #1125 コメント固定)、team.md Operating Modes 既決 |
| C-3 | 既定除外: PR マージ(構造外 — engine に verb 不在を実測)・phase-boundary(state.ts:125-160 の既存分類)・walking-skeleton(Skeleton Stance 状態) | 成功基準2、standing-approval-scope-limit / P4 |
| C-4 | HUMAN_TURN の mint 拒否(audit append 入口)は無改修 — グラントは HUMAN_TURN の代替 provenance であって HUMAN_TURN の生成ではない | state.ts:1951-1956、検証劇場 Forbidden |
| C-5 | 白側: グラント不在時の既存 delegate フロー(#671)は挙動不変(退行ゼロ、白側 sweep で実証) | 成功基準4、corpus-sweep-for-new-guards |
| C-6 | TTL 等の数値は named const+必要なら env override(DEFAULT_LOCK_STALE_MS :3629-3632 様式)で定義し、比較前に数値 parse(型不正入力の落ちる実証を含める) | constants-from-code / verification-numeric-parse |
| C-7 | グラントの全フィールド(scope/TTL/撤回状態)はコードが消費する — 消費されない文書的フィールドを持たせない | 検証劇場 Forbidden |
| C-8 | no-AI-merge / leader-executes-merge / マージのユーザー承認は本機構の対象外のまま不変 | Out of Scope、P4 |

## 運用制約

| # | 制約 | 出典 |
|---|---|---|
| C-9 | グラント発行・撤回・TTL 裁量はユーザー(発行 verb は発行セッションの実 HUMAN_TURN 接地) | IC Q1 裁定(既決導出) |
| C-10 | 撤回の伝播は結果整合(delegate と同じ配送流路)— 時間差の扱いは design で明文化 | FQ2(design 送り) |
