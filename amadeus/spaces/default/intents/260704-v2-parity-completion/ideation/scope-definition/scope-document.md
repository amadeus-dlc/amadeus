# Scope Document：260704-v2-parity-completion

## 最小スコープ

コピーした TS エンジン、amadeus-grilling 結線層、1 個の stage skill（intent-capture）が新駆動で動く縦切りを、価値を出せる最小スコープ（walking skeleton 相当）とする。
この縦切りが最大リスク（結線層の設計不整合）を最初に検証し、以降の skill 置換を同じ型の繰り返しにする。

## 対象

- TS エンジン（tools 26 個）、hooks（11 個）、sensors（4 個）、stage 定義（aidlc-common）の適応コピーと、既存 `settings.json` への aidlc-* 名前空間マージ（C001）。
- amadeus-grilling 結線層の設計と実装（質問提示を一問ずつの対話に接続し、確定結果を v2 形式の questions ファイルへ記録する）。
- 全 stage skill の本家版への置換（amadeus-* へ改名）と、対応漏れ 15 skill の追加（Operation 系 7 個の完全採用を含む。GD005）。
- 独自 skill の削除（amadeus-learning-review、amadeus-decision-review、amadeus-history-review、amadeus-domain-grilling、amadeus-event-storming）と amadeus-steering の 0.1 / 2.2 への畳み込み（GD003）。
- v2 規定成果物の補完と重複独自ファイルの削除（Issue #396 の 7 論点。grillings は questions + decision-log へ分解吸収、モジュールファイルと intents.md 索引は廃止）。
- 規範改定（skill 英語必須の GD002、sensor 採用に伴う Issue #393 判断の上書き、`docs/backward-compatibility.md` への記録）。
- amadeus-validator の新成果物契約への追従（sensor との必須節定義共有。GD004）。
- パリティ検査の機械化（基準 commit `fde1e1af`、名前写像 aidlc-* ↔ amadeus-*、除外リスト付き。C003）。
- examples 4 snapshot の新契約での real provider 再生成と provenance 更新。

## 対象外

- 完了済み 2 record（260703-aidlc-v2-full-compliance、260703-amadeus-skill-english-rollout-plan）の新形式への移行（GD006）。
- 独自 3 skill（amadeus-grilling、amadeus-domain-modeling、amadeus-validator）の削除または縮小（GD003）。
- 記述系成果物とユーザー向け gate 文言の英語化（GD002）。
- 本家 `dist/claude/` に存在しない新機能の追加。
- 上流の `aidlc/` seed（spaces 雛形）の取り込み（既存 `aidlc/` 実データを正とする）。
- 上流 v2 branch HEAD への自動追従（C003）。

## 順序の方針

risk-first とする。
C（エンジン + 結線層の縦切り）→ B（skill 一覧の置換と削除）→ A（成果物一致と重複削除、規範改定）→ パリティ検査と examples 再生成、の順で進める。
main は常に `npm run test:all` green を維持し、Bolt 単位の PR に分割する（C002）。

## 期限

| 対象 | 期限 | 根拠 |
|---|---|---|
| 全体 | 未確認 | 期限の指定はない。品質制約（C002）を優先する |
