# Project-Level Rules

> プロジェクト固有の上書きと是正事項。team.md と org.md を上書きする。practices-discovery と自己学習ループによって記入される。
>
> 控えめに使うこと: 多くのチームにはプロジェクト層は不要。このプロジェクトだけがチーム全体のプラクティスから安定的・恒久的に逸脱する場合にのみ使う(例:「このモノレポはチームのデフォルトがスカッシュでもリベースする」「このレガシープロジェクトは既存スイートが救済不能なためテスト下限を免除し、それを受け入れている」)。

## Way of Working

<!-- プロジェクト固有の上書き。例: -->
<!-- このモノレポはスカッシュマージではなくリベースする。パッケージ単位のコミット履歴が部分ロールバック判断の監査証跡だから。この上書きはこのプロジェクトにのみ適用される。 -->

## Walking Skeleton

<!-- プロジェクト固有の上書き。例: -->
<!-- このプロジェクトは walking skeleton をスキップする。既存サービスのインプレース書き換えであり、ゲートすべきグリーンフィールドのブートストラップが存在しないため。 -->

## Testing Posture

<!-- プロジェクト固有の上書き。 -->

## Deployment

<!-- プロジェクト固有の上書き。 -->

## Code Style

<!-- プロジェクト固有の上書き。 -->

## Tech Stack

- ランタイム / パッケージマネージャ: Bun(TypeScript、ESM)。フレームワークの hooks / tools はすべて bun で直接実行する
- 言語: TypeScript(typescript ^6、`tsc --noEmit` で型検査)
- リンター: Biome 2.4系(フォーマッタ無効)
- テスト: bun test ベースの自作ランナー `tests/run-tests.sh`(smoke / unit / integration / e2e の4層)
- 主要開発依存: @anthropic-ai/claude-agent-sdk、node-pty、@xterm/headless(e2e のターミナル駆動用)
- 構成: `core/`(ハーネス中立のソースオブトゥルース)、`harness/<name>/`(ハーネス別表層)、`scripts/package.ts`(ビルド)、`dist/<harness>/`(生成・コミット・ドリフトガード対象)、`docs/`

## Decided

- DECIDED: 新しい `/amadeus --*` ユーティリティハンドラを実装する前に `docs/reference/11-contributing.md` の「Adding a Utility Handler」チェックリストに従う
- DECIDED: 2つのPRが `amadeus-version.ts` を同一パッチ番号にバンプして衝突した場合、後からマージする側がリベースして再バンプし(例 `0.6.5` → `0.6.6`)、CHANGELOG の見出しも合わせて改名する

## Scope Overrides

<!-- このプロジェクト用のカスタムスコープルール。 -->

## Forbidden

- NEVER CHANGELOG にリポジトリホストを埋め込むバージョンリンク参照(`[N.N.N]:` 形式)を復活させない — v0.6.9 で削除済み、t68 が再出現をガードする

## Mandated

- ALWAYS ユーザー可視の変更を含むPRは、同一コミットで `core/tools/amadeus-version.ts` のバージョンをバンプし、README バッジを更新し、`CHANGELOG.md` に `## [X.Y.Z] - YYYY-MM-DD` 見出しと箇条書きを追加する(`tests/unit/t68-version-changelog-sync.test.ts` が三者の同期を強制)。ドキュメントのみ・内部リファクタ・テストのみの変更はバンプしない

## Corrections

<!-- 人間のフィードバックによるプロジェクト固有の是正。 -->
<!-- 形式: NEVER/ALWAYS [behavior] (learned [date]) -->
