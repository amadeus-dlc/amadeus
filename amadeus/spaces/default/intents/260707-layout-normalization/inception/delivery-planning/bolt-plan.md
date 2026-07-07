# Bolt Plan

## Upstream Trace

この plan は `requirements`, `components`, `unit-of-work`, `unit-of-work-dependency`, `unit-of-work-story-map`, `team-practices` を根拠とする。`unit-of-work-dependency` では U1 が U2/U3/U4 の依存元であり、U2/U3/U4 は互いに独立である。

## Bolt 1: Layout Decision Record

- Included units: U1 Layout Decision Record
- Walking skeleton: No。runtime architecture を通す作業ではなく、decision source of truth を作る作業である。
- Definition of Done:
  - Issue #610 に対応する ADR または同等の design record が repository に追加されている。
  - status quo, staged mixed layout, full workspace normalization, source root abstraction first を比較している。
  - root framework layout を維持し、`packages/setup` を sibling package として扱う推奨 decision が記録されている。
  - root `dist/` public install contract と manifest path contract 維持理由が記録されている。
- Confidence hypothesis:
  - 設計記録だけで Issue #610 の acceptance criteria の大半を説明でき、blind directory move を避けられる。
- Expected demo:
  - ADR/design record を読み、maintainer が migration/no-migration rationale と follow-up の境界を説明できる。

## Bolt 2: Documentation, Guard Validation, Follow-Up Preparation

- Included units: U2 Contributor Documentation Update, U3 Guard Validation Plan, U4 Follow-up Migration Preparation
- Walking skeleton: No。
- Definition of Done:
  - README/docs/contributing guide の必要箇所に、root framework zone と package-owned setup zone の違いが反映されている。
  - `dist:check`, `promote:self:check`, typecheck, lint, relevant tests の validation plan または実行結果が記録されている。
  - future full normalization に向けた source root abstraction / fixture abstraction / manifest seam の follow-up が必要なら記録されている。
  - `packages/setup` をこの intent の実装対象にしていない。
- Confidence hypothesis:
  - docs と validation plan が揃えば、Issue #610 は repository state と contributor mental model の両方で close 可能になる。
- Expected demo:
  - docs/design record から、なぜ root `core/` / `harness/` を維持するのか、どの guard が維持されるのかを説明できる。

## Construction Scope

Construction に進む場合の主目的は documentation/design artifact の追加・更新であり、directory move は含めない。コード変更が発生する場合も、validation helper や docs test の小変更に限定する。
