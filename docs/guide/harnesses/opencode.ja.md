# OpenCode 上の AI-DLC

> 言語: [English](opencode.md) | **日本語**

`dist/opencode/` は、**OpenCode** ハーネス向けの、フレームワークのハーネス
ディストリビューションの 1 つです。1 つの決定論的なコア、多数のハーネス:
エンジン、ステートマシン、監査ログ、グラフ、swarm レフェリー、learnings ゲートは
すべてのディストリビューションでバイト単位で同一であり、異なるのはシェルだけです。
このツリーは `bun scripts/package.ts opencode` によって
`packages/framework/core/` + `packages/framework/harness/opencode/` から
**生成** されます。手編集しないでください(ドリフトガードが CI で失敗します)。

## 前提条件

- **OpenCode** — `.opencode/` のコマンド・エージェント・設定サーフェスを持つ
  最近のリリース。
- **bun** — Claude ハーネスと同じ要件です。すべてのツールとフックは bun 経由で実行されます。
- **モデルプロバイダ** — OpenCode は通常設定されたプロバイダとモデルを使います。
  同梱の `opencode.json.example` はどちらもピンしません。

## インストール

このハーネスにはまだ **インストーラがありません** — ディストリビューションを
手動でプロジェクトにコピーしてください(Issue
[#1048](https://github.com/amadeus-dlc/amadeus/issues/1048)):

```bash
cp -r dist/opencode/.opencode/ your-project/.opencode/
cp -r dist/opencode/amadeus/   your-project/amadeus/    # ワークスペースシェル — .opencode/ の兄弟であり、中ではない
cp dist/opencode/AGENTS.md      your-project/AGENTS.md  # または既存のものにマージ
cp -n your-project/.opencode/opencode.json.example your-project/.opencode/opencode.json
```

`amadeus/` ディレクトリはワークスペースシェルです — エンジンが読み込む
事前ビルド済みの `amadeus/spaces/default/memory/` メソッドツリーを同梱します。
これは `.opencode/` の **兄弟** なので、別途コピーしてください(または
`dist/opencode/` ツリー全体を一度にコピー)。

OpenCode の既定の権限は全許可です。同梱の `opencode.json.example` は
`edit`・`bash`・`webfetch` を `ask` に絞り込みます。ゲートに関わる操作で
確認プロンプトを表面化させるため、この例の適用を推奨します。

## 使い方

オーケストレーターを `$amadeus` コマンド(`.opencode/commands/amadeus.md` に
記述)にスコープまたは説明を続けて起動します。他のすべてのハーネスと同じ
決定論的な転送ループを実行します。`AGENTS.md` は、再開したセッションが読む
セッション再開のオンボーディングを担います。

## 同梱物(機能単位)

| 単位 | 状態 |
| --- | --- |
| 配布 | `dist/opencode/` — 手動配置、インストーラなし([#1048](https://github.com/amadeus-dlc/amadeus/issues/1048)) |
| オーケストレーター | `.opencode/commands/amadeus.md`(`$amadeus` コマンド) |
| オンボーディング | `AGENTS.md`(セッション再開導線) |
| 設定例 | `.opencode/opencode.json.example` — `$schema` + 権限絞り込み(`edit`/`bash`/`webfetch` = `ask`) |
| セッションスキル | 4 本(`session-cost`・`replay`・`outcomes-pack`・`grilling`)— per-stage runner 32 本は初期スコープ外 |
| フック | **未対応** — OpenCode のフック相当は JS プラグイン。Issue [#1049](https://github.com/amadeus-dlc/amadeus/issues/1049) で将来対応 |
| `promote:self` | 本ハーネスは非対象 |

## Claude Code との相違点

- **フックなし**: OpenCode にはフレームワークが配線できるシェルコマンド型の
  フック機構がありません — 拡張サーフェスは JS プラグインです。他ハーネスで
  フックに乗る監査発行・センサー発火・presence mint はここでは動作しません。
  Issue [#1049](https://github.com/amadeus-dlc/amadeus/issues/1049) で追跡。
- **`$amadeus --version`** は `amadeus 0.1.2` を報告します(exit 0)。
- **`$amadeus --doctor`** は advisory のみに劣化します — `.claude` 前提ブロックの
  誤発火と他 worktree の非列挙があり、いずれも正しさには影響しません。
- **セッションスキルのみ**: 読み取り専用のセッションスキル 4 本を同梱します。
  per-stage runner は初期スコープから除外されています。

## 再生成

```bash
bun scripts/package.ts opencode      # packages/framework/core + harness/opencode から dist/opencode を再生成
bun scripts/package.ts --check       # CI ドリフトガード(全ハーネス)
```

## 次のステップ

方法論はどのハーネスでも同じです — 中立な章から続けてください:

- [最初のワークフロー](../02-your-first-workflow.ja.md) — 注釈付きのエンドツーエンド実行。
- [フェーズとステージ](../04-phases-and-stages.ja.md) — 5 フェーズと 32 ステージ。
- [スコープ、深度、テスト戦略](../05-scopes-and-depth.ja.md) — 実行の適正化。
- [用語集](../glossary.ja.md) — すべての用語の定義。

他のハーネス: [ハーネスファミリー索引](README.ja.md)。
