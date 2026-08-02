# 階層設定リゾルバー

> 言語: [English](19-layered-config.md) | **日本語**

> [Developer Reference](00-overview.ja.md)の一部

階層設定リゾルバーは、ミラールーティング、ソロ選挙の自動発動、Amadeus に関する
発見事項の起票が共有する読み取り専用コンポーネントです。正本は
`packages/framework/core/tools/amadeus-config.ts` です。

## 契約

`resolveAmadeusConfig(projectDir, intentDir?, space?, hooks?)` は、次のパスを導出して読み取ります。

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
  "auto-solo-election": true,
  "auto-file-findings": "prompt",
  "max-parallel-units": 4,
  "plugins": ["formal-model-check"]
}
```

閉じたキー allowlist がスキーマ境界です。パーサーは未知のキー、object 以外のルート、
`auto-mirror` の値集合外、壊れた Project target、boolean 以外の
`auto-solo-election` を拒否します。既定値は `autoMirror: "prompt"`、空の Project
一覧、`autoSoloElection: false` です。`auto-file-findings` は `auto-mirror` と同じ
値集合を受理し、既定値は `autoFileFindings: "prompt"` です。
`max-parallel-units` は 1 以上 hard cap 4 以下の整数を受理し、既定値は 4 です。
swarm engine は Intent ごとに解決し、`min(batch size, 解決値)` を
`invoke-swarm.cap` に焼き込みます。呼び出し単位の `--concurrency` は縮小だけを許可します。
`plugins` は project-only の
昇順・一意な名前配列で、既定値は `[]` です。Space または Intent layer に記載すると
設定エラーになります。

## ソロ選挙との統合

ソロ選挙の自動起動は `open --trigger auto-solo` を使用します。CLI は選挙定義を読む前、
かつ election store に書く前に階層設定を解決します。`autoSoloElection` が `true`
でなければ `{"opened":null,"reason":"auto-solo-election-disabled"}` を返し、何も
書きません。通常の `open` は明示起動経路として維持します。

## 発見事項の起票との統合

`amadeus-finding.ts file` は、GitHub の利用可否確認や変更操作より前に設定を解決します。
`"off"` は GitHub に接続せず終了し、`"prompt"` は承認待ちを返し、`"auto"` は起票
コーディネーターへ進みます。`--approved` は `"off"` と `"prompt"` に対する人の
明示承認経路です。

起票先は `amadeus-dlc/amadeus` だけです。呼び出し元が渡した安定した `fingerprint` を
本文の `marker` にハッシュ化し、GitHub Gateway 経由で open・closed 両方の Issue を
検索します。0件の場合だけ作成し、1件なら既存 Issue を再利用し、複数件なら
fail-closed で停止します。作成には、`repository` と本文の `marker` に結び付いた、
起票コーディネーター発行の `permit` が必要です。
不具合には既存の `bug` ラベル、懸念事項には `enhancement` ラベルを付与します。
Issue 本文は共通の descriptor ベースの contained-file reader で読み取り、symlink、
workspace 外への逸脱、通常ファイル以外、64 KiB を超える増大、読込前後の identity
変更を拒否します。

## フェーズ境界との統合

`amadeus-orchestrate.ts` は検証済みフェーズ境界を検出した後、ミラー directive を
選ぶ前に設定を解決します。

- 解決結果が不正なら error directive を発行し、ルーティングを停止する
- `autoMirror: "auto"` は固定 lifecycle boundary command を実行する print directive を発行する。mirror coordinator は Mirror Issue がなければ guarded `create`、存在すれば guarded `sync` を選ぶ
- `autoMirror: "prompt"` だけが ask directive を発行する。Mirror Issue がなければ `create`、`sync`、`skip` を選択肢に含める
- `autoMirror: "off"` は mirror 質問も GitHub mutation も発行しない

durable identity と receipt protocol により、中断した自動 create または sync を安全に
再試行できます。lifecycle operation 前に `pending`、成功後に `completed` を記録します。
リモート create 成功後にローカル永続化が失敗しても、再試行は重複 Issue を作らず同じ
Issue に収束します。

## テスト

契約は次のテストで検証しています。

- `tests/unit/t257-amadeus-config.test.ts`: 解析、マージ、既定値、パス導出、reader の動作
- `tests/integration/t257-amadeus-config.integration.test.ts`: 実ファイル上の優先順位と失敗ケース
- `tests/integration/t265-engine-boundary.integration.test.ts`: mode と Issue 有無の全6組
- `tests/e2e/t265-engine-boundary.test.ts`: 自動 lifecycle 委譲と receipt による復旧
- `tests/unit/t366-amadeus-finding-coordinator.test.ts`: mode routing、`marker` による冪等性、重複処理
- `tests/integration/t366-amadeus-finding-cli.integration.test.ts`: 公開 CLI 境界
- `tests/integration/t368-amadeus-finding-cli.integration.test.ts`: 不正な引数、安全でない本文ファイル、終了コード
- `tests/integration/t368-safe-contained-file.integration.test.ts`: descriptor に結び付いた containment とサイズ上限
- `tests/integration/t367-amadeus-finding-protocol.integration.test.ts`: 全 stage 共通の発見事項受け入れ契約

配置と利用例については
[階層設定](../guide/21-layered-config.ja.md)を参照してください。
