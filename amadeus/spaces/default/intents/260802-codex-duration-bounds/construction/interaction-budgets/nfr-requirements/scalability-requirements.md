# Scalability Requirements — interaction-budgets

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Cardinality Bounds

`requirements.md` FR-04、`business-logic-model.md` のInteractionInstance、`business-rules.md` BR-IB-01〜18、`technology-stack.md` の共有core投影を前提とする。

| Dimension | Bound |
|---|---|
| primary question／stage | Depth別hard cap 4／8／12 |
| follow-up／stage instance | 1 batch interaction。batch内のmaterial itemsはprimary hard cap以下 |
| review／stage instance | ArtifactSet変更を跨いで合計最大2 iterations |
| delivery evidence | 同じdeliveryKeyへ集約、replayでcounter増分0 |
| distribution | 7 package／影響5 self-install面で同一policy version |

## Growth Rules

- InteractionInstance lookupはsemanticKey indexでO(1)、stage内全質問scanによるidentity再構築をしない。
- question本文の言い換え、再描画、resume、compactはrecord数を増やさない。
- reviewのBudgetSubjectはstage instanceだけで一意に固定する。artifact contentが変わったreviewはiteration evidence上の新ArtifactSetだが、counter identityやcapを変更・resetしない。
- follow-upを別ambiguity keyへ細分化してhard capを回避せず、stage instanceあたり1つのbatchへ集約する。
- ArtifactSet Aでcounter=`cap-1`、ArtifactSet Bへ更新後のcap回目、さらにArtifactSet Cでcap+1拒否となる境界testをblockingにする。
- adapter別counter store、Codex別cap、unbounded `+` guidanceを禁止する。
