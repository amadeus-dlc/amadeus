# Intent Capture Questions

**Mode:** Chat

**ユーザー承認**: 2026-07-17T19:17:58Z — Q1 の framing と Q2 の統合要約を Confirm

## Q1. Intent framing の確認

2026-07-17 に改訂された Issue #1157 と grilling の裁定から、次のように読み取っている。

- **問題**: `AMADEUS_USE_SWARM` の旧 boolean 契約とハーネスごとに非対称な worker 実行方式が、選択結果の予測可能性と監査可能性を損なっている。
- **主な対象者**: Claude／Codex で Amadeus Construction を運用・保守する利用者と開発者。
- **成功**: ハーネス相対の三つのモードが決定的に解釈され、不正値は fail-closed、他ハーネス専用値は loud-degrade し、Codex の session 内 native subagent fan-out が実測で成立する。レフェリーの意味論は維持し、変更規模は conductor 側選択ロジック中心に抑える。
- **着手理由**: 旧 Intent／PR #982 が 25 ファイル・18,342 行まで肥大化して閉じられたため、grilling で確定した狭い契約として軽量に再始動する。

この framing に修正・補足したい点があるか。なければ `done` と回答する。

- A. 修正なし。`done` として要約へ進む
- X. Other（修正・補足を自由記述）

[Answer]: A. 修正なし。`done` として要約へ進む — User input: `1` — 2026-07-17T19:16:07Z — Mode: Chat

## Q2. 統合要約の確認

Q1 で確定した問題・対象者・成功条件・着手理由に、曖昧さや相互矛盾は検出されなかった。この要約を `intent-statement.md` と `stakeholder-map.md` の生成基準として確定するか。

- A. Confirm（この要約で成果物を生成する）
- B. Request changes（修正点を提示する）
- X. Other（別の進め方を自由記述）

[Answer]: A. Confirm（この要約で成果物を生成する） — User input: `1` — 2026-07-17T19:17:58Z — Mode: Chat
