# Performance Design — u3-vocabulary-supply

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

上流入力(consumes 全数): performance-requirements(PERF-1〜4), security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions(TS-1 / TS-2), business-logic-model(§2.2 純粋関数 / §3.2 regex 構築 / §5 byte-pin / §9.2)

## 設計方針

本 Unit は短絡 CLI/CI 検証ツールの語彙供給経路切替であり、性能予算・キャッシュ・非同期化の新設対象ではない(performance-requirements「非適用とする領域」)。設計は **「一般化による回帰なし」を構造的に保証する** ことに限定し、functional-design が既に規定した機構をそのまま採用する。新しい性能機構は導入しない(tech-stack-decisions TS-2: キャッシュ機構却下済み)。

## NFR → 機構 → 検証の写像

| NFR | 設計機構(functional-design 既定) | 検証方法(証明するテスト/AC) |
|---|---|---|
| PERF-1(語彙解決 O(n)、I/O なし) | `namedInvariantsFor` / `traceVocabularyFor` は `ModelMapModel` を受け取る**純粋関数**とし、配列コピーとフィールド写しのみで構成する(business-logic-model §2.2)。ファイル I/O・loader 呼出を持たない。`TraceVocabulary.moduleName` は `model.name` の写しで追加計算なし | t404: Result 型の同期返却確認 + vocabulary 省略 red ケース(u3 AC2)。import 関係レビュー(toolchain/arm が map を直接読まない構造規則) |
| PERF-2(byte-pin 照合は現行と同一計算量) | `bindRequestedModel` は「選択 O(m) の名前検索(selectVerifiedModel) + 要求バイト列長に線形の `sameBytes` 1 回」のみ。照合 semantics・読込経路(現行 :109-121 流用)を変えない(business-logic-model §5.1) | run-model-check-source 統合テスト: 同一ケース構成で実行時間に顕著な増分がないこと + 誤バイト注入で SOURCE_DRIFT 赤(照合が空洞化していない実証、u3 AC3) |
| PERF-3(loader 呼出・map パース回数を増やさない) | 語彙解決は `loadVerifiedTlaSources()` の結果に対する**ビュー**とし、loader 呼出は 1 回/呼出のまま。`namedInvariantsFor` と `traceVocabularyFor` は同一 `model.vocabulary` を読む 2 ビューで、再パース・再読込の経路を作らない(business-logic-model §2.2 / §2.3 / §5.2) | business-logic-model §5.2 フローどおり loader 呼出が 1 箇所(`loadRunModelCheckSource` 先頭)であることのレビュー + t404 grep ガード(直接読込経路なし) |
| PERF-4(regex は呼出ごと構築可、解析対象テキスト量不変) | トレースラベル regex は `traceLabelPattern(moduleName)` として呼出ごとに構築するが、grammar 本体(アクション名部・行/桁 span)は一字不変。`escapeRegExp` は文字列長に線形の置換 1 回のみ(business-logic-model §3.2)。TLC 出力の解析走査規則には触れない | t-formal-verif-tlc-output 既存テスト全件が期待値不変で green(= 解析経路の入出力不変、u3 AC1 の裏付け) |

## 採用しない機構(却下記録)

- **語彙解決のキャッシュ**: 純粋関数かつ十数要素の配列処理(PERF-1)で性能動機なし(tech-stack-decisions TS-2 の却下選択肢どおり)。
- **正規表現のプリコンパイル/定数化**: モデルごとの moduleName 埋込みが必要なため定数化は設計と矛盾。呼出ごと構築のコストは無視できる(PERF-4 が許容)。

## 下流(code-generation)が侵してはいけないこと

- 語彙解決関数に I/O・loader 呼出・グローバル状態を持ち込まない(PERF-1 / PERF-3 の構造保証)。
- byte-pin 照合を複数回化・全モデル分の事前読込化しない(PERF-2 / PERF-3)。
- ラベル regex 構築以外の解析走査(ライフサイクル検証・統計 payload・反例ヘッダ grammar)に手を入れない(PERF-4、business-logic-model §7)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T22:06:14Z
- **Iteration:** 1
- **Scope decision:** none

All 5 produces exist; every applicable NFR maps to existing functional-design mechanisms with named verification; N/A evidence-based; no invented mechanisms. Findings: none.

### Findings

- None
