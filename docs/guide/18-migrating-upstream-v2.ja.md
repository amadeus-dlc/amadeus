# 本家 AI-DLC v2 ワークスペースの移行

> 言語: [English](18-migrating-upstream-v2.md) | **日本語**

Amadeus は、本家 v2 の `aidlc/` ワークスペースを、対応する `amadeus/`
ワークスペースへ変換できます。移行は Intent を作成・進行しないワークスペース
ユーティリティです。すべての操作をプレビューし、人間の明示的な承認を待ってから
同じ計画を適用し、結果を検証します。

検証済みの範囲は、本家 v2.2.0 から、バージョン 2.2.10 を報告するコミット
[`242953ec76f307c8caf565805f9955a7ef458a92`](https://github.com/awslabs/aidlc-workflows/commit/242953ec76f307c8caf565805f9955a7ef458a92)
までです。本家には `v2.2.10` タグがないため、このガイドでは意図的にコミットで
リビジョンを特定します。移行対象の状態ファイルはすべて **State Version 7** で
なければなりません。

## 移行前の準備

1. ワークフローを実行せず、利用するハーネス向けの Amadeus エンジンを導入します。
2. エンジンの導入をコミットし、`git status --short` が空であることを確認します。
3. 本家ワークスペースを `aidlc/` に置きます。別の場所を使う場合は、同じ Git
   リポジトリかつ同じファイルシステム内のパスを選びます。
4. 本家側の compose、Bolt、swarm、登録済み worktree を完了または削除します。
   移行ツールは再開方法を推測せず、実行中の処理があれば拒否します。

通常の Amadeus インストールでは、未変更のワークスペース seed がすでに存在する
場合があります。移行ツールが受け入れるのは、schema 1 の installer manifest に記載された
ファイルの hash がすべて一致し、余分な workspace データがない seed だけです。manifest の
内容はバイト単位で保持し、それ以外の seed データを移行元で置き換えます。利用者のデータが
ある、または manifest から変更されたワークスペースは拒否します。

## 移行の実行

ほかのコマンドと同じオーケストレータープレフィックスを使います。

```text
/amadeus --migrate [path]
```

Codex CLI では `$amadeus --migrate [path]` を使います。`path` を省略すると
`<project>/aidlc` を読みます。別の移行元を指定できるのは `--migrate` にパスを
渡した場合だけです。自然言語のルーティングは意図的に限定されており、`aidlc` または
AI-DLC と、移行／変換を表す語の両方を含む必要があります。「AI-DLC ワークスペースを
移行して」のように条件を満たす依頼は既定の移行元を使い、文章中のパスを推測しません。

コマンドは必ず次の順序で動作します。

1. 変更を加えない dry-run を実行し、チェック、警告、ソート済み操作一覧をすべて表示する。
2. 番号付きの `Yes` / `No` 承認ゲートで停止する。
3. 人間が明示的に `Yes` と回答した場合だけ、内部 apply コマンドを実行する。
4. 全レコード、監査の保持、Amadeus doctor を検証し、移行対象のパスだけを stage する。
   commit は作成しない。

`/amadeus` に `--apply` を渡さないでください。apply は承認フロー内部専用です。
また、移行は `--stage`、`--phase`、`--scope`、`--depth`、`--single` などの
ワークフローオプションと併用できません。

### 内部インターフェースと JSON レポート

コンダクターは、内部で次の決定論的インターフェースを使います。`--apply` を
指定しない場合は、どちらも dry-run になります。

```text
bun <harness>/tools/amadeus-utility.ts migrate [path] [--apply] [--json]
bun <harness>/tools/amadeus-migrate.ts --from <path> [--apply] [--json] [--project-dir <root>]
```

`--apply` を直接実行しないでください。人間による承認ゲートは公開コマンドが
管理します。`--json` を指定すると、`schemaVersion`、`status`、`mode`、移行元と
移行先のパス、`sourceVersion`、移行先の種別、checks、ソート済みの `operations`、
warnings、検証 `evidence` を返します。拒否または失敗時の終了コードは 0 以外です。

## 変更されるもの

- ワークスペース root を `aidlc/` から `amadeus/` へ移動する。
- 各 `aidlc-state.md` を `amadeus-state.md` へ改名する。さらに、
  `knowledge/aidlc-shared`、既知の role-agent knowledge ディレクトリ、
  `.aidlc-clone-id` も Amadeus 名へ改名する。
- space、memory、knowledge、コード知識(`codekb`)、Intent record、cursor、
  バイナリファイル、symlink は保持する。symlink はリンクのまま保持し、リンク先をたどらない。
- `intents.json`、`.migrated`、installer manifest は内容をバイト単位で保持する。
  audit shard の移行前の内容は不変の prefix として保持し、移行後のヘルスチェックが
  doctor の既知の `GUARDRAIL_LOADED` と `HEALTH_CHECKED` event を末尾に追記する
  場合だけを許可する。追記は検証 `evidence` に記録する。
- runtime graph、session、recovery、hook／sensor scratch、latch などの runtime projection
  とマシンローカルデータは破棄する。次回の通常実行時に Amadeus が再生成する。
- audit 以外では、認識できる path、command、tool、環境変数の完全な
  operational token だけを置換する。方法論の文章や単独の製品名は一括置換しない。
- project `.gitignore` の既知の本家 runtime pattern だけを書き換える。利用者独自の行と
  workspace 外の旧 engine file は変更せず、必要に応じて警告する。

Amadeus は、本家 v2.2.9 の `optional_produces` 契約も引き継ぎます。
`frontend-components` と `shared-infrastructure` は Unit ごとの条件付き成果物です。
文書化された条件に該当しない場合、これらがなくても移行済み Intent は未完了になりません。
存在する場合は、directive のルーティング、成果物レジストリ、Sensor の対象に含まれます。
詳細は [ステージ定義](../reference/15-stage-definition.ja.md#optional_produces)を参照してください。

## 拒否条件と復旧

dirty なリポジトリ、無効または root 外へ逃げる移行元、State Version 7 以外、壊れた
registry／cursor、予約済みの `help` slug、実行中の本家処理、改名先の衝突、変更済み
destination seed、検証範囲外と判定できる本家バージョンは dry-run で拒否します。

本家 engine のバージョンファイルが残っていない場合は、State Version 7 と構造検証を
通過したデータを移行できます。この場合、レポートには
`sourceVersion: unknown` と表示され、承認レポートにも警告が残ります。v1
`aidlc-docs/`、逆変換、任意の既存 Amadeus ワークスペースへの merge は対象外です。

apply は clean な Git 状態を基準にし、書き込みまたは事後検証が失敗した場合は
移行元 workspace、移行先 seed、`.gitignore`、Git index を元へ戻します。rollback 自体を
検証できなかった場合は、再実行せず、報告されたパスと Git の状態を確認してください。

構造上の背景は、
[本家 AI-DLC v2.2.0 と Amadeus ワークスペースの差分](../research/upstream-ai-dlc-v2.2.0-amadeus-main-workspace-differences.ja.md)
を参照してください。
