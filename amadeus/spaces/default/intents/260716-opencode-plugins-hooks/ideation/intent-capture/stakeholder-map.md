# Stakeholder Map — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): Issue #1049 本文、#626 ADR-3、PR #1046 本文(前例)。

## ステークホルダー(#1048 と同型 — 領域アフィニティ継承)

| 役割 | 関心 | 本 intent での接点 |
|---|---|---|
| OpenCode 利用開発者(主) | hooks による audit 自動記録・statusline 等の補助機能が opencode でも効くこと | アダプタの直接受益者 — 現状は hooks なしで動作(ツール所有 emit が正) |
| フレームワーク保守メンバー | Cursor アダプタとの同型性(保守コスト一定)・偽グリーンの不在 | アダプタ設計の同型契約+文書化イベント限定配線の検証 |
| 運用者 | 機能単位表の正確性(未対応行の根拠) | docs 表の更新面 |
| ユーザー(プロジェクトオーナー) | スコープ規律(amadeus)・per-PR マージ承認 | ゲート・マージ判断 |

## 影響範囲

`packages/framework/harness/opencode/`(新規 hooks 表層)、`dist/opencode/`(regen)、docs 機能単位表。core への分岐追加なし(非目標)。
