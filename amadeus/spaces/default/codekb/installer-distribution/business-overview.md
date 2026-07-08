# ビジネス概要

## 目的

Amadeus は AI-DLC ワークフローを複数の AI harness(Claude、Codex、Kiro CLI、Kiro IDE)に配布するための framework リポジトリである。現在、利用者はこのリポジトリを clone し `bun scripts/package.ts` と `bun scripts/promote-self.ts` を手動実行するか、`dist/<harness>/` を手動コピーして自分のプロジェクトへ導入している。npm 経由のインストール手段は存在しない。

この intent `260708-installer-distribution` は、`packages/setup` に publishable な npm パッケージ `@amadeus-dlc/setup` を新設し、`npx @amadeus-dlc/setup install` / `upgrade` のような CLI 体験で AI-DLC を任意のプロジェクトへ導入・更新できるようにする。前回 intent `260707-layout-normalization`(GitHub issue #610)が `packages/framework/{core,harness}` への layout 正規化を完了させたことで、`packages/setup` を追加する土台が整った。

## 現在の業務境界

現在の配布フローは3つの役割に分かれる。

- `packages/framework/core/`: harness-neutral な AI-DLC runtime、templates、tools、stage 定義の source of truth。物理的な配置はここへ移り、root `core/` の互換シンボリックリンクも PR #644 で削除された。
- `packages/framework/harness/<name>/`: harness 固有の manifest、emitter、skill/prompt/system integration(PR #644 で root symlink は削除済み)。
- `dist/<name>/`: `scripts/package.ts` が生成し repository に commit される、user がコピー/インストールする成果物。root にとどまり、self-install(`promote:self`)とテストの anchor になっている。

この三層構造は README と `docs/reference/11-contributing.md` に contributor mental model として明記されており、単なるファイルシステム配置ではなく「どこを編集し、どこを生成物として扱うか」を判断する業務ルールでもある。

## この intent が追加する業務境界

`packages/setup` は上記三層の外側に新設される、独立した npm 公開パッケージである。

- 配布対象は GitHub の tag アーカイブ(release ではなく git tag ベース)を fetch し、ユーザーのプロジェクトへ展開する。
- 導入先の既存ファイルを壊さないよう、`amadeus-*` prefix を持つファイル群にスコープした non-destructive merge を行う。この判断ロジックは `scripts/promote-self.ts` が持つ ownership 判定・diff・`--check` モードの考え方を再利用できる可能性が高い。
- version 検出とファイル単位の diff report を提供し、upgrade 時にユーザーが変更内容を把握できるようにする。
- npx/bunx から直接実行できるよう JavaScript へビルドする。これは framework 本体が一貫して「ビルドせず Bun で TypeScript を直接実行する」という原則からの意図的な逸脱であり、リポジトリで最初の npm publish サーフェスになる。

## 現状の制約・未整備事項

- `git tag -l` は 0 件を返す。tag アーカイブ配布という設計の前提となる tag 運用がこのリポジトリにまだ存在しない(greenfield)。
- root `package.json` の `"license": "MIT-0"` と `"repository.url": "https://github.com/awslabs/amadeus-workflows"` は誤り(stale)のまま残っている。`packages/setup` の `package.json` は正しいメタデータを持たせる必要がある。
- publish workflow・release automation は存在しない。CI は typecheck/lint/dist drift/self-install drift/test のみ。
- `AMADEUS_VERSION`(framework コンテンツのバージョン)と `@amadeus-dlc/setup` のバージョンは独立したライフサイクルを持つべきで、両者を束ねる先例はまだ存在しない。

## 成功条件

この stage の成果は実装ではなく、requirements-analysis 以降が依拠する CodeKB 更新である。成功条件は次の通り。

- `packages/framework` が実在すること、root `core`/`harness` symlink が PR #644 で削除されたこと、`packages/setup` が未着手であることを正しく記録している。
- `scripts/package.ts` と `scripts/promote-self.ts` の挙動(harness 生成、self-install、preservation rules)を、installer の non-destructive merge 設計の参考実装として棚卸ししている。
- version ライフサイクル(`AMADEUS_VERSION`、VERSION ファイル、t68 の3者同期、CHANGELOG 規律、tag 不在)をテスト可能な形で後続 stage へ引き継いでいる。
- CI の実態(narrow biome lint scope、publish workflow 不在)と root `package.json` の既知の不備を明示している。
