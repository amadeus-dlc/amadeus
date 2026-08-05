# Delivery Planning: 順序決定の根拠

`delivery-planning-questions.md` の Q1 人間回答（walking-skeleton-first + risk-first hybrid）の根拠を記録する。WSJF 式の数値スコアリングは採用しない — Bolt 数が 6 と少なく依存 DAG（`inception/units-generation/unit-of-work-dependency.md`）が順序の大半を拘束するため、数値化のコストが判断改善に見合わない（Reinertsen の CD3 を定性適用: 遅延コスト = リスク前提の未検証期間、job size = unit 規模見積り）。

## ヒューリスティクの適用

1. **walking-skeleton-first（Bolt 1 = U1）**: `memory/project.md` の walking-skeleton 規範 — greenfield 要素（新 evidence store、新 plugin tools 群）を含む intent では最初の Bolt を小さな end-to-end スライスとし、人間ゲートで確認する。U1 は全 unit の基盤語彙（identity / evidence）の縦貫スライスであり、Cockburn の定義（全アーキテクチャ層を貫く最小スライス）を data plane について満たす。
2. **risk-first（バッチ 2 の構成）**: 未検証の最大リスク前提を早期に着地させる。
   - **U2**: ADR-6 の前提「§11a checkpoint は fail-closed の機械強制」が偽なら設計の再裁定が必要（application-design レビュー FOLLOW-UP-1）。最も早く知るべき情報。
   - **U6**: Issue #2161 の M7/M8 BLOCKER 候補（manifest 欠落）の恒久修復。独立 unit なので並行で最速着地でき、失敗時の露出期間を最小化する。
   - **U3**: 既存 TLC toolchain 再利用の成立性（外部依存 gated item の緩和検証を兼ねる）。
3. **value 実現（バッチ 3〜4）**: U4（登録）→ U5（E2E）は依存上も最後尾であり、価値の実証（M7 の一気通貫）が全リスク前提の解消後に来る。

## topological order からの逸脱

**なし。** 採用順序（U1 → {U2, U3, U6} → U4 → U5）は `unit-of-work-dependency.md` の DAG の妥当な topological order の 1 つであり、依存を破る逸脱はない。経済判断が効いたのは (a) U6 を最初のバッチでなくバッチ 2 に置いた点（walking skeleton の単独ゲートを乱さないため）、(b) 複数の妥当順序から risk-first で 1 つを選んだ点である。

## 主要リスク登録

| リスク | 影響 Bolt | 早期化の手当て |
|---|---|---|
| §11a checkpoint が prose 強制に留まる（ADR-6 前提の否定） | Bolt 2 | Bolt 2 冒頭の実読確認 + 否定時 halt-and-ask |
| model-map exactObject 制約が参照フィールドを拒否 | Bolt 5 | functional-design での実読確定（ADR-3 明示タスク）を Bolt 5 より前に実施 |
| CI 上の TLC 実行可否 | Bolt 3 / 6 | `external-dependency-map.md` の緩和策（ローカル TLC + 既存 workflow_dispatch 再利用） |
| composed runtime の missing import 再発 | Bolt 6 | Bolt 4（U6 guard）を先行させ一次担保を確立 |

## 上流トレーサビリティ

- `inception/units-generation/unit-of-work.md`（規模見積り）、`unit-of-work-dependency.md`（DAG）、`unit-of-work-story-map.md`（AC 対応）
- `inception/application-design/components.md`、`inception/requirements-analysis/requirements.md`
- `inception/delivery-planning/delivery-planning-questions.md`（Q1〜Q3）
- team-practices: `memory/project.md`（walking-skeleton 規範）、`memory/team.md`（parallel-bolts）。`stories.md` / mockups は SKIP により存在しない
