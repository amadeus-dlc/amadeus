# Performance Design — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1〜P-3)、`../nfr-requirements/security-requirements.md`(境界配置)、`../nfr-requirements/scalability-requirements.md`(N/A)、`../nfr-requirements/reliability-requirements.md`(RL-2)、`../nfr-requirements/tech-stack-decisions.md`(Bun spawn)、`../functional-design/business-logic-model.md`(ワークフロー2)。2026-07-17。

## 設計判断: 最適化機構を導入しない(YAGNI)

performance-requirements は構造契約(P-1〜P-3)のみで数値 SLO を持たない — 最適化の対象目標が存在しないため、以下をすべて**不導入**とする:

| 機構 | 判断 | 根拠 |
|---|---|---|
| キャッシュ | 不導入 | ToolNameMap は frozen リテラル(モジュールロード時1回構築)— キャッシュすべき再計算が存在しない |
| リソースプーリング | 不導入 | spawn は 1 CoreCall = 1 subprocess の単発(P-2)— プールする常駐リソースなし |
| async 並行化 | 不導入 | cursor 同型の直列 spawn(amadeus-cursor-lib.ts runAdapter の for ループ同型)。並行化は audit 行順序の非決定性を持ち込むだけで、数値目標がない以上利得ゼロ |
| 性能予算(budgets) | 不設定 | 実在する対照定数なし(constants-from-code)— 発明しない |

## 成立する性能設計(構造のみ)

- reconstruct 純関数はホットパスに I/O を持たない(P-3)— 設計上の配置で保証(lib 内に FS/network 呼び出しを置かない)
- イベント無発生時のフットプリントゼロ(P-2)— 常駐タスク・タイマー・ポーリングを設計に含めない
- 性能退行の検知は既存 CI の実行時間面(テストランナー予算)に委ね、plugin 固有の計測機構は追加しない
