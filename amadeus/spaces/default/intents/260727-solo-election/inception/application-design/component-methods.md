# Component Methods — solo-election

上流入力(consumes 全数): requirements.md(FR の AC を写像)、components.md(変更対象)、architecture.md(現行シグネチャ・tally 判定順の実測)、component-inventory.md(tally/HOLD_RESOLUTIONS の所在特定)、team-practices.md(SKILL 内挿文の規則語回避 = C-02 TS 正本主義の実践面)。

## tally(amadeus-election-model.ts)

現行シグネチャ `tally(election: Election, ballots: Ballot[]): TallyResult` は不変。内部規則のみ拡張:

```
resolved = resolveBallots(ballots)                 // 不変
counts   = GoA 集計                                 // 不変
if (blocks >= 1)              → hold "block"        // 不変・最優先
if (election.voters.length === 2) {                 // FR-05: 宣言 voters キー(輸送非依存)
  if (counts.discuss >= 1)    → hold "discussion-needed"   // (i) 閾値 2→1
  if (counts.abstain >= 1)    → hold "quorum-short"        // (ii) 単票成立禁止
  if (counts.favor === 1 && counts.against === 1)
                              → hold "split"               // (iii) 新 HoldReason
} else {
  if (counts.discuss >= 2)    → hold "discussion-needed"   // 既存
  if (favor+against === 0)    → hold "quorum-short"        // 既存
}
choice winner / tie                                  // 不変
```

- `HoldReason` union へ `"split"` を追加(model.ts:419)。`TallyResult` 形は不変。
- 判定順序は既存の first-match(block → discussion → quorum → winner)を保存し、2体分岐は discussion/quorum/split を内包する(状態数×指令種×結果値の個数照合は functional-design で機械確認 — cid:functional-design:state-machine-cardinality-check)。

## HOLD_RESOLUTIONS(amadeus-election.ts:81-86)

`split: { adopted: "tallied", rejected: "tallied", reopen: "collecting" }` を追加 — block と同型(人間が採用/棄却/再審を決める)。tie(choice:<n>)とは別語彙(ADR-1)。解決は既存契約どおり tally.json へ先に永続化(:272-285 不変)。

## SKILL.md 内挿点(4節・t242 契約内)

| 節 | 内挿内容 |
|---|---|
| 起動 | ソロ時の投票者(subagent-1/2)と発動類型(設計逸脱・ブロッカー・§13 選定+明示指示)、spawn 不能時の loud 1行告知と人間裁定への切替(FR-09/10) |
| 転送 | distribute 指令時: DeliveryDirective ごとに subagent を起動し、election id と view path のみを渡す(推奨・分析・他票状態の同梱禁止)。投票完了までターンを終えない定型・票未着時の再起動1回→人間へ(FR-02/03/04) |
| 人間委譲 | split・棄権・再議論後の 5 残存は人間の裁定事項(FR-05/08) |
| 終了 | 不変(記録固定の確認のみ既存文) |

内挿文は BR-K1 禁止語彙(賛成側/反対側/定足数/シャッフル等の規則語)を使わない — 集計規則は TS 正本(C-02)。

## spawn プロンプト定型(conductor 手順 — SKILL 転送節に固定)

構成要素は3つのみ: (1) DeliveryDirective の electionId (2) viewPath (3) 固定手順文(view を読む→独立に証拠を実測→ballot JSON を作成(voterKind: "subagent"、voter: 指定名)→ vote verb を自分で実行→受理 JSON を確認してから完了報告)。FR-02 の AC はこの構成のテンプレート検査(grep)で機械確認する。
