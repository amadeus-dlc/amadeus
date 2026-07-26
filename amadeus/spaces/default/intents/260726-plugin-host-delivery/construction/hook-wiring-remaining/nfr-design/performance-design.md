# 性能設計 — U4 hook-wiring-remaining

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## PERF-U4-1 への設計: no-op 高速路(--if-stale 早期 return)

`performance-requirements.md` PERF-U4-1(起動レイテンシ非退行)の設計は、各面の HookInvocation を **`compose --if-stale` の 1 コマンド固定**にすることで、鮮度判定以外の処理をフック経路から排除する:

```
on session-start: bun <harnessDir>/tools/amadeus-plugin.ts compose --if-stale
  → composition record 鮮度読取(read-only 1 ファイル)
  → 最新なら適用処理へ到達せず早期 return(FR-3c-no-op)
```

- 高速路のコストは「bun 起動 + record 1 読取」に固定され、プラグイン内容・面数に依存しない。`business-logic-model.md` フロー 1 のとおりフック側には判定ロジックを置かず(`security-requirements.md` SEC-U4-1)、鮮度判定は engine 側(component-methods.md C1 の `--if-stale` 早期 return)の既存実装を使う — U4 が新たな性能経路を実装しない設計
- 検証設計: 到達検証は「適用処理の書込不発生 assert」(record/host bytes の前後 hash 一致)で行う。数値予算は build-and-test の起動時間実測で固定し、全対応面を実測対象に含める(BR-U4-6)

## PERF-U4-2 への設計: 冪等再 compose のコスト

`performance-requirements.md` PERF-U4-2 は PERF-U4-1 の帰結として設計を共有する — 2 回目の自動 compose は stale でない限り no-op 高速路を通り、合成の実処理時間が発生しない。検証は「2 回目実行の byte-identical + 追加処理時間が測定ノイズ内」の fixture テストで、`reliability-requirements.md` REL-U4-3 の実起動検証と同一テストに同乗させる(二重実装しない)。

## 非該当カテゴリ

N/A — `performance-requirements.md` 非該当カテゴリ(スループット / キャッシュ層)の N/A を参照継承(単発起動トリガー)。

## 他 NFR との整合

`scalability-requirements.md` SCALE-U4-1 の面数加算性により、面追加は高速路のコスト構造を変えない(面ごと独立の 1 コマンド起動)。`business-logic-model.md` フロー 2 の degrade 面はフック起動自体が無く、性能影響ゼロ。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:21:13Z
- **Iteration:** 1
- **Scope decision:** none

resolveFaceDisposition の 2 値判別 union が沈黙欠落を型で再発不能化。失敗時継続・呼出し点確認・要件 trace 1:1。Minor 2(tech-stack-decisions のボイラープレート気味参照、per-unit questions/memory の不在は intent 全体の一律事象)は記録のみ。

### Findings

- [Minor] tech-stack-decisions 参照が共通文言のみ — 次回様式で改善
- [Minor/情報] per-unit questions/memory 不在は construction 全体の一律事象 — conductor が diary へ記録
