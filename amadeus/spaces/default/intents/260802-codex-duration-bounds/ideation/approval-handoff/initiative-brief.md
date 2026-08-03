# Initiative Brief — Amadeus の長時間実行を統一的に有界化する

## Upstream Inputs

- `intent-statement`: 問題、対象者、成功指標、共有安全契約と Codex 一次性能評価の境界を正本として参照した。
- `scope-document`: S-01〜S-06、4 Must、1 Issue = 1 Bolt／PR、rebase と fresh-session の完了境界を参照した。
- `intent-backlog`: PB-01〜PB-06 の依存順、受入、handoff を参照した。
- `competitive-analysis`: Market Research が SKIP のため不在。市場競争の仮説を補完していない。
- `feasibility-assessment`: 条件付き GO、共有 core／adapter／live journey の三層検証を参照した。
- `constraint-register`: C-01〜C-14 の品質、配布、privacy、delivery 制約を参照した。
- `team-assessment`: Team Formation が SKIP のため不在。named team と schedule を捏造していない。
- `wireframes`: Rough Mockups が SKIP のため不在。UI は本 Intent の対象外である。

## Executive Recommendation

**条件付き GO — Inception へ進める。**

Codex で顕著に観測された長時間化を一次 workload で評価しつつ、計測、停止、対話予算、swarm 上限は全 supported harness に共通する安全契約として設計する。Codex 専用 blocking gate は設けない。例外は、Codex native lifecycle を共有 predicate へ写像できず、共通 conformance で欠陥を検出不能とする再現可能な証拠が得られた場合だけ再承認する。

進行条件は、#1602 で比較可能な baseline と取得不能 semantics を先に確立し、後続 Bolt が同一 workload と共通終了理由を再利用することである。具体的な上限値は baseline 前に固定しない。

## Intent and User Outcome

現在は、正常な長時間処理と停止性の欠陥を区別する共通証拠が不足し、利用者が待機・中止・修正を判断しにくい。完了後は次を可能にする。

1. stage・agent・tool・harness・model／version・duration・終了理由を相関して長時間化の由来を説明する。
2. 非遷移イベントで巻き戻らない単調な停止 budget により、異常実行を決定的に終端する。
3. 質問・follow-up・review を明示予算内で終端する。
4. swarm の同時実行数と同一 Unit retry を共有ハード上限内に収める。
5. 同じ不変条件を shared core、影響 adapter、全 distribution 投影で検証する。

## Scope and Delivery Sequence

4 Issue はすべて Must とし、価値と安全性の依存順で直列に届ける。

| Order | Issue / Bolt | Independent outcome |
|---|---|---|
| 1 | [#1602](https://github.com/amadeus-dlc/amadeus/issues/1602) | 共有 provenance／duration schema と Codex baseline |
| 2 | [#1998](https://github.com/amadeus-dlc/amadeus/issues/1998) | 非遷移イベントで回避できない単調な停止 budget |
| 3 | [#1999](https://github.com/amadeus-dlc/amadeus/issues/1999) | 質問・follow-up・review の明示予算 |
| 4 | [#1919](https://github.com/amadeus-dlc/amadeus/issues/1919) | 有界な Unit pool と durable retry count |

1 Issue = 1 Bolt = 1独立PRとする。各 Bolt の着地後、後続 worktree を最新 base へ rebase し、前段の計測・停止・予算改善を後段作業へ適用する。着手中 Issue だけに `in-progress` を付け、現在は #1602 のみ着手中である。

## Feasibility and Risk Posture

新たな常駐サービス、AWS account、データストア、外部製品は不要で、既存の Bun CLI、state、audit、runtime graph、package／promote 経路を使える。主な条件と緩和は次のとおり。

| Risk | Required mitigation |
|---|---|
| Codex の症状を専用安全契約へ誤変換する | 共有 predicate を正本にし、harness 差を adapter capability として扱う |
| audit 等の副次活動が停止回数をリセットする | stage 遷移と budget 消費を分離し、#1998 の回避再現を回帰化する |
| 取得不能 metadata を成功へ丸める | unavailable reason を schema 化し、adapter conformance を fail-closed にする |
| live journey が flaky になる | 決定的 conformance を blocking、live journey を capability 条件付き結線証拠にする |
| telemetry へ秘密情報が混入する | allowlist schema と redaction により prompt 本文、secret、credential を保存しない |
| rebase で前段契約が失われる | base SHA、rebase receipt、共有 conformance の再実行を各 Bolt の完了条件にする |

## Non-Applicable Ideation Inputs

- `competitive-analysis`: 内部 framework の停止性・可観測性改善であり、市場競争に基づく投資判断を行わない。
- `team-assessment`: Team Formation は SKIP。named mob、担当、Construction schedule は Units Generation／Delivery Planning 後に承認する。
- `wireframes`: UI を追加しない。ユーザー可視面は CLI の進捗、予算、終了理由、監査証拠である。

## Inception Handoff Contract

Inception では、次を一次ソースと検証可能な契約へ落とす。

1. core、harness overlay、生成物、既存テスト seam の実所有境界。
2. provenance schema、取得不能 semantics、相関 identity、privacy allowlist。
3. 単調 budget、質問／review budget、Unit pool／retry の状態機械と共通 termination reason。
4. shared core conformance、影響 adapter conformance、全 distribution drift、capability 条件付き live journey の責任分担。
5. #1602 baseline 取得後に確定する時間・反復・並列 NFR。
6. package／promote 後に park し、fresh Codex session で統合 workload を dogfood する検証計画。

## Go Conditions and Completion Boundary

Inception への承認は4 Boltの実装やマージを一括承認するものではない。各 Bolt は独立 PR と独立受入を持ち、ユーザーが順に判断する。Intent 完了には4 Bolt、統合 workload、全 distribution drift、影響 adapter conformance、package／promote、fresh-session outcome の全てを要する。
