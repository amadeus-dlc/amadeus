# 他のハーネスで実行する

AI-DLC は、あなたが使う CLI 上にレンダリングされる 1 つのハーネス中立なコアです。
方法論 — [フェーズとステージ](../04-phases-and-stages.md)、
[エージェント](../06-agents.md)、[スコープ](../05-scopes-and-depth.md)、
[承認ゲート](../07-interaction-modes.md) — はどのハーネスでも同一です。
異なるのは *シェル* です。ゲートがどう描画されるか、サブエージェントがどう
ディスパッチされるか、どのセッションイベントが発火するか、設定がどこに置かれるか。
ここの各章は、1 つのハーネスのインストール手順、前提条件、そして中立な方法論と
異なるわずかな挙動を扱います。

ハーネスを選んでください:

| ハーネス | 起動 | 章 |
|---------|--------|---------|
| **Claude Code** | `/amadeus` | [ユーザーガイド](../00-introduction.md) 全体で扱われます(例はすべて Claude Code 上で動作)。インストールは [はじめに](../01-getting-started.md) を参照。 |
| **Kiro IDE** | `/amadeus` | [Kiro IDE で AI-DLC を実行する](kiro-ide.md) — 前提条件(Opus 4.8)、インストール、フック、Kiro での相違点。 |
| **Kiro CLI**(≥ 2.6) | `/amadeus` | [Kiro CLI で AI-DLC を実行する](kiro-cli.md) — 前提条件、インストール、Kiro での相違点。 |
| **Codex CLI**(≥ 0.139.0) | `$amadeus` | [Codex CLI 上の AI-DLC](codex-cli.md) — 前提条件、trust の事前シード、プロバイダ設定、git リポジトリ要件。 |

Kiro(IDE または CLI)上の AI-DLC は **Claude Opus 4.8** で最も良く動作し、これには **有料の Kiro プラン** が必要です。

このセットはオープンです。新しいハーネスは同じテンプレートから追加され、独自の章を
ここに持ちます。新しいハーネスを *構築する* 側(ソース契約 — manifest、hook
アダプタ、`emit.ts`)については、Harness Engineer Guide の
[新しいハーネスへの移植](../../harness-engineering/09-porting-to-a-new-harness.md) を参照してください。

どのハーネスで実行しても方法論は同じです — まずは
[最初のワークフロー](../02-your-first-workflow.md) と
[フェーズとステージ](../04-phases-and-stages.md) のツアーから始めてください。
