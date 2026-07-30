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
`amadeus/config.json` でソロ選挙を明示起動のみにします。

```json
{
  "auto-solo-election": false
}
```

`payments` space では `amadeus/spaces/payments/config.json` で自動発動へ
opt-in できます。

```json
{
  "auto-solo-election": true
}
```

この space 内の intent は、Intent Config で上書きしない限り `true` を使用します。
ほかの space では引き続き `false` を使用します。

## 対応している設定

| キー | 型 | 既定値 | 効果 |
|------|----|--------|------|
| `auto-mirror` | `"off"` \| `"prompt"` \| `"auto"` | `"prompt"` | 検証済みフェーズ境界でのミラー同期を制御する |
| `mirror-projects` | Project target の配列 | `[]` | intent と GitHub Project target、任意の status 名を対応付ける |
| `auto-solo-election` | boolean | `false` | 設計逸脱・ブロッカー・§13 学習選定でソロ選挙を自動発動する |
| `auto-file-findings` | `"off"` \| `"prompt"` \| `"auto"` | `"prompt"` | 確認済みの Amadeus の不具合・懸念を `amadeus-dlc/amadeus` に起票する |

`auto-solo-election` が制御するのは自動発動だけです。未設定または `false` でも、
ユーザーは選挙を明示的に要求できます。仕様変更などのユーザー専権事項は、この設定で
選挙対象になりません。

`auto-file-findings` の対象は、Amadeus に原因があり、実行中の intent のスコープ外にある、
確認済みで対処可能な不具合・懸念だけです。決定論的な起票ツールは、作成前に安定した
`marker` を使って open・closed 両方の Issue を検索します。秘密情報、非公開 workspace の
情報、推測段階のアイデア、対象アプリケーション側の問題は起票しません。

```json
{
  "auto-file-findings": "auto"
}
```

候補ごとに承認する場合は `"prompt"`、自動起票を止める場合は `"off"` を指定します。
`"off"` でも、人が明示的に承認した1件は起票できます。

## 検証と失敗時の動作

設定は fail-closed で検証されます。

- ルート値は JSON object でなければならない
- 未知のキーは拒否する
- 各設定は上表の型と一致しなければならない
- 不正な JSON や読み取れない設定ファイルはエラーにする
- 存在しないファイルは、そのレベルに設定がないものとして扱う
- 存在するレベルが1つでも不正なら、ほかのレベルだけを部分的に適用せず、解決結果全体を拒否する

設定エラーによってフェーズ境界のルーティングが停止した場合は、報告されたすべての
レベルを修正してからワークフローを再実行します。エラーには `global`、`space`、
`intent` のレベルが付くため、対象ファイルを特定できます。

実装契約については
[階層設定リゾルバー](../reference/19-layered-config.ja.md)を参照してください。
