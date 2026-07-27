# チームメッセージングバックエンド

> 言語: [English](team-messaging.md) | **日本語**

> 対象読者: `{{HARNESS_DIR}}/tools/team-up.sh` でエージェントチームを運用する
> メンテナ。

チームモードでは、leader と engineer は **メッセージングバックエンド** を通じて
メッセージをやり取りします。バックエンドは 2 種類あり、トランスポートは異なり
ますが、チームの規約(ack、3 分での再送、重複の冪等処理)はどちらでも同じです。

## バックエンドの選択

**新規** 実行のバックエンドは `--msg` または `TEAM_MSG` 環境変数で選びます
(フラグが優先)。既定は `agmsg` で、run レコードへ保存されるため、再開した実行
(`-c`)はそれを引き継ぎます — 再開時に `--msg` は拒否されます。

```bash
{{HARNESS_DIR}}/tools/team-up.sh --msg agmsg    # 既定: agmsg ストア + monitor 配送
{{HARNESS_DIR}}/tools/team-up.sh --msg herdr    # herdr エージェントマルチプレクサ、専用ポーラーなし
TEAM_MSG=herdr {{HARNESS_DIR}}/tools/team-up.sh # 同じものを環境変数で指定
```

未知の値は fail-closed で拒否されます:
`ERROR: unknown msg backend: <value> (agmsg|herdr)`。

メンバーは `TEAM_MSG` を export した状態で起動されるため、各メンバーの
`{{HARNESS_DIR}}/tools/team-msg.sh` 呼び出しは、その実行が作成されたときと同じ
バックエンドを使います。

## 送信と読み取り

`{{HARNESS_DIR}}/tools/team-msg.sh` がバックエンド中立のトランスポートです:

```bash
{{HARNESS_DIR}}/tools/team-msg.sh send <role> <text>   # role: leader、e1、e2、…
{{HARNESS_DIR}}/tools/team-msg.sh read <role>
```

- **agmsg** は agmsg スキル(`send.sh` / `history.sh`)へ委譲します。ストア自身の
  メタデータが送信者を保持します。
- **herdr** は受信側の pane を直接駆動します: role を herdr のエージェント名
  (`e1` → `engineer-1`)へ解決し、受信側が現在のターンを終える(`idle` に到達する、
  ツール実行 1 回のスケールでおよそ 60 秒)のを待ってから、**テキストを配置して
  Enter を押します** — この 2 ステップで 1 回の配送です。受信側が時間内に idle に
  ならない場合、何も送信されず、呼び出しは非ゼロを返します。herdr では
  **バックグラウンドポーラーはありません**(agmsg の Codex monitor とは異なります)。

herdr の素のターンは送信者情報を持たないため、herdr の送信ごとに、本文の
**1 行目** として安定した機械可読ヘッダを付けてから元の本文を続けます:

```
[team-msg from:<role> via:herdr machine]
```

可変なのは `from:<role>` だけです。agmsg バックエンドはこのヘッダを **付けません** —
メタデータが既に送信者を示しているためです。

## ランタイムの前提条件

ランチャーは、選択されたメッセージングバックエンドに関わらず、チーム状態を作成
する前にオペレーティングシステム、herdr、agmsg をチェックします。herdr バック
エンドでもチームセットアップ中は agmsg 統合を使うため、agmsg はオプションでは
ありません。Codex メンバーは `PATH` から解決した `codex` コマンドを起動します。
そのインストールとバージョン選択はユーザーの環境が所有します。インストール元、
検証済みバージョン、パスの上書きについては
[チームモード](20-team-mode.ja.md#prerequisites) を参照してください。

## 送信の監査ログ

herdr バックエンドでは、`team-up.sh` が `TEAM_MSG_LOG_DIR`(run レコードの
ディレクトリ)を全メンバーの環境へ結線するため、各 `team-msg.sh send` は
`<run record>/messages.log` へ 1 行追記します。このファイルが選挙の provenance に
おける送信側の主要な記録です(agmsg history の herdr 版に当たります)。書き込みに
失敗しても stderr へ警告するだけで、送信自体は失敗しません。
