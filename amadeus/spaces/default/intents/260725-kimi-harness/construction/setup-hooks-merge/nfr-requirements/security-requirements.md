上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Security Requirements — setup-hooks-merge

> 上流入力の使用箇所: business-rules.md の BR-1〜BR-7、business-logic-model.md のマージ/除去フロー(planMerge の重複検出を含む)、requirements.md の FR-3/OC-1、technology-stack.md の既存インストーラ基盤を根拠とする。

## 脅威モデルと基準

- **ユーザー config の保護**: 書き込みは managed block マーカー内に限定し、ブロック外はバイト保持(business-rules.md BR-1)。managed block の重複検出(2組以上)と構文不正は business-logic-model.md §planMerge の規定どおり loud fail(business-rules.md BR-3/BR-5 と整合)
- **明示承認の境界**: plan report 差分表示 → wizard confirm → 拒否時は変更なし(requirements.md OC-1、BR-6)。無承認の自動書き込み経路を持たない
- **バックアップ**: 書込み前に必ず作成し、setup は削除しない(business-rules.md BR-4/BR-7)
- **秘密情報の非接触**: マージ対象は hook 配線のみで、credential 領域には触れない(設計意図)

## コンプライアンス

該当なし(requirements.md §制約に規制項目は存在しない)。
