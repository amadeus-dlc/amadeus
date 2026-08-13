# チームモード

> 言語: [English](20-team-mode.md) | **日本語**

チームモードは、leader と複数の engineer が隔離された worktree で Amadeus
ワークフローを実行する、オプトインの実行形態です。ソロ実行と同じワークフロー・
品質規則を使い、責務の分担と協調方法だけが異なります。

## ランチャは廃止

Amadeus は `team-up.sh` を同梱しません。配布物からそのランチャは消えています。
付属していた Codex safety-wait ヘルパーも同時に削除されています。
`team-msg.sh` も同梱しません。

選挙 CLI は残ります。チームモード契約が必要なセッションは、これまでどおり
完全一致のマーカー `AMADEUS_OPERATING_MODE=team` を使います。Amadeus はその
マーカーを設定するランチャも、チームメッセージング CLI も提供しません。

## 概要

`AMADEUS_OPERATING_MODE=team` がなければ Amadeus はソロモードで動作します。
チームモードは任意です。独立した builder や reviewer、チーム選挙が有用な場合に
利用してください。通常の Amadeus ワークフローに必須ではありません。

## 前提条件

独自にチーム環境を組む場合に必要になり得る外部ツール:

| ツール | 動作確認バージョン | 入手先と実行時契約 |
|--------|--------------------|--------------------|
| [Bun](https://bun.sh) | 1.3.13 | `bun` を `PATH` 上で実行できる必要があります。 |
| [herdr](https://herdr.dev) | 0.7.1 | `herdr` を `PATH` 上で実行できる必要があります。`HERDR` で別の実行ファイルを指定できます。 |
| [agmsg](https://github.com/j5ik2o/agmsg) | 1.1.6 | skill を `$HOME/.agents/skills/agmsg` へインストールし、scripts を実行可能にします。`AGMSG_ROOT` と文書化された script override で別のインストール先を指定できます。 |

これらは本ガイドで確認したバージョンであり、継続的な互換性保証ではありません。
Amadeus はこれらを同梱せず、インストール経路も保証しません。

```text
$amadeus --doctor
```

## メッセージング

Amadeus は `team-msg.sh` を同梱しません。本ガイドに live の送受信レシピは
ありません。経緯は
[チームメッセージングバックエンド](team-messaging.ja.md) を参照してください。

## 選挙の実行

配布される `amadeus-election` skill は CLI を directive loop として駆動します。
`electionId`、`kind`、`question`、`choices`、`voters` を含む定義を用意し、
開きます:

```json
{
  "electionId": "E-EXAMPLE-1",
  "kind": "zero-confirm",
  "question": "Approve the proposal?",
  "choices": [
    { "internalNo": 1, "label": "approve", "description": "Adopt the proposal as written." }
  ],
  "voters": ["e1"]
}
```

各 choice は任意の `description` を持てます。有権者ごとの盲検ビューは選挙の
`question` と各 choice の `description` を繰り返すので、自分のビューだけを
読んでも動議と各選択肢の意味が分かります。`description` が無い choice も有効
で、その場合キーはビューから単に欠落します。

```bash
bun {{HARNESS_DIR}}/tools/amadeus-election.ts open --file election.json
bun {{HARNESS_DIR}}/tools/amadeus-election.ts next --election E-EXAMPLE-1
```

各 `next` 応答を読み、それが指名する verb と report だけを実行します:

1. `collect-wait` のときは投票を集め、
   `vote --election E-EXAMPLE-1 --file ballot.json` で提出します。
2. 別の実行可能な directive のときは `--election E-EXAMPLE-1` 付きでその
   `verb` を実行し、続けて
   `report --election E-EXAMPLE-1 --result <reported-result>` を実行します。
3. `hold` のときは停止し、理由と選択肢を人間へ渡します。人間が決めたあと
   `report --election E-EXAMPLE-1 --result hold-resolved
   --resolution <human-decision>` を使います。
4. `next` が `done` を返すまで繰り返し、出力された選挙レコードパスを報告します。

`status --election E-EXAMPLE-1` は読み取り専用の検査コマンドです。skill も
本ガイドも、directive や人間の判断を独自判断で置き換えません。

## 運用モード契約

`AMADEUS_OPERATING_MODE=team` が唯一のモードマーカーです。無ければソロモード
です。メッセージング登録、メンバー数、保存済みセッションはチームモードの証拠
ではありません。

両モードとも同じルール層、証拠要件、検証基準、エスカレーション境界を保ちます。
チームモードは協調、独立レビュー、worktree 隔離、選挙をメンバーへ割り当てます。
ソロモードは該当する責務を順次行い、不在のメンバーや票を捏造しません。

本節は利用者向け要約です。規範はチームの `memory/team.md` です。
