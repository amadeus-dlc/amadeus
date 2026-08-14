# 階層設定

> 言語: [English](21-layered-config.md) | **日本語**

> [AI-DLC ドキュメント](../README.ja.md)の一部 · [User Guide](00-introduction.ja.md)

Amadeus は、Git で共有する設定を Project、Space、Intent の3ファイルから解決します。

| レベル | ファイル | 適用範囲 |
|--------|----------|----------|
| Project | `amadeus/config.json` | リポジトリ全体 |
| Space | `amadeus/spaces/<space>/config.json` | 1つの space |
| Intent | `amadeus/spaces/<space>/intents/<intent>/config.json` | 1つの intent |

全ファイルは任意です。`Project → Space → Intent` の順に解決し、後段の値が同じ leaf を
置き換えます。配列は追記せず、配列全体を置き換えます。

## 例

Project の既定方針:

```json
{
  "solo-election": { "trigger": { "mode": "manual" } },
  "swarm": { "unit": { "concurrency": { "limit": 4 } } },
  "plugin": { "activation": { "names": ["formal-model-check"] } },
  "subagent": { "dispatch": { "enforced-models": ["opus", "sonnet"] } }
}
```

Space での上書き:

```json
{
  "solo-election": { "trigger": { "mode": "auto" } },
  "swarm": { "unit": { "concurrency": { "limit": 2 } } }
}
```

## 対応パス

| パス | 値 | 既定値 |
|------|----|--------|
| `intent-mirror.github.issue.mode` | `off \| prompt \| auto` | `prompt` |
| `intent-mirror.github.project.targets` | Project target 配列 | `[]` |
| `solo-election.trigger.mode` | `manual \| auto` | `manual` |
| `finding.github.issue.creation.mode` | `off \| prompt \| auto` | `prompt` |
| `swarm.unit.concurrency.limit` | 整数 `1..4` | `4` |
| `plugin.activation.names` | plugin 名配列。Project のみ | `[]` |
| `plugin.settings` | plugin ごとの設定キーとスカラー値の対応表。キー単位でマージ | `{}` |
| `subagent.dispatch.enforced-models` | モデル名配列(別名は完全 ID にも一致) | `["opus","sonnet"]` |

設定は fail-closed です。未知のパス、旧フラットキー、`null`、不正な JSON、読み取れない
ファイル、不正な値が1件でもあれば解決結果全体を拒否します。旧キーの診断には新しい
構造化パスを示しますが、互換 alias は提供しません。

target と検証の完全な契約は
[階層設定リゾルバー](../reference/19-layered-config.ja.md)を参照してください。
