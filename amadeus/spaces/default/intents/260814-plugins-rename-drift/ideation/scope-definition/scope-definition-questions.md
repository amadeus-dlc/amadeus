# Scope Definition 質問(260814-plugins-rename-drift)

## 確定済み境界(質問しなかった項目とその理由)

上流ソース = Issue #2996 / #2997(クロスレビュー2名成立、xrev-260814-2996 / xrev-260814-2997)+ ユーザー指示(2026-08-14 本セッション)+ `intent-capture/intent-statement.md`。能力棚卸しの結果、**全能力が SETTLED** のため scope-boundary 質問(最小スコープ・must/nice 区分)は省略した(確定済み境界への縮小提案は仕様変更でありユーザー専権)。

棚卸し(全 SETTLED、出典併記):
1. プラグインディレクトリ移設 + plugin.json name 同時変更(#2996 完了条件1)
2. パス軸消費者の同期: coverage allowlist・complexity baseline・テスト19件・fixtures README(#2996 完了条件2)
3. 素の名前軸消費者の同期: `plugin.activation.names` / `plugin.scope-bindings` キー / docs 06-sensors 両言語(#2996 完了条件2)
4. 既存 workspace の設定移行手当て(scope-bindings silent 退行の検証)— 方式は設計段確定(#2996 完了条件3)
5. 残存参照検査の機械化述語(両軸)(#2996 完了条件5)
6. 合成フィクスチャ名の追随可否の明示的決定 — 設計段(#2996 完了条件6)
7. `plugins/git-drift/` stage-less プラグイン新設(sensors + tools + seams)(#2997 完了条件1)
8. センサー仕様: settings 経由スロットル・behind 数+交差判定・警告文言・fail-open(#2997 完了条件2)
9. センサーの落ちる実証3経路(#2997 完了条件3)
10. plugin.settings 機構(スキーマ宣言・階層解決・config/宣言側 fail-closed)+ 落ちる実証4項(#2997 完了条件6)
11. env 宣言スキーマの先行着地可否 — 設計段裁定(#2997 背景節)
12. 全ハーネス dist 投影・conformance・lint/型検査配線(#2996 完了条件4 / #2997 完了条件4)
13. 配布経路(全ハーネス同梱 vs workspace opt-in)— 設計段確定(#2997 完了条件5)
14. 対象外: coverage-patch-quick / formal-model-check の規約適用(#2996 対象外節 + intent-capture Q1=A)

以下は operational 質問(常に問う3問)。semi autonomy 有効のため `amadeus-bolt decide-question` の五段梯子で裁定し、裁定 id を回答行に記録する(cid:scope-definition:c1-semi-ladder-routing)。

## Q1. 能力間の依存関係

A. #2996 と #2997 に実装依存はない(Issue 記載)が、命名規約の一貫性のため #2996 を先行させる。#2997 内は settings 機構(core)が git-drift(plugin 消費者)の前提。この依存理解で確定(推奨)
B. 他の依存がある
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 裁定 id は下記承認証跡参照)

## Q2. シーケンシング方針

A. dependency-first: #2996 → #2997、#2997 内は core 設定機構 → git-drift の順に Unit を編成(ユーザー指示の順序と一致)(推奨)
B. value-first や risk-first など別方針
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 裁定 id は下記承認証跡参照)

## Q3. ハードデッドライン

A. なし — 両 Issue とも P2(通常)であり、期限起因の能力はない(推奨)
B. ある
X. Other (please specify)

[Answer]: A(AUTO_DECIDED — 裁定 id は下記承認証跡参照)

## 承認証跡

- semi 梯子裁定(承認): 2026-08-14T07:23:05Z — Q1=A `auto-decision-73340a3a1c3e7e83b4c6a1e46a5f5347` / Q2=A `auto-decision-e1d4899930d89892c50e278adcd9bbac` / Q3=A `auto-decision-79925a17f4de0748072d7ae7cfa9f114`(いずれも decider=agent-recommendation、unreviewed キュー入り。cid:scope-definition:c1-semi-ladder-routing に基づく AUTO_DECIDED — 人間回答ではないため QUESTION_ANSWERED は発行せず、INTENT_AUTONOMY_TRANSACTION_COMMITTED が一次記録)
