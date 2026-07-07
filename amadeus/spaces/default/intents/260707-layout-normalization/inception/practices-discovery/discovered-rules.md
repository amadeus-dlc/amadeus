# 発見されたルール

## Mandated

- ALWAYS layout-normalization の判断では `code-structure`, `technology-stack`, `dependencies`, `code-quality-assessment`, `architecture`, `business-overview` の CodeKB 根拠を参照する。
- ALWAYS `dist/`、`.claude/`、`.codex/`、`.agents/` の path を変える案では `dist:check` と `promote:self:check` の維持方法を同じ成果物に書く。
- ALWAYS `packages/setup` は別 intent の sibling dependency として扱い、この intent の実装スコープに吸収しない。
- ALWAYS markdown artifact は日本語で書く。ただし path、CLI、コード識別子、tool が要求する heading は正確性を優先して保持する。

## Forbidden

- NEVER `dist/<harness>/` を layout 変更の近道として手編集しない。
- NEVER root `core/` / `harness/` の維持または移動を、ADR/設計記録なしに暗黙決定しない。
- NEVER `dist/` relocation を internal refactor として扱わない。README、docs、tests、self-promotion、CI への user-facing impact を棚卸しする。
- NEVER `packages/setup` の不在をローカル filesystem evidence として捏造しない。
