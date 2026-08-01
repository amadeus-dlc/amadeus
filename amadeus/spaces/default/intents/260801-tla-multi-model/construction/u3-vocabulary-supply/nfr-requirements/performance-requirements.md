# Performance Requirements — u3-vocabulary-supply

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

上流入力(consumes 全数): business-logic-model(§2 語彙解決 / §3 toolchain 一般化 / §5 byte-pin / §7 不変性), business-rules(BR-V / BR-G / BR-B), requirements(NFR-1 / NFR-4, FR-4 / FR-6)

## 適用要件

本 Unit は内部 CLI/CI 検証ツールの語彙供給経路切替であり、レイテンシ目標やスループット SLA を新設する対象ではない。適用する性能要件は「一般化による回帰なし」の定量化のみ。

| # | 要件 | 測定可能な判定 | 由来 |
|---|---|---|---|
| PERF-1 | 語彙解決(`namedInvariantsFor` / `traceVocabularyFor`)は純粋関数でありファイル I/O を持たない。計算量は語彙サイズ n に対し **O(n)**(配列コピーとフィールド写しのみ) | I/O なしは BR-V2 の構造規則で保証。単体テスト(t404)で Result 型の同期返却を確認 | BR-V2, business-logic-model §2.2 |
| PERF-2 | byte-pin 照合の計算量は現行と同一(要求バイト列長に対し線形の `sameBytes` 1 回。選択は登録モデル数 m に対し O(m) の名前検索) | run-model-check-source 統合テストの実行時間が従来と同オーダー(同一ケース構成で顕著な増分なし) | BR-B1, business-logic-model §5.1 |
| PERF-3 | FormalElection 経路の loader 呼出回数・map パース回数は変更前後で増やさない(loadVerifiedTlaSources 1 回/呼出、語彙解決はその結果へのビュー) | business-logic-model §5.2 のフローどおり loader 呼出が 1 箇所であることをレビューで確認 | NFR-1, BR-V2 |
| PERF-4 | トレースラベル regex は語彙の moduleName から**呼出ごとに構築**してよいが、grammar 本体は不変であり、解析対象テキスト量は前後で同一 | tlc-output 既存テストが期待値不変で green(= 解析経路の入力・出力が不変) | BR-G2, business-logic-model §3.2 |

## 非適用とする領域(根拠)

- **レスポンスタイム/スループット目標の新設**: 対話 UI・常駐サービスを持たない短絡 CLI ツールチェーンであり、測定対象となる要求レートが存在しない(requirements.md Constraints、NFR-4)。
- **TLC 探索時間の予算**: MirrorLifecycle 完全探索の実測と CI 30 分 timeout との整合は u5 の AC2(実測証跡固定)が負う。u3 は語彙供給のみで TLC 実行時間に影響する変更を含まない(unit-of-work u3 所有ファイルに TLC 実行経路なし、business-logic-model §3.5)。
- **リソース上限(メモリ/CPU)**: 語彙は最大でも十数要素の文字列配列であり、メモリ footprint の変化は無視できる(§1.1/§1.2 の実測値)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T21:52:59Z
- **Iteration:** 1
- **Scope decision:** none

All 5 produces exist; PERF/SEC/REL measurable and trace to BR/NFR-1..4; N/A evidence-based; patch-coverage and fail-closed explicit. Findings: none.

### Findings

- None
