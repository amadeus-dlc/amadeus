# 性能設計 — U2 walking-skeleton-claude

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## no-op 高速路の判定設計(composition record hash 照合)

performance-requirements「no-op 高速路」合否(apply 不到達の構造検証)を実装する判定は、business-logic-model フロー 2 の「最新」判定を次の決定的手順に具体化する:

1. `compose --if-stale` 入口で composition record を読む(record 不在 → stale 扱いでフロー 1 へ — fail-closed: 「読めないから最新とみなす」経路を作らない)
2. record が保持する対象プラグイン集合・内容ハッシュを `<harnessDir>/plugins/` の実在物と照合する(既存 record の revision / ハッシュ機構の再利用 — 新判定アルゴリズムを発明しない)
3. 一致 → `PluginCliResult{noop}` を返して早期 return。**discoverPlugins より先のどの mutation 段(inspectPlugin / planPluginComposition / applyPluginPlan / 再 compile)にも到達しない**
4. 不一致 → フロー 1 と同一経路

- 判定の入力はファイル内容のみ(時刻・環境変数に依存しない)。security-requirements の fail-closed CLI と同じ「入口で確定してから本体へ進む」構造であり、判定自体が書込を持たない(reliability-requirements のアトミック性設計と干渉しない)

## 到達不発の検証設計(数値予算に依存しない構造検証)

performance-requirements の合否(到達カウンタまたは書込不発生の assert)は、in-process seam で検証する:

- `handlePluginCli(argv, deps)` の `deps` に engine 関数群を注入する構造(seam-export-handler-amend)を利用し、テストは applyPluginPlan 相当の deps に到達カウンタを仕込んで **呼出回数 0** を assert する
- 併せて実 FS 面では、record 最新状態で compose 実行前後の host bytes が byte-identical であること(書込不発生)を assert する(scalability-requirements の冪等合否と同一の比較基盤を共有)

## 数値予算(build-and-test へ委譲)

performance-requirements「数値予算の扱い」のとおり、no-op 経路の ms 予算は本設計で固定しない(「数百 ms」は目安であり受け入れ基準にしない)。設計が保証するのは上記の構造的性質(apply 不到達・書込ゼロ)のみで、NFR-2 の数値は build-and-test の実測で固定する。手動 compose の実行時間は performance-requirements「手動床の性能」の **N/A を継承** する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:21:13Z
- **Iteration:** 1
- **Scope decision:** none

security/performance 設計は要件・BR と整合し数値委譲も維持。Major 1: logical-components がステージ必須内容(failure domains / blast radius / isolation / shared resources)を欠き、実装モジュール表への無申告すり替え。

### Findings

- [Major] logical-components.md がステージ定義の必須内容を欠く(無申告のすり替え)— 全 unit への系統是正を要する

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:27:07Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 Major(logical-components の必須内容欠落)は障害分離節(4 領域・blast radius・所有)で閉包。U5/U6 の所有主張とも矛盾なし。

### Findings

- None
