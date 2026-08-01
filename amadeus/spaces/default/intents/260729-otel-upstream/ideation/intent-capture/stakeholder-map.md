# Stakeholder Map — OTel Upstream 統合

## ステークホルダーと関心

| ステークホルダー | 種別 | 関心・影響 |
|---|---|---|
| Intent オーナー（j5ik2o） | 決定者 | 全ゲートの承認者。設計レビューと Phase 1 hard gate の最終判断を持つ |
| Amadeus 保守者（この repo の開発者） | 影響を受ける＋実行者 | audit 基盤の置換と二重系統解消の受益者。約1600 call site の移行実装を担う |
| Amadeus を使う開発チーム | 影響を受ける | 可観測性向上の受益者。移行期間中の audit Journal 形式変更（schema v2、mixed shard）の影響を受ける |
| AI-DLC harness 配布先（claude/codex/cursor/kimi 等） | 影響を受ける | Provider／Exporter／Relay が全 harness 生成面へ同期される必要がある（distribution drift guards の対象） |

## 決定者と影響者の区別

- **決定者**: Intent オーナーのみ（solo 運用）。Phase 1 の合格／撤回判断、公開互換方針（Phase 4 ADR）、削除ゲート通過の判定はすべてオーナーのゲート承認を経る
- **影響者**: 保守者・利用チーム・harness 配布先は決定権を持たないが、移行戦略（reader-first、mixed schema merge、retention 条件）で影響を明示的に管理する

## コミュニケーション要件

- **設計の正本**: GitHub Issue #1672（レビュー履歴を含む）。Intent の成果物は Issue を引用し、設計判断の重複記述を避ける
- **進捗の可視性**: ワークフロー位置は `/amadeus --status` と audit Journal で追跡可能。Phase 境界ごとにゲート承認を挟む
- **撤回時の記録**: Phase 1 不合格の場合、判定根拠（ADR・性能測定・不合格条件のどれに抵触したか）を Intent レコードへ残し、#1628 への差し戻し理由を Issue へ共有する
