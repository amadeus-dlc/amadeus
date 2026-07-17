# Component Dependency — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜6)、`../user-stories/stories.md`(US-1.1〜3.1)、codekb の architecture.md / component-inventory.md(RE 全数再検証済み台帳)、`../practices-discovery/team-practices.md`(既存実践)、components.md。

## 依存方向(全て既存 — 変更なし)

C1(domain/harness)← C2(engine-layout は HarnessName 型を消費)← modules(wizard/verifier/reporter)← cli。C4/C5(tests)→ C1〜C3 を消費。C6 は framework core 側で installer と独立(相互依存なし)。C7(docs)は全ての後段。

- 循環依存: なし(既存構造の保存 — harness.ts のコメント「must not depend on command.ts」の既存規律も不変)
- 実装順序: C1→C2→C3→C4→C5(installer 面、同一 PR)/ C6(core 面 — dist 8コピー regen を同 PR に含める)/ C7(docs、同一 PR)

## 循環・境界の検証

循環依存なし(既存規律の保存)。core(C6)⇔ installer(C1〜C5)は独立で、境界を跨ぐ新規依存を作らない。
