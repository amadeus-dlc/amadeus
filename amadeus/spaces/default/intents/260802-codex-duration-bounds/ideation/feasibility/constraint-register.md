# Constraint Register — 長時間実行の統一的な有界化

## Upstream Inputs

- `intent-statement`: 問題、対象顧客、成功指標、Bolt 順序の正本として参照した。
- `competitive-analysis`: Market Research が SKIP のため不在。競合由来の制約は登録していない。
- `market-trends`: Market Research が SKIP のため不在。市場仮説を制約へ変換していない。
- `build-vs-buy`: Market Research が SKIP のため不在。購入製品の前提を置いていない。

## Constraint Summary

| ID | Category | Constraint | Source | Verification | Impact if violated |
|---|---|---|---|---|---|
| C-01 | Architecture | 計測・停止・反復予算・並列上限の合否 predicate は共有 core を唯一の正本とする | intent-statement、ユーザー訂正 | core conformance の単一 predicate を確認 | harness ごとに安全性が分岐する |
| C-02 | Architecture | harness 差は native payload／lifecycle／driver の adapter capability として表現する | #1602、Feasibility 判断 | 取得値と取得不能状態の adapter test | 無証拠の成功または虚偽 telemetry |
| C-03 | Governance | 再現可能な例外証拠なしに Codex 専用の安全ポリシー／blocking gate を作らない | ユーザー訂正 | gate inventory と根拠リンクを検査 | 問題観測面と品質契約を混同する |
| C-04 | Measurement | stage・agent・tool・harness・model／version・duration・終了理由を相関可能にする | #1602 | state／audit／runtime graph の相関テスト | Bolt 間比較が成立しない |
| C-05 | Termination | 非遷移イベントで停止予算の累積を巻き戻せない | #1998 | 起票時回避再現と境界値テスト | 長時間実行が非終端化する |
| C-06 | Interaction | 質問・レビュー反復は明示予算内で終了し、共有終了理由を持つ | #1999 | 予算ちょうど／超過／再開のテスト | 会話反復が無制限化する |
| C-07 | Concurrency | swarm の同時実行数と同一 Unit 再試行数はハード上限を超えない | #1919 | pool と retry counter の境界値テスト | 資源・時間消費が予測不能になる |
| C-08 | Distribution | 正本は `packages/framework/core/` と `packages/framework/harness/<name>/`。生成物を直接編集しない | project rules | package／dist／promote drift checks | self-install と配布物が分裂する |
| C-09 | Delivery | 1 Issue = 1 Bolt、`#1602 → #1998 → #1999 → #1919`、各着地後に後続を rebase する | intent-statement | Bolt plan と base SHA receipt | 前段改善が後段へ波及しない |
| C-10 | Session | package／promote 後は park し、fresh Codex session で resume する | intent-statement | park／resume receipt と version 確認 | 更新 hook／prompt を dogfood できない |
| C-11 | Issue hygiene | 実着手中の Issue だけへ `in-progress` を付与し、完了時に除去する | ユーザー指示 | Issue label inventory | 着手状態が虚偽になる |
| C-12 | Privacy | telemetry に prompt 本文、secret、credential を含めない | Compliance 観点 | schema allowlist、redaction test | 機密情報が audit／CI へ流出する |
| C-13 | Test runtime | 長い本番 timeout を実時間待機で検証せず、短縮 seam と counter assertion を使う | project testing rule | 決定的な短時間回帰テスト | 改善検証自体が長時間化する |
| C-14 | Evidence | Issue 記述だけで core／harness 所有境界を断定せず、Reverse Engineering で一次ソースを確定する | #1998 cross-review refinement | observed SHA と患部 inventory | 誤った層へ修正を入れる |

## Hard Constraints

次は後続設計で変更できない。

- C-01、C-03、C-05、C-06、C-07: 統一された停止性と有界性の品質境界。
- C-08: framework 正本と生成物の編集境界。
- C-11: `in-progress` の実着手同期。
- C-12: 機密情報を計測へ含めないこと。

## Deferred Parameters

次の値は制約そのものではなく、#1602 の実測後に確定するパラメータである。

- stage／agent／tool ごとの時間目標と許容分位点。
- 同一 stage の停止 budget。
- 質問数、follow-up 数、review iteration の budget。
- swarm の最大同時実行数、同一 Unit の最大再試行数。
- live journey の timeout と対象 workload。

数値確定前でも、「上限が存在する」「累積が単調である」「終了理由が共通語彙で観測できる」という契約は確定できる。

## Constraint Ownership

| Owner | Owned constraints |
|---|---|
| Shared core | C-01、C-04〜C-07 |
| Harness adapters | C-02、C-08、C-10 |
| Product／Architecture | C-03、C-09、C-14 |
| Delivery／Issue owner | C-11 |
| Compliance／Quality | C-12、C-13 |
