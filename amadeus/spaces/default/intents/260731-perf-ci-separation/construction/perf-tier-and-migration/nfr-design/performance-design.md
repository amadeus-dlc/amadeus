# Performance Design — U1 perf-tier-and-migration

上流入力(consumes 全数): business-logic-model.md(U1 FD)。nfr-requirements 5成果物は本 scope(self-feature)で同ステージ SKIP のため設計上不存在(engine の consumes_absent expected:true)— fallback として requirements.md の NFR 節と #1830/#1835 実測を一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 性能目標(決定的・CLI 姿勢)

- business-logic-model.md ロジック1 の tier 選択は起動時の argv parse と readdir のみ — perf tier 追加による `--ci` 実行時間への影響はゼロ(実行集合が縮小する方向のみ)
- NFR-1 決定的層: `--ci` 実行集合からの perf 除外を runner 出力で機械照合(偽装不能)。非退行層: tests job wall-clock の前後比較は U4 で実測記録
- t258 timeout 250_000 は分布導出(business-logic-model.md ロジック3)— 性能「目標」ではなく偽赤防止の上限。実性能の退行検知は median 予算(500/750ms、不変)が担う

## 非採用(cid:nfr-design:c1)

キャッシュ・水平スケーリング・circuit breaker は CLI ランナーに不適用 — 決定的なファイル境界(tests/perf/ ディレクトリ)と fail-closed 契約(coverage 3 gate)で代替する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T11:30:49Z
- **Iteration:** 1
- **Scope decision:** none

全5成果物が CLI 姿勢(c1)を実質で満たし、SKIP された nfr-requirements の不在扱いが engine 意味論どおり。business-logic-model の実引用・250_000 導出・coverage 3 gate・移設禁止ピンの spot-check 全て上流と一致。検証劇場言語なし。READY。

### Findings

- None
