# 性能設計 — U7 conformance-suite

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## PERF-U7-1 への設計: CI 時間増分の計測手順

`performance-requirements.md` PERF-U7-1(BR-U7-6)の計測を、次の決定的手順として設計する:

```
編入前: bash tests/run-tests.sh --ci を 3 回実行し wall-clock を記録(コマンド出力転記)
編入後: 同一マシン・同一コマンドで 3 回実行し記録
増分  = 中央値の差。計測コマンド・生値・算出式を成果物へ併記(derived-value-shows-formula)
```

- 数値の固定は build-and-test で行い、本設計では**手順のみ**を確定する(未実測の推定を基準化しない)。増分抑制の構造は層別(下記)が担う
- 二重実装の回避(PERF-U7-1 第 2 合否): per-harness 層のテストは U2-U6 の BR 検証テストと共有し、追跡表(`reliability-requirements.md` REL-U7-1 の様式 — reliability-design.md)の covered-existing 行がフルパス参照する。共有により CI へ追加されるのは新規 adopted 分のみ

## PERF-U7-2 への設計: 計測範囲の層別確定

`performance-requirements.md` PERF-U7-2 のとおり、CI 時間計測の対象層を `--ci` 対象(smoke/unit/integration)に確定する。`business-logic-model.md` フロー 2 の per-harness native hook 実起動テストは e2e 層に置き(technology-stack 実測: e2e は `--ci` 非対象)、日常 CI 増分の対象外である旨を追跡表ヘッダへ記録する — 計測範囲と層配置を同一ファイルで宣言し、範囲のすり替えを検分可能にする。

## 非該当カテゴリ

N/A — `performance-requirements.md` 非該当カテゴリ(レイテンシ SLO / 負荷試験)の N/A を参照継承(テストスイート — 常駐 service なし)。

## 他 NFR との整合

`scalability-requirements.md` SCALE-U7-1 の層別(compose-semantics 1 回実行)が CI 増分の上界を面数非依存に保つ。`security-requirements.md` SEC-U7-1 の scratch 分離は fixture 準備コストを増やすが、in-process 様式(既存 t252/t253 踏襲)により spawn コストを避ける。`reliability-requirements.md` REL-U7-2 のレポート導出はテスト実行の exit code 再利用で、追加実行を発生させない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:27:07Z
- **Iteration:** 1
- **Scope decision:** none

追跡表様式・二重隔離・fail-closed 写像・障害分離の実質を確認。Minor 2(logical-components ヘッダー 6 点化、伝播注記の誤読余地)は指摘直後に是正済み。

### Findings

- [Minor] logical-components ヘッダーへ tech-stack-decisions 追記 — 是正済み
- [Minor] 伝播注記を先取り適用の明示文へ言い換え — 是正済み
