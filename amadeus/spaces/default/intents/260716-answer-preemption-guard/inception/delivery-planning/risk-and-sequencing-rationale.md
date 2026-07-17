# Risk & Sequencing Rationale — answer-preemption-guard

上流入力(consumes 全数): `../units-generation/unit-of-work.md`(単一 Unit)、`../units-generation/unit-of-work-dependency.md`(yaml edge)、`../units-generation/unit-of-work-story-map.md`、`../application-design/decisions.md`(ADR-1〜5)、`../requirements-analysis/requirements.md`(FR-1〜7)、`../application-design/components.md`(C-1〜C-5 目録)、`../practices-discovery/team-practices.md`(変更 0 件判定)。

## シーケンス根拠

単一 Bolt のため順序問題なし。実装内の順序: C-3(cutoff canonical)→ C-1/C-2(sensor 本体)→ C-4(宣言)→ C-5(テスト)→ regen — C-3 を先にするのは C-1 が定数 import に依存するため。

## リスク(initiative-brief から更新)

| リスク | 状態 |
|--------|------|
| corpus false-red | cutoff 設計確定(ADR-3)— AC-4b sweep で実証予定 |
| cutoff 複製 drift | ADR-3 canonical 化で解消予定 |
| frontmatter diff 肥大 | E-APG-AD-DEV 裁定で 32 stage 確定(+32行、機械的)|
| 他 intent との交差 | 設計時非交差 — PR 時に実 diff 再評価(c6) |
