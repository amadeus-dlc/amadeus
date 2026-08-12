# Risk & Sequencing Rationale — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: delivery-planning (2.8)

上流入力(consumes 全数): `unit-of-work-dependency.md`(技術的依存2エッジ+運用注記 — 順序の根拠)、`unit-of-work.md`(複雑度 — リスク重み)、`requirements.md`(Constraints の pinned-behavior 規律・#2683 境界)、`unit-of-work-story-map.md`(価値スライス順)、`components.md`(共有ファイル交差の判定)。

## 順序のリスク制御(intra-bolt / inter-bolt)

1. **Bolt 1 先行(walking skeleton)**: 正本の文言確定が全下流(pin・sweep)の前提 — 依存の根元を先に単独ゲートで通し、ユーザーが骨格の方向性を確認してから機械契約に投資する(dependency-first、scope-definition Q2 裁定)。
2. **Bolt 1 内の順序**: C1(protocol)→ C2(stage-protocol)→ C5(スキル)→ t415 暫定整合。t415 は正本編集と同一 Bolt 内で暫定整合させる — 正本だけ替えて CI 赤のまま PR を出す窓を作らない(pinned-behavior: 仕様裁定は要件で確定済み、テスト契約の改訂はセット)。
3. **Bolt 2/3 並行の安全性**: ファイル非交差(U2 = ts+tests / U3 = md+docs)を units-generation で確認済み。交差判定は着手前に対象ファイル目録の突き合わせで再実施(c6)。U3 の重い検証(隔離2回ビルド)は並行 fan-out 直後を避け最後に直列(fanout-load-settle-before-integration)。

## RAID(リスク・前提・課題・依存)

| 種別 | 項目 | 対応 |
|---|---|---|
| Risk | t415 改訂の対角実測が Bolt 2 まで完結しない間、Bolt 1 の暫定 pin が弱い保護になる | Bolt 1 の DoD に「暫定 pin でも旧 D6 文言の復活禁止は維持」を含める。Bolt 2 で完全化 |
| Risk | stage-protocol.md は共有正本 — 並行 intent と衝突しうる | PR 発行直前+マージ直前に origin/main 実測で再確認(shared-ledger-insert-collision)。base 前進時は base-advance-regrounding |
| Risk | tNNN 衝突(t530 予約) | PR 発行前・マージ直前に固定 base SHA の tests/ で再確認(c1-tnnn-collision-on-regrounding)。t528 二重の loose thread は本 intent 非所掌(RE 記録済み) |
| Risk | grilling マーカーの語彙が answer-evidence 述語と衝突 | ADR-2 で行非交差を設計済み+Bolt 2 の vacuity guard テストで固定 |
| Assumption | AskUserQuestion は≤4問/コール(ラウンド分割で吸収) | requirements Assumptions に記録済み — Bolt 1 の annex 写像記述が吸収 |
| Dependency | 上流ピン原文は #2785 本文に固定済み | 実装時に upstream 再取得しない(採用方針) |
| Issue | dogfood(FR-DOG-1)は B&T 段の受け入れ実走 | Bolt ではなく build-and-test 段の手順(scope-document 注記) |

## エスカレーション

- 逸脱(既存様式準拠と判断する場合も含む)は実装前停止 → 執行/選挙/ユーザーの分類(deviation-stop-before-implement / c1 系)。仕様変更級は常にユーザー(正準リスト(4))。
- Bolt 1 承認後のラダー: autonomy = none のため全 Bolt ゲート(org.md のラダープロンプトは autonomy 選択の場だが、本 intent は none 固定 — 選択の余地なくゲート)。
