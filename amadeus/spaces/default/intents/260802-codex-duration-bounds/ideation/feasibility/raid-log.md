# RAID Log — 長時間実行の統一的な有界化

## Upstream Inputs

- `intent-statement`: 対象問題、対象顧客、成功指標、4 Bolt の依存順を参照した。
- `competitive-analysis`: Market Research が SKIP のため不在。競合優位性を RAID 判断へ持ち込んでいない。
- `market-trends`: Market Research が SKIP のため不在。市場変化をリスク根拠にしていない。
- `build-vs-buy`: Market Research が SKIP のため不在。外部製品依存を仮定していない。

## Risks

| ID | Risk | Likelihood | Impact | Treatment | Owner | Closure evidence |
|---|---|---|---|---|---|---|
| R-01 | Codex で強く観測された症状を Codex 専用安全契約へ誤変換する | Medium | High | 共有 predicate＋adapter capability の三層境界を要件・設計・テストへ trace する | Product／Architect | Codex 専用 gate 0件、または例外根拠付き decision |
| R-02 | 計測追加が実行時間を増やし、ベースライン比較を歪める | Medium | Medium | 同一 workload、対照／処置、計測 overhead の分離 | Quality | #1602 の baseline report と overhead 記録 |
| R-03 | harness が取得できない metadata を欠損または成功として黙殺する | Medium | High | capability と取得不能理由を schema 化し fail-closed で検証 | Core／Harness maintainers | adapter conformance の unavailable ケース |
| R-04 | 累積上限が audit、heartbeat、tool event などの副次活動でリセットされる | High | High | stage 遷移と budget 消費を分離し、#1998 再現を回帰化 | Core maintainer | 回避再現が全て終端するテスト |
| R-05 | 意味論的収束判定の誤判定で健康な長時間処理を停止する | Medium | Medium | 意味論判定を補助情報に限定し、決定的ハード上限を主契約にする | Architect／Quality | false-positive fixture と人間再計画経路 |
| R-06 | live model journey が provider／network／cold compile で flaky になり、共通契約の合否を不安定にする | High | Medium | deterministic conformance を blocking、live journey を capability 条件付き結線証拠に分離 | Quality | deterministic suite green、live 結果を別分類 |
| R-07 | rebase 後に前段の計測・停止契約が後続 worktree で失われる | Medium | High | Bolt 着地ごとに最新 base へ rebase し、同一 conformance を再実行 | Delivery | base SHA、rebase receipt、再検証結果 |
| R-08 | retry cap が child/session ID に結び付き、fresh session でリセットされる | Medium | High | Unit slug と durable state を retry identity にする | Core maintainer | session を跨ぐ retry 境界テスト |
| R-09 | telemetry に prompt／secret が混入する | Low | High | allowlist schema と redaction、本文非収集 | Compliance／DevSecOps | secret fixture 0件、schema review |

## Assumptions

| ID | Assumption | Validation point | If false |
|---|---|---|---|
| A-01 | state、audit、runtime graph は共有 schema の相関先として再利用できる | #1602 Reverse Engineering | 新しい記録面を作らず、既存面の不足を明示して再評価する |
| A-02 | 対象4 Issue の大半は共有 core または共有 contract に属し、harness 差は adapter へ隔離できる | Reverse Engineering | 写像不能な native semantics だけを例外候補として証拠化する |
| A-03 | Codex 一次 workload は後続 Bolt でも同条件で再実行できる | #1602 baseline | workload を固定できるまで性能比較を保留する |
| A-04 | package／promote 後の fresh-session resume で更新された hook／prompt を dogfood できる | #1602 完了境界 | version／投影 receipt を追加し、反映不能なら blocker 化する |
| A-05 | 現在の固定納期・金額予算はなく、品質境界を先に確定できる | Scope Definition | 期限が提示された場合は優先順位と Bolt 数を再評価する |

## Issues

| ID | Current issue | Evidence | Disposition |
|---|---|---|---|
| I-01 | Stop hook の進捗シグネチャが audit shard 行数を含み、非遷移イベントで連続回数をリセットし得る | #1998 cross-review、現行 source 観測 | #1998 Bolt で修正・回帰化 |
| I-02 | swarm に `cap-exhausted` の理由語彙はあるが、同一 Unit retry の数値 counter がない | 現行 source 観測 | #1919 Bolt で pool／counter を実装 |
| I-03 | 現時点で Codex workload の比較可能なベースラインと数値 NFR がない | intent-statement | #1602 Bolt で先行確定 |
| I-04 | Codex 専用 gate を正当化する再現可能な例外証拠がない | feasibility-questions、要件訂正 | 専用 gate を要件から除外済み |

## Dependencies

| ID | Dependency | Needed by | Readiness / control |
|---|---|---|---|
| D-01 | #1602 の共有 schema、取得不能 semantics、Codex baseline | #1998、#1999、#1919 の比較 | 最初の Bolt として直列化 |
| D-02 | #1998 の単調な停止 budget | 長い質問／review／swarm 実行の安全な dogfood | 2番目の Bolt、起票時再現を保持 |
| D-03 | #1999 の質問・review budget | 後続の対話・レビュー反復 | 3番目の Bolt、共通終了理由へ接続 |
| D-04 | #1919 の bounded Unit pool | swarm の最大資源・再試行保証 | 4番目の Bolt、前3 Bolt の観測を利用 |
| D-05 | package／dist／promote drift checks | 各 harness への波及 | 各 Bolt の配布境界で blocking 実行 |
| D-06 | GitHub Issue label と assignee の更新権限 | `in-progress` 運用 | 実着手時だけ変更、現在 #1602 済み |

## Decisions Recorded

1. 品質契約は共有 core の単一 conformance predicate とし、Codex 専用 gate は作らない。
2. harness 固有 test は adapter capability と native lifecycle の結線証拠であり、別ポリシーではない。
3. Codex は性能測定と dogfood の一次対象とし、全 harness の同率性能改善は要求しない。
4. 決定的ハード上限を停止性の主契約、意味論的収束判定を補助的な再計画情報とする。
5. 実装値は #1602 のベースライン後に NFR で確定する。
