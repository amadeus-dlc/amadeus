# 階層設定

> 言語: [English](21-layered-config.md) | **日本語**

> [AI-DLC ドキュメント](../README.ja.md)の一部 · [User Guide](00-introduction.ja.md)

Amadeus は、Git リポジトリで共有する設定を3つのレベルから解決できます。設定を適用
したい範囲に合う、最も上位のレベルを使用します。

| レベル | ファイル | 適用範囲 |
|--------|----------|----------|
| Global Config | `amadeus/config.json` | リポジトリ内のすべての space と intent |
| Space Config | `amadeus/spaces/<space>/config.json` | 1つの space に属するすべての intent |
| Intent Config | `amadeus/spaces/<space>/intents/<intent>/config.json` | 1つの intent |

3ファイルはいずれも任意で、Git にコミットして共有することを想定しています。
マシンローカルの設定レベルはありません。

## 優先順位

Amadeus は次の順序で設定を読み取ります。

```text
Global Config → Space Config → Intent Config
```

後から読む、より具体的なレベルがキー単位で上書きします。たとえば、
`amadeus/config.json` で自動ミラー同期を無効にします。

```json
{
  "auto-mirror": false
}
```

`payments` space では `amadeus/spaces/payments/config.json` で有効にできます。

```json
{
  "auto-mirror": true
}
```

この space 内の intent は、Intent Config で上書きしない限り `true` を使用します。
ほかの space では引き続き `false` を使用します。

## 対応している設定

現在のスキーマには1つの設定があります。

| キー | 型 | 既定値 | 効果 |
|------|----|--------|------|
| `auto-mirror` | boolean | `false` | 検証済みフェーズ境界で、intent に Mirror Issue がある場合にミラー同期を自動的に要求する |

`auto-mirror` が自動化するのは `sync` だけです。ミラーの `create` や `close` は自動実行
しません。Mirror Issue が記録されていない場合、Amadeus は従来どおり create、sync、
skip のどれを実行するか確認します。

## 検証と失敗時の動作

設定は fail-closed で検証されます。

- ルート値は JSON object でなければならない
- 未知のキーは拒否する
- `auto-mirror` は boolean でなければならない
- 不正な JSON や読み取れない設定ファイルはエラーにする
- 存在しないファイルは、そのレベルに設定がないものとして扱う
- 存在するレベルが1つでも不正なら、ほかのレベルだけを部分的に適用せず、解決結果全体を拒否する

設定エラーによってフェーズ境界のルーティングが停止した場合は、報告されたすべての
レベルを修正してからワークフローを再実行します。エラーには `global`、`space`、
`intent` のレベルが付くため、対象ファイルを特定できます。

実装契約については
[階層設定リゾルバー](../reference/19-layered-config.ja.md)を参照してください。
