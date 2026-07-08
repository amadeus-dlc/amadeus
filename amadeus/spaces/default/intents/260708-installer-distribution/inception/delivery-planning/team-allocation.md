# Team Allocation — installer-distribution

> ステージ: delivery-planning (2.8) / 作成: 2026-07-08
> 出典: `bolt-plan.md`、team-formation は composed スコープにより SKIP

## 割当て

team-formation が SKIP のため、**全 Bolt を amadeus-developer-agent(AI)が実行**し、人間(メンテナ)はゲート承認・npm スコープ確保・タグ発行・publish 実行を担う。

| Bolt | 実行 | 人間の関与 |
|------|------|-----------|
| Bolt 1(skeleton) | amadeus-developer-agent | **単独ゲート承認(必須)**+ラダープロンプト回答 |
| Bolt 2〜5 | amadeus-developer-agent | Construction Autonomy Mode(ラダーで選択)に従う。失敗時は halt-and-ask |
| publish/タグ | — | メンテナの手動作業(手順書に従う) |

## Program Board

チーム数1のため該当なし。
