# AI-DLC ドキュメント

> 言語: [English](README.md) | **日本語**

**AI-DLC は方法論です** — AI 駆動のソフトウェア開発に対する、構造化されゲートで区切られたアプローチ(AWS によって定義)。**このリポジトリはそのネイティブなマルチハーネス実装です:** 方法論を、ハーネス非依存の単一の `core/` からスキル・エージェント・フック・ツールとしてレンダリングしているため、あなたが使う CLI ハーネス上でネイティブに動作します — 現時点では Claude Code、Kiro CLI、Kiro IDE、Codex CLI、そしてあなたが移植できる任意の対応 CLI です。方法論は *何をするか* であり、各ハーネスの配布物は 1 つのランタイムに対する *どう動かすか* であって、すべての配布物は同じソースから生成されます。

初めてですか? [README](../README.md) にインストールのクイックスタートと「ハーネスを選ぶ」の表があります。このページはドキュメント自体の地図です。

## 3 つのガイド、読者ごとに 1 つ

変えようとしているものに応じて選んでください:

| ガイド | あなたは… | あなたが変えるもの… |
|-------|----------|--------------------|
| **[User Guide](guide/00-introduction.ja.md)** | AI-DLC を *使って* ソフトウェアを作る | フレームワークの中身は何も変えない — `/amadeus` を実行し、ゲートで回答し、成果物をレビューする |
| **[Harness Engineer Guide](harness-engineering/00-overview.ja.md)** | チームに合わせて AI-DLC の *振る舞い* を作り替える | フレームワークが読む **データ**: ステージ、エージェント、スコープ、ルール、センサー、知識 — そして新しいハーネスへの移植 |
| **[Developer Reference](reference/00-overview.ja.md)** | AI-DLC *そのもの* を変える | そのデータを読む **コード**: エンジン、フック、CLI ツール、コンパイルパイプライン、テストスイート |

Harness Engineer Guide と Developer Reference の境界は **データ対コード** です。User Guide とそれ以外の境界は **使う** 対 **作り替える** です。

## 特定のハーネスで動かす

各ガイドはハーネス非依存です。各ハーネスのインストール手順と、ハーネスごとに異なる少数の振る舞いは [Running on other harnesses](guide/harnesses/README.ja.md) にあります(Claude Code は User Guide 全体でカバーされており、その例は Claude Code 上で動作します)。

## ビルドと貢献

メンテナは `core/` で著述し、`bun run dist`(`bun scripts/package.ts`)で `dist/<harness>/` ツリーを再生成します — 完全なビルド&テストのループについては [Contributing Guide](reference/11-contributing.ja.md) を、ハーネスの追加については [Porting to a New Harness](harness-engineering/09-porting-to-a-new-harness.ja.md) を参照してください。
