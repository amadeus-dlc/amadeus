# Scope Document — インストーラの実装(installer-distribution)

> ステージ: scope-definition (Ideation) / 作成: 2026-07-08 / モード: Grilling(4問+フォローアップ1問、全問回答済み)
> 上流入力: `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`

## スコープ境界(IN)

初回リリースに含める(出典: Q1、Q4-f):

| ケイパビリティ | 内容 |
|----------------|------|
| `install`(新規導入) | GitHub からタグ指定で配布物を取得し、選択したハーネス(claude / codex / kiro / kiro-ide)を導入先プロジェクトへ展開。**コマンド名は `init` ではなく `install`(Q1 でユーザー是正)** |
| `upgrade`(更新) | 導入済みプロジェクトを新しいバージョンへ更新。非破壊マージ(`amadeus-*` のみ更新)+ 適用前のファイルレベル差分レポート(追加/更新/スキップ一覧) |
| 対話式ウィザード | ハーネス選択・確認プロンプト付きの対話フロー |
| 非対話フラグ | CI・スクリプト用に引数指定のみで完結する経路 |
| `--force` | 非破壊マージのデフォルトを明示的に上書きする逃げ道 |
| npm 公開 | `@amadeus-dlc/setup`、bin 名 `amadeus-setup`、npx/bunx 両対応(ビルド公開)。既存不整合の是正(license / repository URL — feasibility I1/I2)を含む |

### CLI 文法(Q4/Q4-f)

**両方とも明示サブコマンド**とする完全対称な文法を採用する:

- `bunx @amadeus-dlc/setup install` — 新規導入
- `bunx @amadeus-dlc/setup upgrade` — 更新
- `bunx @amadeus-dlc/setup`(サブコマンドなし)— ヘルプ表示。暗黙に破壊的になりうる操作は走らせない

非対称な文法(サブコマンドなし = install、upgrade のみ明示)は「MECE でない」としてユーザーが否認(Q4)。状態自動判定の単一コマンド案も暗黙挙動のリスクから不採用(Q4-f)。

## スコープ境界(OUT)

初回リリースから除外(出典: Q2 — 7項目すべて除外に合意):

1. 組織一括展開(複数プロジェクト同時インストール)
2. オフラインインストール(dist 同梱)
3. ロールバック(更新前スナップショット復元)
4. 既存手動導入の自動検出・マイグレーション専用ロジック
5. npm provenance / CI 自動公開
6. `doctor` サブコマンド(既存 `/amadeus --doctor` と重複)
7. 内容差分(diff 表示 — ファイルレベル一覧で価値の大半を実現)

除外項目はいずれも将来の拡張候補として intent-backlog の Won't(今回)に記録する。

## 順序付け方針

**依存優先**(出典: Q3): 共通基盤(取得・マニフェスト・ファイル操作)→ `install` → `upgrade` → npm パッケージング → ドキュメント。walking skeleton の慣行(team.md: 最小の `@amadeus-dlc/setup` 実行経路を最初に通す)に従い、最初の縦方向スライスで「取得 → 展開 → 検証」を通すことでリスク(非破壊マージ・差分レポート、feasibility R4)の検証と両立させる。

## 最小限の価値(MVS)

「新規プロジェクトが `bunx @amadeus-dlc/setup install` の1コマンドで、選んだハーネスの Amadeus 一式を1分以内に導入できる」— これが成立した時点で成功指標1・2(intent-statement)が満たされ、`upgrade` の追加で指標3が満たされる。
