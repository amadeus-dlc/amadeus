# Initiative Brief：260704-v2-parity-completion

## 目的と成功条件

AI-DLC v2（awslabs/aidlc-workflows、v2 branch、基準 commit `fde1e1af`）との完全一致を完成させる。
柱は、A（成果物の双方向一致）、B（skill 一覧の一致）、C（TS エンジン駆動化）の 3 本である。
基本戦略は本家 `dist/claude/` からの適応コピーであり、適応点は amadeus-* への改名と amadeus-grilling への結線の 2 つである（MIT-0）。

成功は次の 3 点で観測する。

1. パリティ検査が機械化され green である（名前写像と除外リスト付きの差分ゼロ）。
2. `npm run test:all` が green である。
3. この Intent 自身が新エンジン駆動でライフサイクルを 1 周完走している。

## スコープ境界

対象: エンジン（tools、hooks、sensors、stage 定義）の適応コピーと settings マージ、grilling 結線層、全 stage skill の置換と対応漏れ 15 skill の追加（Operation 完全採用）、独自 skill 5 個の削除と steering の畳み込み、v2 成果物の補完と重複独自ファイルの削除（grillings 分解吸収、モジュールファイルと intents.md の廃止）、規範改定（skill 英語必須、#393 上書き）、validator の新契約追従、パリティ検査機械化、examples 再生成。

対象外: 完了済み 2 record の移行、独自 3 skill（grilling、domain-modeling、validator）の削除、記述系成果物の英語化、本家にない新機能、上流 `aidlc/` seed の取り込み、上流 HEAD への自動追従。

## バックログ要約

| 項目 | 優先度 |
|---|---|
| 上流 agents、rules、scopes、knowledge のコピー範囲の精査 | Should |
| utility 3 skill（session-cost、replay、outcomes-pack）の動作検証と運用手順 | Should |
| 旧 `docs/amadeus/` 契約文書群の全面改稿 | Should |
| real provider e2e の運用規約化（#396 論点 7） | Could |
| codekb の鮮度運用（#396 論点 6） | Could |
| 完了済み 2 record に対する validator の恒久方針 | Could |
| 上流追従の定期運用 | Could |

## 制約

- C001: 既存の開発環境（kiro skill 群、既存 hooks、dev-scripts）を壊さない。hook と settings は aidlc-* 名前空間でマージする。
- C002: main は常に `npm run test:all` green。置換は Bolt 単位 PR に分割する。
- C003: パリティ基準は commit `fde1e1af` に固定し、更新は明示的な Issue または Intent で行う。
- C004: SKILL.md と TS スクリプトは英語必須。記述系成果物と gate 文言は日本語維持。
- C005: 独自 3 skill の機能を失わない。質問提示は amadeus-grilling へ結線する。
- C006: merge は人間が行い、walking skeleton の Bolt PR は必ず人間が承認する。

## 体制

該当なし（ソロ開発。Team Formation は skip）。

## モック

該当なし（UI なし。Rough Mockups は skip）。

## Inception への引き継ぎ

- 最小価値スコープはエンジン縦切り（エンジン + 結線層 + intent-capture 1 個の新駆動）である（GD010）。walking skeleton Bolt の境界として使う。
- 優先順は risk-first（C → B → A → 検査と examples）である（GD011）。Delivery Planning の入力にする。
- 結線層の具体設計（directive のどこに grilling を挟むか）が最大の設計論点であり、Application Design で確定する。
- 上流の実物は scratchpad に clone 済みだが、Inception では基準 commit `fde1e1af` を repo 内へ取得し直して参照を固定する。
- 判断の全文は `ideation/grillings.md`（G001、G002）、制約は `ideation/feasibility/constraint-register.md`、リスクは `ideation/feasibility/raid-log.md` を参照する。
