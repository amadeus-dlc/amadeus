# Stakeholder Map: Solo Standing Grant

## Stakeholder Overview

| Stakeholder | Role | Primary interest | Influence |
|---|---|---|---|
| Solo operator | 主利用者・grant発行者・重要gate承認者 | 反復承認の削減と、人間統制の維持 | 最終決定者 |
| Team-mode operator | 既存機能の利用者 | leader/delegation経路の後方互換性 | 回帰に対する拒否権を持つ利害関係者 |
| Amadeus maintainer | engineと契約の保守者 | 小さく明確なモデル、競合安全性、保守可能なテスト | 技術判断への強い影響 |
| Harness maintainer | Codex、Claude、Cursor、Kiro、OpenCode等の手順保守者 | 全ハーネスで同じ意味論 | 配布整合性への強い影響 |
| Auditor / reviewer | 監査証跡と安全性の検証者 | 正確なGrant Id、event順序、不正な完了やerrorの不存在 | リリース可否への影響 |
| Contributor | 実装・テスト・文書更新の担当者 | 明示的な認可境界と検証可能な受け入れ条件 | 実装品質への影響 |

## Decision Makers

### Human operator

人間のオペレーターが、standing grantの発行・取消と重要な設計判断の最終決定者である。phase boundary、walking skeleton、Request Changes、halt-and-askなどgrant対象外の判断は、引き続き人間が行う。

### Intent approval gates

本intentの各設計成果物はapproval gateで確認する。特に、gateの存在と認可主体の分離、route-to-commit間の競合モデル、監査不変条件、team modeとの境界は、実装開始前に人間の承認を必要とする。

## Influencers

### Existing team-mode contract

現行team modeの発行・探索・委任・gate approval・監査記録は、変更対象ではなく互換性制約である。コードから確認した事実が、solo mode固有経路の境界を決める。

### State and audit contracts

directive、state transition、audit eventの既存契約は、新しい利用者体験が安全であるかを制約する。特に`HUMAN_TURN`のpresence保証、`GATE_APPROVED`のGrant Id、`STAGE_COMPLETED`の発生条件は設計判断へ強く影響する。

### Frozen prototype

PR #1468は設計上の参考情報を提供するが、権威ある実装または合意済み設計ではない。採用・不採用のいずれも、現行mainのコード調査とintent成果物の判断を根拠にする。

## Communication Requirements

| Audience | Required communication | Timing |
|---|---|---|
| Human operator | 重要なモデル選択、代替案、リスク、推奨案 | 各設計gate |
| Maintainers | team/solo差分、認可境界、競合時の状態・audit結果 | application designまで |
| Reviewers | 受け入れ条件からtestまでの追跡、正確なevent不変条件 | requirements以降 |
| Harness maintainers | conductor手順の共通意味論と生成物drift | 実装・build and test |
| Team-mode users | 既存経路が変更されないことの回帰証拠 | 検証完了時 |

## Escalation Conditions

次の場合は推測で進めず、approval gateまたは明示的な質問で人間へ戻す。

- gateの存在と認可主体を分離できない設計しか成立しない場合
- route時に選んだgrantとcommit時に検証するgrantの同一性を保証できない場合
- 失効競合を通常のhuman gateフォールバックとして表現できない場合
- team modeの既存leader/delegation意味論を変更する必要が生じた場合
- phase boundary、walking skeleton、per-unit最終gateの適用規則に変更が必要な場合
