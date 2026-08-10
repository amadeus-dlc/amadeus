# Bolt Plan — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(Bolt 1 の受け入れ = FR-CBG-1〜16 全数)、components.md(Bolt が触るファイル目録)、unit-of-work.md(Unit 定義と LOC 見積りを Bolt へ 1:1 継承)、unit-of-work-dependency.md(depends_on: [] — バッチ構成は単一)、unit-of-work-story-map.md(Bolt 完了 = 全ジャーニー成立)

## Bolt 1: control-byte-gate(walking-skeleton・単独ゲート)

- **対象 Unit**: control-byte-gate(kind: service)— Unit 全体を単一 Bolt で配送(delivery-planning-questions.md Q1 裁定 single-bolt)
- **walking-skeleton**: self-feature スコープの Mandated により Bolt 1 に walking-skeleton gate を維持。本 Bolt は最小 end-to-end スライスであり同時に完全な配送物(ADR-1 で精緻化残余が空集合)
- **変更ファイル**: `tests/lib/control-byte.ts`(新規)/ `tests/control-byte-gate.ts`(新規)/ `.github/workflows/ci.yml`(ジョブ追加)/ `tests/unit/`・`tests/integration/` テスト(新規)
- **実装順序(Bolt 内 — リスク制御として明示)**: (1) 述語 TDD(Red→Green)→ (2) CLI TDD(seam 経由 in-process)→ (3) CI ジョブ配線 → (4) 偽陽性ゼロ sweep 実測(FR-CBG-10)→ (5) 落ちる実証(注入→赤→復元→残渣ゼロの不可分1セット — 最後に置くのは、注入時点でゲートが完成していないと赤の意味論が確定しないため)
- **worktree**: 実装は git worktree 分離で行う(solo-bolt-worktree-required)。PR は Bolt 単位1本、マージはユーザー承認後(no-AI-merge)
- **完了条件**: 全 FR 受け入れ + 既存 blocking 集合(typecheck / lint / run-tests --ci / coverage gates / complexity / source-only check)green

## バッチ構成

単一バッチ(batches: [[control-byte-gate]] — runtime-graph.json の bolt_dag と一致)。並行度の論点なし。
