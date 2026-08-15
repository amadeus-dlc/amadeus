# 階層設定リゾルバー

> 言語: [English](19-layered-config.md) | **日本語**

> [Developer Reference](00-overview.ja.md)の一部

読み取り専用の階層設定リゾルバーの正本は
`packages/framework/core/tools/amadeus-config.ts` です。設定レジストリに、全 leaf の
パス、既定値、許可 layer、置換マージ規則、ドメインパーサーを定義します。

## layer とマージ規則

次の任意の Git 共有ファイルを順に読み取ります。

```text
Project: amadeus/config.json
Space:   amadeus/spaces/<space>/config.json
Intent:  amadeus/spaces/<space>/intents/<intent>/config.json
```

後段の layer が leaf 単位で前段を置き換えます。配列は追記せず配列全体を置き換えます。
leaf がなければ継承し、空 object は何も変更せず、`null` は不正です。1件でも不正な
ファイルや leaf があれば、全診断を収集したうえで設定全体を拒否します。キャッシュ、
リトライ、書き込みは行いません。

## 正準スキーマ

```json
{
  "intent-mirror": {
    "github": {
      "issue": { "consent": "prompt" },
      "project": { "targets": [] }
    }
  },
  "finding": {
    "github": { "issue": { "creation": { "consent": "prompt" } } }
  },
  "swarm": { "unit": { "concurrency": { "limit": 4 } } },
  "plugin": {
    "activation": { "names": [] },
    "scope-bindings": {}
  },
  "subagent": { "dispatch": { "enforced-models": ["opus", "sonnet"] } }
}
```

| パス | 値と既定値 | layer |
|------|------------|-------|
| `intent-mirror.github.issue.consent` | `off \| prompt \| auto`、`prompt` | Project、Space、Intent |
| `intent-mirror.github.project.targets` | target 配列、`[]` | Project、Space、Intent |
| `finding.github.issue.creation.consent` | `off \| prompt \| auto`、`prompt` | Project、Space、Intent |
| `swarm.unit.concurrency.limit` | 整数 `1..4`、`4` | Project、Space、Intent |
| `plugin.activation.names` | 昇順で一意な plugin 名配列、`[]` | Project のみ |
| `plugin.scope-bindings` | plugin から stage、重複のない scope 配列への対応表、`{}` | Project のみ |
| `plugin.settings` | plugin から設定キー、string / number / boolean 値への対応表、`{}` | Project、Space、Intent |
| `subagent.dispatch.enforced-models` | 空でない一意なモデル名配列、`["opus","sonnet"]` | Project, Space, Intent |

`solo-election.trigger.mode` という leaf はありません(RFC-0001 ADR-8)。ソロ選挙の
自動発動は `deriveSoloElectionTrigger(mode)` — アクティブな Intent の Autonomy Mode
のみを入力に取る純関数(`none` → `"manual"`、`semi`/`full` → `"auto"`)であり、設定値
ではありません。

未知のパスと旧フラットキーはエラーです。**改名**された旧キーの診断(上表の consent 系、
`.mode` → `.consent`)は新しい構造化パスを示しますが、**廃止**された
`solo-election.trigger.mode` の診断は Intent Autonomy Mode から導出される旨を説明する
だけで、置換先パスは示しません。いずれの場合も alias や自動移行は行いません。
`observability` は既存リゾルバーへ委譲したままなので、ルートでは許容しますが、この
レジストリの対象には含めません。

## Project target と plugin

各 target には `project: "<owner>/<正の整数>"` が必須です。空でない `phase-field`
（既定値 `Intent Phase`）と、`ideation`、`inception`、`construction`、`operation`、
`done` に対応する空でない `status-names` を任意指定できます。正規化後に同一となる
Project は拒否し、入力順序は維持します。

plugin 名は一意な1〜64文字で、
`^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$` に一致する必要があります。activation は
集合なので、昇順へ正規化します。

## CLI との統合

- 自動選挙は `open --trigger auto`、手動選挙は既定の `--trigger manual` を使います。
  `deriveSoloElectionTrigger(mode)` が `"manual"` を導出する場合(アクティブな Intent
  の投影が存在しない場合も、退役した config leaf と同じ保守的な既定として `"manual"`
  を導出します)、自動要求は
  `{"opened":null,"reason":"solo-election-manual-trigger-required"}` を返します。
- finding の起票には `create-github-issue` subcommand を使います。
- swarm の引数は解決済み上限を縮小できますが、拡大はできません。

## テスト

- `tests/unit/t431-structured-config.test.ts`: スキーマ、既定値、優先順位、置換、正規化、旧キー診断
- `tests/integration/t257-amadeus-config.integration.test.ts`: 実ファイル解決と読み取り安全性
- election、finding、mirror、swarm、plugin の各 integration suite: 公開 CLI と consumer 境界

配置と利用例は[階層設定](../guide/21-layered-config.ja.md)を参照してください。
