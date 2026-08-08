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
      "issue": { "mode": "prompt" },
      "project": { "targets": [] }
    }
  },
  "solo-election": { "trigger": { "mode": "manual" } },
  "finding": {
    "github": { "issue": { "creation": { "mode": "prompt" } } }
  },
  "swarm": { "unit": { "concurrency": { "limit": 4 } } },
  "plugin": { "activation": { "names": [] } },
  "subagent": { "dispatch": { "enforced-models": ["opus", "sonnet"] } }
}
```

| パス | 値と既定値 | layer |
|------|------------|-------|
| `intent-mirror.github.issue.mode` | `off \| prompt \| auto`、`prompt` | Project、Space、Intent |
| `intent-mirror.github.project.targets` | target 配列、`[]` | Project、Space、Intent |
| `solo-election.trigger.mode` | `manual \| auto`、`manual` | Project、Space、Intent |
| `finding.github.issue.creation.mode` | `off \| prompt \| auto`、`prompt` | Project、Space、Intent |
| `swarm.unit.concurrency.limit` | 整数 `1..4`、`4` | Project、Space、Intent |
| `plugin.activation.names` | 昇順で一意な plugin 名配列、`[]` | Project のみ |
| `subagent.dispatch.enforced-models` | 空でない一意なモデル名配列、`["opus","sonnet"]` | Project, Space, Intent |

未知のパスと旧フラットキーはエラーです。旧キーの診断には移行先を示しますが、alias や
自動移行は行いません。`observability` は既存リゾルバーへ委譲したままなので、ルートでは
許容しますが、このレジストリの対象には含めません。

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
  解決値が `manual` の場合、自動要求は
  `{"opened":null,"reason":"solo-election-manual-trigger-required"}` を返します。
- finding の起票には `create-github-issue` subcommand を使います。
- swarm の引数は解決済み上限を縮小できますが、拡大はできません。

## テスト

- `tests/unit/t431-structured-config.test.ts`: スキーマ、既定値、優先順位、置換、正規化、旧キー診断
- `tests/integration/t257-amadeus-config.integration.test.ts`: 実ファイル解決と読み取り安全性
- election、finding、mirror、swarm、plugin の各 integration suite: 公開 CLI と consumer 境界

配置と利用例は[階層設定](../guide/21-layered-config.ja.md)を参照してください。
