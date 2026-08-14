# Stakeholder Map — 260814-plugins-rename-drift

## 主要ステークホルダーと関心

| ステークホルダー | 役割 | 関心事 |
|---|---|---|
| ユーザー(j5ik2o) | 意思決定者 | 命名規約の一貫適用、手戻り事故の早期検知、PR マージの最終承認(人間専権)、仕様変更の裁定 |
| Amadeus プラグイン利用・拡張開発者 | 受益者 | 依存軸が読める命名、install/drop による機能 ON/OFF、設定機構の共通基盤 |
| フレームワーク利用開発者(worktree 並行作業者) | 受益者 | origin 進行の作業中警告、衝突見込みファイルの名指し提示 |
| 既存 workspace 運用者 | 影響を受ける | `plugin.activation.names` / `plugin.scope-bindings` の設定移行(特に scope-bindings は silent 退行リスク) |
| 将来の `github-*` 系プラグイン作者 | 潜在受益者 | env 宣言スキーマ(先行着地可否は設計段で裁定) |

## 意思決定者 vs 影響者

- **意思決定者**: ユーザー — PR マージ、仕様変更、milestone ゲート(phase 境界・intent 完了)、選挙の可否同数時の裁定。
- **半自律裁定**: semi autonomy の五段ラダー(`amadeus-bolt decide-question`)— phase 内ゲートとステージ内質問。fail-closed 結果のみ人間へ。
- **影響者(規範)**: memory ノルム(org/team/project)、両 Issue のクロスレビュー確定事項 — 再議しない既決事項として本 intent を拘束。

## コミュニケーション要件

- Issue #2996 / #2997: 着手時に `in-progress` ラベル付与済み(2026-08-14 実測)。クローズは PR MERGED + 着地面実読の後のみ。
- ミラー Issue #3022: engine の record → Issue 一方向同期に委ね、手動編集しない。
- PR: Bolt ごとに作成、日本語本文、コミットは英語。pr-convergence stage の収束ループを経て人間承認でスカッシュマージ。
- 工程記録: `amadeus/` ツリーをチェックポイントコミットで本線へ(自 intent の Bolt PR への同梱可)。
