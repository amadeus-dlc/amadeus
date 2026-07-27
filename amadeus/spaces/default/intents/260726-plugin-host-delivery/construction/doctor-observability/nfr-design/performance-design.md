# 性能設計 — U5 doctor-observability

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## 純関数射影による追加コストの構造的上限

performance-requirements「読み取り専用・既存 doctor への軽微追加」の合否(純関数性の構造検証)を、`buildDoctorPluginSection(diag, record, judgment): DoctorPluginSection` の設計で担保する:

- **入力の閉包**: 3 引数(diagnosePlugins の実戻り値・composition record・U6 ActivationJudgment)以外を読まない。関数はポートを保持せず(fs / process / env への参照を持たない)、追加の走査・I/O・ハッシュ計算は構造的に発生しない。これは security-requirements の読み取り専用合否・reliability-requirements の射影のみ合否と同一の機構を性能面から見たもの — 保証は「純関数シグネチャ」という単一機構であり、呼出側(既存 doctor ハンドラ)の入力取得は既存経路の再利用に閉じる(層別: 純関数層 = ポート不保持 / handler 層 = 既存呼出の再利用のみ)
- **行整形の線形性**: 出力行数はプラグイン数+drops 数に線形(scalability-requirements の線形性)。集約・ソート等の超線形処理を持たない

## 数値予算(非固定 — 推定を基準化しない)

performance-requirements「数値予算の扱い」のとおり、doctor 実行時間の増分は「射影+行整形のみで体感不能な水準」という推定(算出根拠なしの目安)に留め、**受け入れ基準に用いない**。必要な場合のみ build-and-test の実測で確定する。本設計が固定する合否は純関数性の構造検証のみ。

## 常駐パターン非適用(N/A 継承)と 0-plugin 下限

performance-requirements「常駐 service 向けパターンの非適用」の **N/A を継承** する(cache / 水平スケール / circuit breaker を設計しない)。下限側は business-logic-model 分岐表の 0-plugin 行(`Plugins: 0 installed` 1 行縮退)が追加コストの下限を決定的に固定する(BR-U5-4 — scalability-requirements の下限境界と同一分岐の性能面)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:27:07Z
- **Iteration:** 1
- **Scope decision:** none

様式は満たすが、(C1) 未知状態 fail-closed の第 8 分岐に型スロットがない (M1) ND 射影表が FD 承認済み 7 行表を無申告で上書きし正本が二重化 (M2) BR-U5-7 の意味が上流 3 箇所で反転継承。

### Findings

- [Critical] 未知状態分岐の型スロット未定義(DoctorLine closed union)
- [Major] 分岐表の正本二重化(FD 7 行 vs ND 8 行)
- [Major] BR-U5-7 の意味反転継承(区別しない vs 区別する)

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:30:45Z
- **Iteration:** 2
- **Scope decision:** none

M1/M2 の閉包は 4 箇所で確認。C1 の残余 2 件(U5 側 domain-entities と logical-components の unknown 未反映)は機械検証可能クラス — 予算消費後につき conductor が E-LSSADS13 に従い是正+grep 機械検証(3 ファイル各 1 hit)で受理し record 固定(本 Review 節がその記録)。

### Findings

- [Critical→conductor 機械是正受理] U5 domain-entities の unknown 未反映 — 是正+grep 検証済み
- [Critical→conductor 機械是正受理] ND logical-components :14 の unknown 未反映 — 是正+grep 検証済み
