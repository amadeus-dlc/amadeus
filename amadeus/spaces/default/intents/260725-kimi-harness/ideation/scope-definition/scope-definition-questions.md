# Scope Definition 質問 — 260725-kimi-harness

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: 全2問ともユーザー本人の HUMAN_TURN 直接回答 — Guide me 対話で1問ずつ回答を受領)。合意サマリのユーザー承認タイムスタンプ: 2026-07-25T06:28:01Z(「1」= 確認OK)
> モード: Guide me(対話式)
> 事前整理済みの裁定(質問対象外):
> - live driver + journey 作成は Must(intent-capture Q4=A)
> - 外部プロジェクトへの npm 導入 E2E 検証はスコープ外(intent-capture Q1=A で C を不採用)。ただしインストーラの kimi 列挙対応自体は公開契約の完結として Must(scope-definition:c2 の既定)
> - 優先順位は dependency-first + risk-first(scope-definition:c3 の既定)。payload 実機差異リスク(R1)を持つ adapter を先行
> - Kimi plugin 配布・kimi-ultra ドライバ・PostCompact 再注入・mcp.json 連携は Won't(承認済みプラン)

## Q1. construction swarm を kimi で有効化するか

事実(自己調査): swarm の dispatch 表は `core/tools/amadeus-swarm.ts` の `HARNESS_VALUES`(subagent 報告: :100)にハーネス識別子を足すと `resolve --harness kimi` が通り、subagent フロア(ネイティブ subagent fan-out)が使える。Kimi は Agent/AgentSwarm ツールをネイティブに持つ。cursor/opencode はこの表に入れず swarm 非対応で出している。

- A. 有効化(推奨): `HARNESS_VALUES` に `"kimi"` を追加し、subagent フロアの swarm を有効にする。テスト負担は resolve の分岐テスト追加が主で、fan-out 自体は codex と同型
- B. 非対応で出す: cursor/opencode と同様、swarm は将来intent。conductor 直列実行のみをサポートする
- X. Other (please specify)

[Answer]: A — 有効化(HARNESS_VALUES に kimi 追加。subagent フロアの swarm を有効にする)(2026-07-25, Guide me)

## Q2. セッションスキル(amadeus-session-cost / amadeus-replay / amadeus-outcomes-pack / amadeus-grilling / amadeus-mirror)の同梱範囲

事実(自己調査): セッションスキルは read-only のユーティリティ群(subagent 報告: core/skills に6本)。claude は全量、opencode は5本(mirror なし)、cursor は amadeus-mirror のみ同梱している。runner-gen デフォルトは全量を `<harnessDir>/skills/` に生成する。

- A. 全量同梱(推奨): 6本すべて同梱する。read-only で副作用がなく、runner-gen デフォルトのままで追加作業がない
- B. 最小同梱: cursor 同様の縮退セットにする。生成物を絞る分だけ emit/除外ロジックが必要になる
- X. Other (please specify)

[Answer]: A — 全量同梱(セッションスキル6本すべて同梱。runner-gen デフォルトのまま)(2026-07-25, Guide me)