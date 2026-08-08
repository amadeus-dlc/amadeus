# Performance Design — u1-autonomy-core

上流入力(consumes 全数): business-logic-model.md(フロー1〜4 の処理構造)。nfr-requirements 系5成果物(performance/security/scalability/reliability-requirements・tech-stack-decisions)は self-feature スコープで nfr-requirements ステージ SKIP のため未生成(設計どおりの不在)— NFR の親は requirements.md の NFR-1〜5 を直接参照する。

## 性能設計

- 対象は短命 CLI プロセス(bun 起動 ~20ms)であり、常駐サービス向けの cache・水平スケーリングは適用しない(cid:nfr-design:c1 — 決定的 file 境界へ置換)
- **追加処理の性能予算**: refusal イベント emit は既存 audit append(ロック取得込み)1回分の追加のみ — 既存 `INTENT_AUTONOMY_TRANSACTION_COMMITTED` emit と同一機構で、per-gate 1回発生。preview の集合差計算は4要素配列の差 — 無視できる
- state 3フィールド書込は現状 `handleSetAutonomy` が行っている処理の**移設**であり総量不変
- 性能検証: 実時間待機でなく既存 `--ci` スイートの回帰(タイムアウト予算内)で足りる(bt-timeout-verification-shape)

## 予算の非対象

負荷試験・p95 計測は行わない — 承認済み NFR に性能数値目標が存在しないため(bt-proportional-selection: 戦略名だけで検査を機械追加しない)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T21:47:41Z
- **Iteration:** 1
- **Scope decision:** none

5成果物の上流一致・CLI 向け方針一貫・失敗様式4行が FD 原子性契約と1:1・fail-open は emit 限定・層別保証・認可意味論不変・file:line 整合を確認。指摘なし

### Findings

- None
