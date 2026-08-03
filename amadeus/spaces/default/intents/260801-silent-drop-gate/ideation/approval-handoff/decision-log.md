# Ideation Decision Log — no-silent-drop

## 上流と記録方針

本ログは `intent-statement.md`、`scope-document.md`、`intent-backlog.md`、`feasibility-assessment.md`、`constraint-register.md` と監査 shard の HUMAN_TURN / QUESTION_ANSWERED / GATE_APPROVED を統合する。`competitive-analysis.md`、`team-assessment.md`、`wireframes.md` は対応ステージが SKIP のため未生成であり、その不在自体を D-15 に記録する。

日時は UTC。ユーザー回答、承認ゲート、上流成果物で確定した判断だけを記載する。

## 意図と成功指標

| ID | 日時 | 決定 | 根拠 |
|---|---|---|---|
| D-01 | 2026-08-01T23:34:45Z | 無音化3形態をすべて対象にする | Intent Capture Q1 |
| D-02 | 2026-08-01T23:35:27Z | 成功を「新規違反の CI fail 実証」と「baseline 単調減」の2指標で測る | Intent Capture Q2 |
| D-03 | 2026-08-01T23:37:13Z | #1878・#1963・#1874 を同族として扱い、#1906 は別 intent とする | Intent Capture Q3。D-06 で #1963 の扱いを回帰検証へ更新 |
| D-04 | 2026-08-01T23:37:46Z | 受益者をフレームワーク開発者と Amadeus ユーザーの2層とする | Intent Capture Q4 |
| D-05 | 2026-08-01T23:38:52Z | initiative trigger に人力棚卸しの反復と S1 集中の両方を使う | Intent Capture Q5 |
| D-06 | 2026-08-02T00:13:10Z | #1963 は [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の外部修正を採用し、重複実装せず回帰検証だけ行う | Feasibility Q1 |

## 技術・品質制約

| ID | 日時 | 決定 | 根拠 |
|---|---|---|---|
| D-07 | 2026-08-02T00:14:02Z | 走査対象を `core`、`harness`、`scripts` の手書き正本へ限定する | Feasibility Q2 |
| D-08 | 2026-08-02T00:14:26Z | `intentional-drop` は理由必須・1ノード限定・免除件数 shrink-only とする | Feasibility Q3 |
| D-09 | 2026-08-02T00:15:26Z | no-silent-drop CI 単独ステップを15秒以内にする | Feasibility Q4 |
| D-10 | 2026-08-02T00:35:03Z | 初期偽陽性率5%以下、fixture 分類100%を必須にする | Feasibility Q5 |
| D-11 | 2026-08-02T00:35:44Z | ツール・ルール・baseline・走査の内部異常をすべて型付き fail-closed にする | Feasibility Q6 |
| D-12 | 2026-08-02T01:19:33Z | baseline、Must、依存順、レビュー単位、期限の Scope Definition Q1〜Q5 で推奨案を採用する | Scope Definition 一括回答 |
| D-13 | 2026-08-02T01:26:20Z | D-12 のレビュー単位だけを補正し、「単一 initiative、Construction は walking-skeleton を含む Bolt ごとの独立 [PR](https://github.com/amadeus-dlc/amadeus/pulls)」とする | Approval & Handoff Q1、team.md 規範との整合 |

## スコープ・Delivery・省略ステージ

| ID | 日時 | 決定 | 根拠 |
|---|---|---|---|
| D-14 | 2026-08-02T01:20:08Z | 全 Must-have、U0〜U6、S-01〜S-08を固定日なしの完了条件とする | Scope Definition 統合要約承認 |
| D-15 | 2026-08-01T23:28:59Z | Market Research、Team Formation、Rough Mockups を SKIP とする | `amadeus-state.md` の scope configuration。内部 self-feature で外部市場・UI・新規組織編成がない |
| D-16 | 2026-08-02T01:26:20Z | 外部予算・AWS 資源・専任運用要員を追加せず、詳細な Unit / Bolt / 担当は Inception で確定する | Feasibility と Approval & Handoff の整合確認 |

## ステージ承認

| ステージ | 承認日時 | 結果 |
|---|---|---|
| Intent Capture | 2026-08-02T00:04:54Z | Approve |
| Feasibility & Constraints | 2026-08-02T01:16:23Z | Approve |
| Scope Definition | 2026-08-02T01:23:11Z | Approve |

## 未解決事項と変更管理

Ideation 終了時点で、Inception 進入を妨げる未回答判断はない。次は未解決の仕様ではなく、後続ステージで実測・詳細化する項目である。

- 初期 census 件数と実測偽陽性率
- #1878 / #1874 の正確な callsite 集合
- Proto-Unit U0〜U6 から最終 Unit / Bolt への分解
- [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) 統合後の競合有無

C-01〜C-16、S-01〜S-08、D-13 の Bolt ごとの [PR](https://github.com/amadeus-dlc/amadeus/pulls) 境界を変える場合は、影響と代替案を示してユーザー裁定へ戻す。
