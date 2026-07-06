# コード生成計画 — unit: evaluator-vocabulary

上流入力は functional-design（読み替えの正 = verbatim 5 ペア、WF1〜WF4）と requirements.md（R001〜R003、AC-1〜AC-3）。

## 実行ステップ

- [x] **Step 1（WF1、R001）**: team.md の verbatim ペア 1・2 を適用（判断基準行、検出境界節＋sensors 帰属の追記 1 文）。
- [x] **Step 2（WF2、R002）**: SKILL.md（source）の verbatim ペア 3・4 を適用 → `npm run test:it:amadeus-templates` で RED を確認・記録 → eval fixture（ペア 5）を更新 → GREEN 確認・記録 → `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` → `npm run test:it:promote-skill`。
- [x] **Step 3（WF3、R003/N001）**: repo 全体 `grep -ri evaluator` → 全ヒットの 3 分類判定表を code-summary に記録。分類 1 の追加ヒットは同方針で読み替え。
- [x] **Step 4（WF4）**: issue-disposition.md（#439 close 提案、PR レビューへの帰属精緻化の記録、Skill Contract role 改名要否は別議論）。
- [x] **Step 5**: `npm run test:all`、`AmadeusValidator . 260705-evaluator-vocabulary`。
- [x] **Step 6**: code-summary.md（変更一覧、RED/GREEN ログ抜粋、判定表、逸脱）。

## 制約

business-rules.md の変更禁止対象（sensors/validator 実装、Skill Contract、歴史的記録）に触れない。昇格先は promote 経由のみ。
