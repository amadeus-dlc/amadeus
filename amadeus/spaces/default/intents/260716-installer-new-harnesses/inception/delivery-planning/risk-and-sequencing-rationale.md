# Risk and Sequencing Rationale — installer-new-harnesses(Issue #1048)

上流入力(consumes 全数): `../requirements-analysis/requirements.md`、`../user-stories/stories.md`、`../refined-mockups/mockups.md`、`../application-design/components.md`、`../units-generation/unit-of-work.md`、`../units-generation/unit-of-work-dependency.md`(依存 DAG: 単一 unit・エッジなし)、`../units-generation/unit-of-work-story-map.md`、`../practices-discovery/team-practices.md`。

## 順序決定

Bolt 1本のため経済的順序付け(WSJF / risk-first / value-first の比較)は非適用 — 選択肢が存在しない。2.7 の依存 DAG(1 unit / 1 batch、units-generation で compile 実測)からの逸脱もない(逸脱しようがない)。walking-skeleton-first は org 既定(feature スコープ)の適用であり、Bolt 1 = skeleton = 唯一の Bolt。

## リスクと前倒し対策(Bolt 内の実装順序で消化)

| リスク | 対策(実装順序への反映) |
|---|---|
| R-1: 列挙サイトの取りこぼし(「four known harnesses」等の文言残存) | C1〜C5 実装直後に same-root grep 全数棚卸しを実施(AC-1d) — Bolt 内の最初の検証点 |
| R-2: fixture へのエントリ追加漏れで偽 green | FR-3 テストを C1〜C5 と同時に書く(テスト先行圧) |
| R-3: 8ミラー regen 漏れ(dist:check / promote:self:check 赤) | C6 実装直後に両 check を即実行 — PR 直前まで遅らせない |
| R-4: patch gate の spawn 盲点 | push 前ローカル lcov 実測(local-lcov-pre-push)+必要なら in-process seam を実装時点で設計 |

## ヒューリスティック参照

単一 Bolt につき Cohn / Reinertsen CD3 / SAFe WSJF のいずれも発動せず(参照のみ)。適用したのは org 既定の walking-skeleton 規則と、Bolt 内リスク前倒し(risk-first の Bolt 内適用)である。
