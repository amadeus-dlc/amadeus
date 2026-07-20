# External Dependencies — 260720-hold-choice-resolution

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md — 外部面の棚卸しは unit-of-work.md U1 と components.md の変更一覧(scripts/+SKILL 3面、dist 非投影)から、CI ゲート列は team-practices.md の Testing Posture から、非依存の反証は requirements.md の修正面宣言と unit-of-work-dependency.md / unit-of-work-story-map.md の境界・ジャーニー(外部アクターなし)から導出。

## 依存

| 依存 | 種別 | 状態 |
| --- | --- | --- |
| なし(新規外部サービス・新規ランタイム依存ゼロ) | — | 選挙 CLI は Bun 内蔵 API のみ(gh-scripts-boundary の範囲内、配布フレームワーク非接触) |
| 既存 CI(typecheck/lint/dist:check/promote:self:check/--ci) | 内部ゲート | scripts/ 変更は dist 非投影 — dist:check への影響なし(RE 実測)。SKILL.md 3面は .claude/.agents/contrib で dist/ 外 |
| GitHub(PR/CI) | 運用 | 通常フロー。マージはユーザー承認後 leader 執行 |

## N/A 根拠

インフラ・環境プロビジョニング・外部 SaaS: 対象なし(CLI ローカルツールの内側修正 — 反証: unit-of-work.md U1 の変更面列挙に外部面ゼロ)。
