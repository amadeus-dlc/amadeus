# External Dependency Map — standing-delegation-grant

上流入力(consumes 全数): `../units-generation/unit-of-work.md`(単一 Unit standing-grant)、`../units-generation/unit-of-work-dependency.md`(edge block・bolt_dag 非 null 実測済み)、`../units-generation/unit-of-work-story-map.md`(FR トレース)、`../application-design/components.md`(C-1〜C-6)、`../requirements-analysis/requirements.md`(FR-1〜8)、`../practices-discovery/team-practices.md`(変更 0 件 — practices 制約なしの確認)

## 外部依存

なし — 新規 runtime dependency ゼロ(Forbidden 遵守)、ネットワーク・外部サービス接触なし(受理検証はローカル シャード読みのみ)。GitHub は PR/Issue 運用面のみ(機構自体は非依存)。

## 内部依存

- #671 委任承認 provenance(拡張元 — 白側 sweep 基準)
- E-SDG-IC C1(一時状態 fixture)・E-APG-CG13(golden/cherry-pick 教訓)のテスト設計適用
