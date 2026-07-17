# Delivery Planning — 明確化質問

intent: `260715-opencode-cursor-harness`(Issue #626)
起草: 2026-07-16 / conductor e3(amadeus-delivery-agent ペルソナ、amadeus-architect-agent 支援)
上流入力: requirements.md、application-design の components.md、units-generation の unit-of-work.md / unit-of-work-dependency.md / unit-of-work-story-map.md、practices-discovery の team-practices.md。

> **選挙不要判定(E-OC1 3段順序、[Answer] は leader 承認後に記入)**: 起草時の既決照合の結果、以下4問はすべて既決ノルム・承認済み上流成果物・裁定に帰着すると判定。真に未決の判断は不在(担当者の実割当は leader のディスパッチ権限事項であり質問対象にしない — leader-dispatch-authority)。
>
> 根拠種別(1問1行):
> Q1 = 既決(team.md「Construction の成果は Bolt ごとに PR/スカッシュマージ」+ units-generation 承認済みバッチ構成)
> Q2 = 既決(org.md walking-skeleton — greenfield 要素は Bolt 1 単独ゲート+出荷後ラダープロンプト)
> Q3 = 既決(org.md「worktree のベースブランチは main、マージターゲットも main」+ c6 非交差判定)
> Q4 = 既決(team.md parallel-bolts 上限4+role-model — 自己実装の自己レビュー禁止)

## Q1: Bolt 分割は Unit と 1:1 でよいか?

- A. はい — Bolt = Unit 1:1(4 Bolt)、各 Bolt を1 PR でスカッシュマージ。バッチ構成は units-generation 承認済み(batch 1: U1 / batch 2: U2+U3 / batch 3: U4)
- B. 複数 Unit を1 Bolt に束ねる
- C. Unit をさらに分割する
- D. 一括 PR
- E. 不明
- X. その他

[Answer]: A

## Q2: ゲート運用は?

- A. Bolt 1(U1 opencode-skeleton)は walking-skeleton マーカー付きで単独・ゲート付き実行。出荷後にラダープロンプト(自律 or 全ゲート)をユーザーへ提示し、選択を Construction Autonomy Mode として永続化(org.md 既決そのまま)
- B. 全 Bolt ゲートで固定
- C. 最初から自律
- D. ゲートなし
- E. 不明
- X. その他

[Answer]: A

## Q3: ブランチ・worktree 運用は?

- A. 各 Bolt は main ベースの短命ブランチ+worktree 分離(org.md 既決)。batch 2 の U2/U3 は着手前に c6 の実 diff 交差判定を再評価(静的には非交差 — U2 は harness/opencode/、U3 は harness/cursor/)
- B. 単一ブランチで直列
- C. intent ブランチを切ってそこから分岐
- D. 不明
- X. その他

[Answer]: A

## Q4: 並行度とレビュー体制は?

- A. 同時アクティブ builder ≤4(team.md 上限内、実際は batch 2 の最大2)。レビューは実装者以外(role-model — 自己レビュー禁止)、PR ごとに即時依頼。実割当は leader のディスパッチに従う
- B. 並行なしで全直列
- C. レビュー省略
- D. 不明
- X. その他

[Answer]: A
