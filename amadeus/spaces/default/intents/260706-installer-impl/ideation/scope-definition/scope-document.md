# Scope Document — インストーラの実装

> ステージ: scope-definition (Ideation) / 作成: 2026-07-07 / モード: Grilling(5問、全問回答済み)
> 上流入力: `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`

## スコープ境界(IN)

初回リリースに含める(出典: Q1、Q2):

| ケイパビリティ | 内容 |
|----------------|------|
| `init`(新規導入) | GitHub からタグ指定で配布物を取得し、選択したハーネス(claude / codex / kiro / kiro-ide)を導入先プロジェクトへ展開 |
| `upgrade`(更新) | 導入済みプロジェクトを新しいバージョンへ更新。非破壊マージ(`amadeus-*` のみ更新)+ 適用前のファイルレベル差分レポート(追加/更新/スキップ一覧) |
| 対話式ウィザード | ハーネス選択・確認プロンプト付きの対話フロー |
| 非対話フラグ | CI・スクリプト用に引数指定のみで完結する経路 |
| `--force` | 非破壊マージのデフォルトを明示的に上書きする逃げ道 |
| npm 公開 | `@amadeus-dlc/setup`、bin 名 `amadeus-setup`、npx/bunx 両対応(ビルド公開)。既存不整合の是正(license / repository URL)を含む |

## スコープ境界(OUT)

初回リリースから除外(出典: Q3 — 5項目すべて除外に合意):

1. 組織一括展開(複数プロジェクト同時インストール)
2. オフラインインストール(dist 同梱)
3. ロールバック(更新前スナップショット復元)
4. 既存手動導入の自動検出・マイグレーション専用ロジック
5. npm provenance / CI 自動公開

除外項目はいずれも将来の拡張候補として intent-backlog の Won't(今回)に記録する。

## 順序付け方針

**依存優先**(出典: Q4): 共通基盤(取得・マニフェスト・ファイル操作)→ `init` → `upgrade`。walking skeleton の慣行に従い、最初の縦方向スライスで「取得 → 展開 → 検証」を通すことでリスク(非破壊マージ・差分レポート、feasibility R4)の検証と両立させる。

## 最小限の価値(MVS)

「新規プロジェクトが `bunx @amadeus-dlc/setup` の1コマンドで、選んだハーネスの Amadeus 一式を1分以内に導入できる」— これが成立した時点で成功指標1・2(intent-statement)が満たされ、`upgrade` の追加で指標3が満たされる。
