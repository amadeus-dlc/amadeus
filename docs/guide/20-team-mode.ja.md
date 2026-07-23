# チームモード

> 言語: [English](20-team-mode.md) | **日本語**

チームモードは、leader と複数の engineer が隔離された worktree で Amadeus
ワークフローを実行する、オプトインの実行形態です。ソロ実行と同じワークフロー・
品質規則を使い、責務の分担と協調方法だけが異なります。

## 概要

チーム launcher は1つの herdr workspace 内で Claude Code または Codex の
メンバーを起動し、メッセージ transport を接続して、全メンバーのセッションへ
`AMADEUS_OPERATING_MODE=team` を設定します。この完全一致のマーカーがなければ、
Amadeus はソロモードで動作します。

チームモードは任意です。独立した builder や reviewer、チーム選挙が有用な場合に
利用してください。通常の Amadeus ワークフローに必須ではありません。launcher の
対応 OS は macOS と Linux です。Windows のチームモードは対象外です。

## 前提条件

チームを起動する前に、次のツールをインストールしてください。

| ツール | 動作確認バージョン | 入手先と実行時契約 |
|--------|--------------------|--------------------|
| [Bun](https://bun.sh) | 1.3.13 | `bun` を `PATH` 上で実行できる必要があります。 |
| [herdr](https://herdr.dev) | 0.7.1 | `herdr` を `PATH` 上で実行できる必要があります。`HERDR` で別の実行ファイルを指定できます。 |
| [agmsg](https://github.com/j5ik2o/agmsg) | 1.1.6 | skill を `$HOME/.agents/skills/agmsg` へインストールし、scripts を実行可能にします。`AGMSG_ROOT` と文書化された script override で別のインストール先を指定できます。 |

これらは本ガイドで確認したバージョンであり、継続的な互換性保証ではありません。
3ツールのインストール、更新、および launcher が解決できる場所への配置は利用者の
責務です。Amadeus はこれらを同梱せず、インストール経路も保証しません。

チームを作成する前にインストール状態を確認します。

```text
$amadeus --doctor
```

health report には、doctor の既存の合否を変更しない advisory 節が含まれます。

```text
Team Mode prerequisites:
  herdr: /resolved/path/to/herdr
  agmsg: /resolved/path/to/send.sh
```

不足しているツールは `not found` に続けて公式入手先と本ガイドへのリンクを表示します。
launcher も worktree や herdr session を作成する前に同じ検査を行い、非対応 OS または
前提ツールの不足時は早期終了します。

## セットアップ

インストール済みハーネスから launcher を実行します。`{{HARNESS_DIR}}` は `.claude`
や `.codex` など、利用中のハーネスディレクトリを表します。

```bash
# Claude メンバー。既定は engineer 6名
bash {{HARNESS_DIR}}/tools/team-up.sh

# Codex メンバー
bash {{HARNESS_DIR}}/tools/team-up.sh --codex

# 小さいチーム、または独立した名前付きチーム
bash {{HARNESS_DIR}}/tools/team-up.sh -4
bash {{HARNESS_DIR}}/tools/team-up.sh --instance alpha
```

launcher は各メンバーにチーム identity とメッセージ環境を設定します。messaging
backend は新規 run の作成時だけ選択してください。既定は `agmsg` で、選択結果は
run の再開時にも維持されます。

```bash
bash {{HARNESS_DIR}}/tools/team-up.sh --msg agmsg
bash {{HARNESS_DIR}}/tools/team-up.sh --msg herdr
```

同じインストール済み tools ディレクトリからメッセージを送信・確認します。

```bash
bash {{HARNESS_DIR}}/tools/team-msg.sh send e1 "提案をレビューしてください。"
bash {{HARNESS_DIR}}/tools/team-msg.sh read leader
```

role は `leader`、`e1`、`e2` などです。backend の詳細、配送の意味論、再開時の
挙動は [Team Messaging Backend](team-messaging.md) を参照してください。

## 選挙の実行

配布された `amadeus-election` skill は、CLI を directive loop として駆動します。
`electionId`、`kind`、`question`、`choices`、`voters` を持つ選挙定義を用意し、
選挙を開始します。

```json
{
  "electionId": "E-EXAMPLE-1",
  "kind": "zero-confirm",
  "question": "提案を承認しますか？",
  "choices": [{ "internalNo": 1, "label": "approve" }],
  "voters": ["e1"]
}
```

```bash
bun {{HARNESS_DIR}}/tools/amadeus-election.ts open --file election.json
bun {{HARNESS_DIR}}/tools/amadeus-election.ts next --election E-EXAMPLE-1
```

各 `next` 応答を読み、応答が指定した verb と report だけを実行します。

1. `collect-wait` では ballot を集め、
   `vote --election E-EXAMPLE-1 --file ballot.json` で提出します。
2. その他の実行可能な directive では、指定された `verb` を
   `--election E-EXAMPLE-1` 付きで実行し、その後
   `report --election E-EXAMPLE-1 --result <reported-result>` を実行します。
3. `hold` では停止し、その理由と選択肢を人間へ提示します。人間の裁定後、
   `report --election E-EXAMPLE-1 --result hold-resolved
   --resolution <human-decision>` を使います。
4. `done` が返るまで `next` を繰り返し、最後に出力された選挙 record path を
   報告します。

`status --election E-EXAMPLE-1` は読み取り専用の確認コマンドです。skill も本ガイドも、
directive または人間の裁定を独自判断で置き換えません。

## Operating Modes 契約

`AMADEUS_OPERATING_MODE=team` が唯一のモードマーカーです。チーム launcher は起動した
セッションへこの値を設定し、値がなければソロモードになります。メッセージ登録、
メンバー数、保存済み session は、チームモードが有効である根拠にはなりません。

どちらのモードも同じ rule layer、証拠要件、検証基準、エスカレーション境界を保ちます。
チームモードは協調、独立レビュー、worktree 隔離、選挙をメンバー間で分担します。
ソロモードは適用可能な責務を順番に実行し、存在しないメンバーや投票を捏造しません。

本節は利用者向けの要旨です。運用規範の正本はチームの `memory/team.md` であり、
workspace ごとに特化される場合があります。

## 対応プラットフォーム

チーム launcher の対応範囲は次のとおりです。

- macOS (`Darwin`)
- Linux

Windows はチームモードの対応範囲外です。launcher は herdr や agmsg の検査および
team state の作成より前に、その他の OS を拒否します。この制限はチーム launcher
に対するものであり、Amadeus の全 standalone command に対する制限ではありません。
