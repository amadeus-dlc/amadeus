# Intent Statement — 260731-perf-ci-separation

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない。入力はユーザーの initiative 記述と intent-capture-questions.md の裁定)

## Problem Statement

PR blocking の ci.yml に実時間性能検証が同居しており、CI が構造的に遅く・不安定になっている。実測(2026-07-31、HEAD `da51af375`):

- `Tests` job の `test:ci`(smoke+unit+integration)に perf テストが同居: `tests/integration/t258-lifecycle-transaction.test.ts`(100-child ベンチ、120s 超級)、`t259-guard-corpus`、`t292-mirror-distribution-performance`、`t269-amadeus-mirror-contract-policy-performance` 等
- `coverage-head` / `coverage-base` job が同じスイートをさらに2回実行(t258 は PR 1本あたり計3回)
- `distribution-benchmark`(3 replicas)+ `distribution-benchmark-aggregate` が full PR ごとに毎回実行され、`distribution-required` ゲートで PR blocking
- Issue #1830: t258 が 120s timeout(経路A)と絶対 median 予算 500ms の機種差(経路B)の2経路で偽赤
- Issue #1835: 2026-07-30〜31 に timeout flake が4回発生し PR #1766 / #1801 / #1828 を阻害

性能契約はランナー機種(AMD EPYC 7763 vs INTEL XEON 8573C)と負荷に依存して合否が変わるため、PR blocking に置く限り偽赤で開発フローを止め続ける。

## Target Customer

- 本リポジトリの開発者(人間+AI エージェント): PR CI の偽赤による再実行・調査コストの解消
- leader/conductor 運用: マージ承認フローが flake で滞留しない

## Success Metrics

- `test:ci` / `coverage:ci` の実行対象から perf テストが除外され、PR CI から実時間ベンチ由来の偽赤経路が消える(#1830 経路A/B・#1835 の症状が PR blocking 面で構造的に発生不能になる)
- perf.yml が毎日1回の schedule + workflow_dispatch で稼働し、main 上の失敗が loud に可視化される
- PR あたりの CI 実行時間が短縮される(t258 級ベンチ3回分+distribution-benchmark 4 job 分の削減)
- coverage registry / patch gate の母集団が perf テスト除外後も整合(registry 再生成で drift ゼロ)

## Initiative Trigger

2026-07-30〜31 の timeout flake 4連発(#1835)と、同日の #1830 起票により「PR blocking CI に実時間ベンチが同居する構造」が根因と特定されたため。ユーザー提案(2026-07-31)「性能検証は ci.yml でやるべきではない。分離した perf.yml 的なもので定期的なトリガーでやりませんか」を受けた確定方針。

## Initial Scope Signal

self-feature(Amadeus 自己開発の新機能: perf tier の新設+perf.yml の新設+ci.yml の再構成)。

## 確定裁定(intent-capture-questions.md より)

1. **Q1=A**: perf.yml は毎日1回(夜間 schedule)+ workflow_dispatch 常時併設
2. **Q2=A**: distribution-benchmark 群(3 replicas + aggregate)も perf.yml へ移設し PR blocking から外す
3. **Q3=B**: main 上の schedule 失敗は loud 可視化のみ(自動 Issue 起票なし)
4. **Q4=C**: #1830 経路A(テスト全体の 120s timeout)の是正のみ本 intent に含める。絶対 median 予算の基準変更(経路B)は別 intent

## リスク早期表面化

- perf テストを coverage:ci から外すと coverage registry / patch gate の母集団が変化する — registry 再生成と gate 期待値の同期が必須(要 design 対象)
- distribution-benchmark を PR blocking から外すことで、性能退行の検知が最大24h 遅延する(Q1=A の受容済みトレードオフ)
- perf.yml 上でも #1830 経路B(絶対予算の機種差)は残存する — 本 intent のスコープ外と明示(Q4=C)
