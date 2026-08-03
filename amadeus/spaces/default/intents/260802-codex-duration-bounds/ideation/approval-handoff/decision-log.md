# Decision Log — 長時間実行の統一的な有界化

## Upstream Inputs

- `intent-statement`: 問題、成功指標、4 Issue の統合方針を参照した。
- `scope-document`: S-01〜S-06、delivery boundary、受入、deferred decision を参照した。
- `intent-backlog`: PB-01〜PB-06 の優先順と依存を参照した。
- `competitive-analysis`: Market Research が SKIP のため不在。市場判断は記録していない。
- `feasibility-assessment`: 条件付き GO と三層検証を参照した。
- `constraint-register`: C-01〜C-14 の hard constraint と ownership を参照した。
- `team-assessment`: Team Formation が SKIP のため不在。staffing 判断は延期した。
- `wireframes`: Rough Mockups が SKIP のため不在。UI 判断は対象外とした。

## Product and Scope Decisions

| ID | Decision | Evidence |
|---|---|---|
| D-01 | #1602、#1998、#1999、#1919 を一つの Intent で扱う | ユーザー直接回答、`intent-statement` |
| D-02 | 4 Issue は全て Must とし、部分集合だけでは Intent 完了としない | `scope-document`、`intent-backlog` |
| D-03 | 順序は `#1602 → #1998 → #1999 → #1919` | baseline と安全性の依存関係 |
| D-04 | 1 Issue = 1 Bolt = 1独立PRとする | ユーザー直接回答、`scope-document` |
| D-05 | 着手 Issue だけに `in-progress` を付け、現在は #1602 のみ着手中とする | ユーザー指示、Issue inventory |
| D-06 | 各 Bolt 着地後、後続 worktree を最新 base へ rebase する | ユーザー指示、S-06 |
| D-07 | package／promote 後に park し、fresh Codex session で resume／dogfood する | `intent-statement`、PB-06 |

## Architecture and Quality Decisions

| ID | Decision | Evidence |
|---|---|---|
| D-08 | 計測、停止、対話予算、並列上限の合否 predicate は shared core を正本にする | `feasibility-assessment`、C-01 |
| D-09 | harness 差は native payload／lifecycle／driver の adapter capability として表す | `feasibility-assessment`、C-02 |
| D-10 | Codex は一次性能評価・dogfood 対象だが、別の安全ポリシーは持たない | ユーザー訂正、C-03 |
| D-11 | Codex 専用 blocking gate は、共有 predicate で検出不能な native defect の再現可能な証拠がある場合だけ再検討する | `intent-statement`、C-03 |
| D-12 | shared core conformance と影響 adapter conformance は blocking、live journey は capability 条件付き結線証拠とする | `feasibility-assessment` |
| D-13 | package／self-install／distribution drift は全 supported harness で blocking とする | `scope-document`、C-08 |
| D-14 | 決定的な累積上限を停止性の主契約、意味論的収束判定を補助的な再計画情報とする | [#1998 コメント](https://github.com/amadeus-dlc/amadeus/issues/1998#issuecomment-5154591557)、RAID R-05 |
| D-15 | telemetry に prompt 本文、secret、credential を含めない | C-12 |
| D-16 | 長い実時間 timeout ではなく短縮 seam、counter assertion、境界値で主契約を検証する | C-13 |

## Delivery and Governance Decisions

| ID | Decision | Evidence |
|---|---|---|
| D-17 | Issue 記述だけで core／adapter 所有境界を断定せず、Reverse Engineering で固定 SHA の一次ソースを調べる | #1998 cross-review refinement、C-14 |
| D-18 | 各 Bolt は baseline／control と treatment を同一 workload で比較する | Success Metrics、PB-01〜PB-06 |
| D-19 | 全 harness に同率の性能短縮を求めないが、共有安全契約の免除は認めない | `intent-statement`、`scope-document` |
| D-20 | 固定納期・金額予算は置かず、安全条件を日程のために削らない | RAID A-05、`scope-document` |
| D-21 | 本 approval は Inception 分析への進行判断であり、4 PR の実装・マージ承認ではない | approval boundary |
| D-22 | 常任グラントは stage gate のみを対象とし、Ideation→Inception の phase boundary はユーザー本人が承認する | standing grant `cc427f98` の scope |

## Deferred Decisions

| ID | Decision point | Resolution owner / evidence required |
|---|---|---|
| P-01 | stage／agent／tool の時間目標と許容分位点 | #1602 baseline 後の NFR Requirements |
| P-02 | Stop、質問、follow-up、review の具体 budget | baseline と境界値テスト設計 |
| P-03 | swarm 最大同時実行数と同一 Unit 最大 retry 数 | baseline、既存定数、resource profile |
| P-04 | capability がある非 Codex harness の live journey 対象集合 | Reverse Engineering の driver inventory |
| P-05 | core／harness overlay の正確な所有ファイル | fixed SHA に対する Reverse Engineering |
| P-06 | Construction の named mob、担当、schedule | Units Generation と Delivery Planning |

## Rejected Alternatives

| ID | Alternative | Reason |
|---|---|---|
| A-01 | 4 Issue を同時に1 PRで実装する | 独立受入、改善効果比較、前段改善の後段波及が失われる |
| A-02 | Codex 専用の停止・品質 gate を先に作る | 現時点で共有 predicate が検出不能とする例外証拠がない |
| A-03 | 全 harness で同じ時間短縮率を blocking にする | provider、driver、native lifecycle の差を品質契約と混同する |
| A-04 | baseline 前に上限数値を固定する | 実測根拠がなく、正常な長時間処理を誤停止する可能性がある |
| A-05 | LLM の意味論判定だけで停止性を保証する | 決定性がなく、hard cap を代替できない |
