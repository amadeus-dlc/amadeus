# 性能設計 — U8 docs-sync

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## PERF-U8-1: N/A(参照継承)

N/A — `performance-requirements.md` PERF-U8-1 の N/A(文書 Unit — 新規コード経路なし・常駐 service なし)を参照継承する。

## 検査面の設計(該当する唯一の実行)

`performance-requirements.md`「検査面」のとおり、U8 が実行するのは既存 docs 参照整合ゲート(t174 系 legacy-refs / 言語切替リンク検査 — `reliability-requirements.md` REL-U8-3)の再実行のみとする。設計上の確定事項:

- 新規検査・新規ツールを追加しない(`business-logic-model.md`「既存 docs 参照整合ゲートを実行し green を確認」の範囲に閉じる)。数値予算は不要(既存ゲートの範囲内)
- `security-requirements.md` SEC-U8-1 の記載コマンド実行確認は手動実行+出力転記であり、CI 時間へ影響しない。`scalability-requirements.md` SCALE-U8-1 のとおり更新対象は有界な文書集合で、実行時性能軸を持たない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:27:07Z
- **Iteration:** 1
- **Scope decision:** none

N/A 継承・転記手順・対訳機械照合・障害分離の実質を確認。Minor 1(logical-components ヘッダーの tech-stack-decisions 欠落)は是正済み。

### Findings

- [Minor] logical-components ヘッダー 6 点化 — 是正済み
