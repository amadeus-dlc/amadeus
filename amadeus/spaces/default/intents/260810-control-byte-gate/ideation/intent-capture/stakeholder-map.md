# Stakeholder Map — 制御バイト検出ゲート(Issue #2814)

## 主要ステークホルダーと関心事

| ステークホルダー | 関心事 |
|---|---|
| リポジトリオーナー(ユーザー) | #786 クラスの再発封鎖。PR マージ承認・walking-skeleton ゲート等の人間専権の保存 |
| 全コミッター(人間・エージェント) | 混入の PR 段検出。偽陽性ゼロ(正当な作業を赤にしない) |
| 検証規律の運用(grep ベースの全数列挙・不在主張・棚卸し) | 偽陰性連鎖の根元遮断 — 本ゲートの最大の受益面 |
| CI パイプライン | blocking ゲート追加による実行時間・起動条件(detect-ci-changes 分岐)への影響 |
| 既存の走査系ゲート群(no-silent-drop / unchecked-cast 等) | 走査対象規定の先例整合(`cid:feasibility:c2-2`)と、`t55-test-suite-drift` の NUL skip 穴との関係 |

## 意思決定者と影響者

- **意思決定者**: ユーザー(PR マージ承認、仕様変更、walking-skeleton ゲート — autonomy full の prohibitedEffects: irreversible / scope-out 等は人間専権のまま)
- **執行**: conductor(autonomy full グラント下でステージゲート・質問裁定を engine の梯子で自動解決)
- **影響者**: クロスレビュー2名の verdict(要件段の一次入力として固定済み)

## コミュニケーション要件

- Intent record を正本とし、ミラー Issue #2821 が概要を一方向同期
- Bolt 単位で PR を発行し、マージはユーザー承認後に実行(no-AI-merge)
- ブロック時(人間専権事項)は park してユーザー入力を待つ
