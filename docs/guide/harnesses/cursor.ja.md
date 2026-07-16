# Cursor 上の AI-DLC

> 言語: [English](cursor.md) | **日本語**

`dist/cursor/` は、**Cursor** ハーネス向けの、フレームワークのハーネス
ディストリビューションの 1 つです。1 つの決定論的なコア、多数のハーネス:
エンジン、ステートマシン、監査ログ、グラフ、swarm レフェリー、learnings ゲートは
すべてのディストリビューションでバイト単位で同一であり、異なるのはシェルだけです。
このツリーは `bun scripts/package.ts cursor` によって
`packages/framework/core/` + `packages/framework/harness/cursor/` から
**生成** されます。手編集しないでください(ドリフトガードが CI で失敗します)。

## 前提条件

- **Cursor** — `.cursor/` のルール・コマンド・フックサーフェスを持つリリース。
- **bun** — Claude ハーネスと同じ要件です。すべてのツールとフックは bun 経由で実行されます。
- **モデルプロバイダ** — Cursor は通常設定されたプロバイダとモデルを使います。

## インストール

このハーネスにはまだ **インストーラがありません** — ディストリビューションを
手動でプロジェクトにコピーしてください(Issue
[#1048](https://github.com/amadeus-dlc/amadeus/issues/1048)):

```bash
cp -r dist/cursor/.cursor/ your-project/.cursor/
cp -r dist/cursor/amadeus/ your-project/amadeus/    # ワークスペースシェル — .cursor/ の兄弟であり、中ではない
cp dist/cursor/AGENTS.md    your-project/AGENTS.md  # または既存のものにマージ
cp -n your-project/.cursor/hooks.json.example your-project/.cursor/hooks.json
```

`amadeus/` ディレクトリはワークスペースシェルです — エンジンが読み込む
事前ビルド済みの `amadeus/spaces/default/memory/` メソッドツリーを同梱します。
これは `.cursor/` の **兄弟** なので、別途コピーしてください(または
`dist/cursor/` ツリー全体を一度にコピー)。常時適用の
`.cursor/rules/amadeus.mdc` が Cursor をそのメソッドチェーンへ向けます。

## 使い方

オーケストレーターを `/amadeus` コマンド(`.cursor/commands/amadeus.md` に記述)に
スコープまたは説明を続けて起動します。他のすべてのハーネスと同じ決定論的な
転送ループを実行します。`AGENTS.md` は、再開したセッションが読むセッション
再開のオンボーディングを担います。

## 同梱物(機能単位)

| 単位 | 状態 |
| --- | --- |
| 配布 | `dist/cursor/` — 手動配置、インストーラなし([#1048](https://github.com/amadeus-dlc/amadeus/issues/1048)) |
| ルール | `.cursor/rules/amadeus.mdc`(常時適用のメソッドポインタ) |
| オーケストレーター | `.cursor/commands/amadeus.md`(`/amadeus` コマンド) |
| オンボーディング | `AGENTS.md`(セッション再開導線) |
| フック | `.cursor/hooks.json.example` が 8 イベントをアダプタ経由で配線(下記参照) |
| `promote:self` | 本ハーネスは非対象 |

## フック配線

同梱の `hooks.json.example` は、8 つの Cursor イベントを
`.cursor/hooks/amadeus-cursor-adapter.ts` アダプタ経由で配線します:

| Cursor イベント | アダプタ verb → フレームワークフック |
| --- | --- |
| `sessionStart` | `session-start` |
| `beforeSubmitPrompt` | `mint`(presence) |
| `afterShellExecution` | `runtime-compile` |
| `afterFileEdit` | `audit-and-sensors` |
| `subagentStop` | `log-subagent` |
| `preCompact` | `validate-state` |
| `stop` | `stop`(advisory、exit 0 固定 — block wire 契約は未検証) |
| `sessionEnd` | `session-end` |

**汎用 `postToolUse` は非出荷** です: Cursor の文書化された `tool_name` 値の
集合は独立照合が不能で、per-tool の `tool_input` 形状は未文書化のため、汎用
配線は無音 no-op の偽グリーンを招くリスクがあります。文書化されたペイロードを
持つ Cursor 専用イベントのみを配線します。アダプタの `ToolNameMap` は
`{ afterShellExecution: "Bash", afterFileEdit: "Edit" }` で、未登録の識別子は
advisory 拒否されます(exit 2 は不使用)。

**アダプタの exit 意味論**(Cursor 側の契約): exit 0 は stdout を採用、exit 2 は
deny(ここでは不使用)、その他のコードは fail-open です。アダプタの
`EXIT_ADVISORY_FAIL` は 1 です。

## Claude Code との相違点

- **汎用ツールフックなし**: 上記の文書化された Cursor イベントのみを配線します。
  キャッチオールの `postToolUse` はありません。
- **`/amadeus --version`** は `amadeus 0.1.2` を報告します(exit 0)。
- **`/amadeus --doctor`** は 30 pass + 環境要因の 1 fail(scratch プロジェクトでの
  `settings.json` 不在)を報告します — この fail は環境要因であり、正しさの欠陥では
  ありません。

## 再生成

```bash
bun scripts/package.ts cursor        # packages/framework/core + harness/cursor から dist/cursor を再生成
bun scripts/package.ts --check       # CI ドリフトガード(全ハーネス)
```

## 次のステップ

方法論はどのハーネスでも同じです — 中立な章から続けてください:

- [最初のワークフロー](../02-your-first-workflow.ja.md) — 注釈付きのエンドツーエンド実行。
- [フェーズとステージ](../04-phases-and-stages.ja.md) — 5 フェーズと 32 ステージ。
- [スコープ、深度、テスト戦略](../05-scopes-and-depth.ja.md) — 実行の適正化。
- [用語集](../glossary.ja.md) — すべての用語の定義。

他のハーネス: [ハーネスファミリー索引](README.ja.md)。
