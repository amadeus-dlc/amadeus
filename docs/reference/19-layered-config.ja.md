# 階層設定リゾルバー

> 言語: [English](19-layered-config.md) | **日本語**

> [Developer Reference](00-overview.ja.md)の一部

階層設定リゾルバーは、ミラールーティングとソロ選挙の自動発動が共有する読み取り専用
コンポーネントです。正本は
`packages/framework/core/tools/amadeus-mirror-config.ts` です。

## 契約

`resolveMirrorConfig(projectDir, intentDir?, space?, hooks?)` は、次のパスを導出して読み取ります。

```text
<workspace>/amadeus/config.json
<workspace>/amadeus/spaces/<space>/config.json
<workspace>/amadeus/spaces/<space>/intents/<intentDir>/config.json
```

明示 selector があればそれを使い、なければ active space と intent を解決します。
リゾルバーはキャッシュ、リトライ、書き込みを行いません。

各レベルの結果は `parsed`、`absent`、`invalid` のいずれかです。dangling symbolic link
を含む `ENOENT` は `absent`、それ以外の I/O 失敗は `invalid` になります。全レベルを
解析した後、不正な全レベルと各レベルの全エラーを返すか、Global、Space、Intent の値を
キー単位で順番に適用します。

呼び出し元から見た操作は原子的です。不正なレベルがある場合、部分的に解決した設定を
返しません。

## スキーマ

受理する JSON は次の形です。

```json
{
  "auto-mirror": "prompt",
  "mirror-projects": [],
  "auto-solo-election": true
}
```

閉じたキー allowlist がスキーマ境界です。パーサーは未知のキー、object 以外のルート、
`auto-mirror` の値集合外、壊れた Project target、boolean 以外の
`auto-solo-election` を拒否します。既定値は `autoMirror: "prompt"`、空の Project
一覧、`autoSoloElection: false` です。

## ソロ選挙との統合

ソロ選挙の自動起動は `open --trigger auto-solo` を使用します。CLI は選挙定義を読む前、
かつ election store に書く前に階層設定を解決します。`autoSoloElection` が `true`
でなければ `{"opened":null,"reason":"auto-solo-election-disabled"}` を返し、何も
書きません。通常の `open` は明示起動経路として維持します。

## フェーズ境界との統合

`amadeus-orchestrate.ts` は検証済みフェーズ境界を検出した後、ミラー directive を
選ぶ前に設定を解決します。

- 解決結果が不正なら error directive を発行し、ルーティングを停止する
- `autoMirror: "auto"` かつ Mirror Issue が存在する場合、`sync` を実行して境界 receipt を記録する print directive を発行する
- それ以外は ask directive を発行する。Mirror Issue がなければ `create` も選択肢に含める

receipt protocol により、中断した自動同期を安全に再試行できます。同期前に `pending`、
成功後に `completed` を記録します。

## テスト

契約は次のテストで検証しています。

- `tests/unit/t257-amadeus-mirror-config.test.ts`: 解析、マージ、既定値、パス導出、reader の動作
- `tests/integration/t257-amadeus-mirror-config.integration.test.ts`: 実ファイル上の優先順位と失敗ケース
- `tests/e2e/t265-engine-boundary.test.ts`: フェーズ境界の自動同期と receipt による復旧

配置と利用例については
[階層設定](../guide/21-layered-config.ja.md)を参照してください。
