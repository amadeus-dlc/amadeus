# Functional Design Questions: U4 registration-committer

## 回答方法

- モード: Guide me
- 質問予算: 最大1件。上流(`unit-of-work.md` の U4 定義、`unit-of-work-story-map.md` の FR-010/FR-013 主担当行、`requirements.md`、`components.md` §C6、`component-methods.md` §C6、`services.md` §S3、`decisions.md` ADR-3)で確定済みの事項 — 前提全数検査、temp + atomic rename、rename 直前再読込による concurrent-modification 拒否 — は再質問しない。ADR-3 が Functional Design の明示タスクとした「既存 exactObject 制約の実読確定 + schemaVersion 裁定」のみを諮る。

## 質問

### Q1. model-map への bundle 参照フィールド追加の schema 扱いをどう裁定するか？

実読結果(`plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts`): `exactObject`(:150)は key 集合の完全一致を要求し、`MODEL_KEY_SETS`(:214)は `name/model/cfg/entries` ± `auxiliaries` ± `vocabulary` の 4 集合のみ — bundle 参照フィールドは現行 validator に必ず拒否される。トップレベルは `exactObject(["models","schemaVersion"])` + `schemaVersion === 2` 固定(:348-352)。

- A. schemaVersion 2 のまま、`MODEL_KEY_SETS` へ optional `evidenceBundle` key を追加する — 既存 2 モデルのエントリ・既存 map は無変更で有効のまま(FR-013 / AC-008 保護)。変更は validator の key 集合拡張のみ(推奨)
- B. schemaVersion 3 へ bump する — 既存 map ファイルの書換えと全消費側の同期が必要で、既存互換(AC-008)への影響面が広い
- X. Other (please specify)

[Answer]: A. schemaVersion 2 のまま、`MODEL_KEY_SETS` へ optional `evidenceBundle` key を追加する(推奨)

- 人間承認: 2026-08-04T19:08:57Z

## 裁定の記録

- Q1 裁定: 案 A(v2 据え置き + optional key 追加)。既存 map・既存 2 モデルエントリはバイト不変のまま有効。validator の `MODEL_KEY_SETS` へ optional `evidenceBundle` を追加する変更のみ(exactObject の意味論自体は不変)。AC-008 の回帰テストで既存互換を守る。
- 曖昧さ分析: 単独の明確な選択で矛盾なし。追質問ラウンドは不要。
- イテレーション予算の追加裁定: reviewer 予算 2 回消費後の残余 3 件(BLOCKER 1 = BR-U4-10 文言整合 / FOLLOW-UP 2)について、閉包確認限定の追加イテレーション 1 回(iteration 3)を許可(E-LSSADS13 の分岐に基づく人間裁定)。人間承認: 2026-08-04T19:26:46Z

## 上流トレーサビリティ

- `inception/units-generation/unit-of-work.md`(U4 定義)、`unit-of-work-story-map.md`(FR-010/FR-013 主担当行)
- `inception/requirements-analysis/requirements.md`(FR-010、FR-013、AC-008)
- `inception/application-design/components.md` §C6、`component-methods.md` §C6、`services.md` §S3、`decisions.md` ADR-3
