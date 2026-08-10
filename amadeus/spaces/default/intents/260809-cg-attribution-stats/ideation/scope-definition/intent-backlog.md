# Intent Backlog — CG 観測可能区間と帰属不能残余

- **Intent**: `260809-cg-attribution-stats`
- **Source**: [Issue #2695](https://github.com/amadeus-dlc/amadeus/issues/2695)、[intent-statement.md](../intent-capture/intent-statement.md)、[scope-document.md](./scope-document.md)
- **Prioritization**: MoSCoW で境界を固定し、WSJF と dependency／risk で実装順だけを決める。

## Upstream Inputs

- `intent-statement` と Issue #2695 が能力・価値・成功条件の正本である。
- `feasibility-assessment` と `constraint-register` は本スコープでは存在しないため、未記載内容を推定しない。後続 reverse-engineering／application-design と既存 rules を制約確認の場とする。
- ユーザー裁定により Issue 本文の `In` と完了条件 1〜10 は分割後も全件 Must である。

## Prioritization Policy

MoSCoW は削除可能性ではなく境界を表す。

- **Must Have**: CAP-01〜CAP-10 と完了条件 1〜10。いずれかを欠けば Intent は未完了。
- **Should Have**: なし。Issue の `In` を Should へ降格しない。
- **Could Have**: なし。Issue にない追加改善を混入しない。
- **Won't Have**: Issue が明記した `Out` の5項目だけ。

WSJF は Cost of Delay を「監査可能な会計の成立」「誤推定の回避」「後続を unblock する度合い」で相対評価する。数値は scope-stage の計画仮説であり、後続の設計見積もりで更新できるが、MoSCoW 境界は変えない。

## Prioritized Proto-Units

| Order | Proto-Unit | MoSCoW | Value / Time / Risk | Relative size | WSJF | Depends on |
|---|---|---|---:|---:|---:|---|
| 1 | PU-1 Population & Window Identity | Must | 5 / 3 / 5 = 13 | 5 | 2.60 | なし |
| 2 | PU-2 Eligible Lifecycle Intervals | Must | 5 / 3 / 5 = 13 | 5 | 2.60 | PU-1 の window 契約 |
| 3 | PU-3 Attribution Accounting Model | Must | 5 / 3 / 5 = 13 | 5 | 2.60 | PU-1、PU-2 |
| 4 | PU-4 CLI & Three-Format Reporting | Must | 5 / 2 / 3 = 10 | 5 | 2.00 | PU-3 |
| 5 | PU-5 Parity, Compatibility & Pipe Proof | Must | 5 / 3 / 5 = 13 | 5 | 2.60 | PU-1〜PU-4 |

同率時は dependency unblock と risk reduction を優先するため、表の順序を採る。PU-5 の WSJF は高いが、検証対象が揃うまで開始できない。ただし各 PU の赤いテストと renderer parity scaffolding は対応する実装と同時に追加する。

## PU-1 Population & Window Identity

**Outcome:** measured population を変えず、attribution に適格な window を決定的に選べる。

- `scanCorpus → buildWindows → subtractIdle` の既存 measured 統計を保持する。
- `netSeconds <= 0` を `zero-net-attribution` として分離する。
- 同一 intent×stage の FIFO 衝突 group 全体を `ambiguous-window-identity` として fail-closed にする。
- 閉じない group の pending start を診断へ残す。
- attribution 0件の安全な stage slug は正常な空レポート候補として扱う。

**Proof:** zero-net、depth 2以上の pending、閉じる／閉じない衝突 group、既存 measured stats 非退行の characterization／unit tests。

## PU-2 Eligible Lifecycle Intervals

**Outcome:** event が自分で証明できる lifecycle interval だけを抽出できる。

- outer event と inner `Event Set` を canonical event representation へ展開する。
- sensor `Fire id`、execution `operationId`、unit-pool `attemptId` の start／terminal pairing を実装する。
- stage 属性、identity、start、terminal の欠落・重複・非正順を candidate×reason で数える。
- BOLT／SWARM／SUBAGENT／LOOP_MONITOR／MERGE_DISPATCH／transaction envelope は必要属性が揃う場合だけ採用する。
- window containment、timestamp、意味の読み替えによる補完を禁止する。

**Proof:** 別 stage 同秒、missing terminal、duplicate lifecycle、envelope 内外の stage 属性、現 corpus の採用／不採用 inventory tests。

## PU-3 Attribution Accounting Model

**Outcome:** interval の重複を排除し、観測可能時間と帰属不能残余の会計を1つの canonical model で表せる。

- integer-second `[start,end)`、window clip、idle subtraction を実装する。
- category 内 union と全 category union を分離する。
- category duration と構成比の異なる母集団を仕様どおり保持する。
- 各適格 window で2つの恒等式と有限・非負値を保証する。
- coverage、overlap、outlier、missing instrumentation、methodology の semantic fields を定義する。

**Proof:** nested／parallel／cross-category overlap、idle intersection、0-second clip、property／table tests。会計規則を壊す mutation で赤くなること。

## PU-4 CLI & Three-Format Reporting

**Outcome:** 同じ semantic model を人間と automation が再実行・比較できる。

- `--stage`、既定 `code-generation`、`--outliers` 0〜100／既定10／不正値 exit 2を実装する。
- outlier の決定的 tie-break と0件表示を実装する。
- measurement ref、category、coverage、overlap、diagnostics、methodology を Markdown／CSV／JSON に追加する。
- JSON `null` と text `n/a`、seconds／rate の型対応を固定する。
- observed fact と `candidateBoundary` hypothesis を分離する。

**Proof:** renderer 出力を canonical model へ再解釈した parity、CLI 境界値、空母集団、実 corpus `--stage code-generation --outliers 10`。

## PU-5 Parity, Compatibility & Pipe Proof

**Outcome:** 新しいレポートが既存契約を壊さず、実サイズでも完全に consumer へ届く。

- Markdown／CSV／JSON の母集団・規則・除外件数を deep-equal 相当で比較する。
- stage duration、sensor、model、reviewBuckets、既存 header／section／key を append-only で維持する。
- 出力追加後の3形式をそれぞれ 65,536 bytes 超 fixture にする。
- full capture と pipe の producer／consumer exit、byte length、digest を比較し、JSON は `jq empty` を通す。
- 現行 t486／t487 と新規 regression を source と Codex self-install surface で検証する。

**Proof:** completion criteria 1〜10 の traceability matrix がすべて green で、既存 suite に回帰がないこと。

## Completion-Criteria Traceability

| Issue #2695 criterion | Primary proto-Unit | Supporting proto-Units |
|---:|---|---|
| 1 | PU-2 | PU-1、PU-3 |
| 2 | PU-3 | PU-1 |
| 3 | PU-3 | PU-2 |
| 4 | PU-1、PU-2 | PU-4 |
| 5 | PU-4 | PU-1〜PU-3、PU-5 |
| 6 | PU-4 | PU-3 |
| 7 | PU-1〜PU-3 | PU-5 |
| 8 | PU-4 | PU-5 |
| 9 | PU-5 | PU-1〜PU-4 |
| 10 | PU-5 | PU-4 |

## Value Delivery Sequence

1. **Risk foundation:** ambiguous identity と eligibility を fail-closed にし、誤帰属を防ぐ。
2. **Accounting skeleton:** 1つ以上の eligible lifecycle を end-to-end で interval→union→semantic model→3形式へ通し、walking skeleton 候補とする。
3. **Inventory completeness:** Issue が列挙する candidate、diagnostics、statistics を追加する。
4. **Contract completeness:** CLI 境界、空母集団、parity、後方互換を固定する。
5. **Scale proof:** 実 corpus と 65,536 bytes 超の3形式 pipe を完走させる。

各段階は検証可能な増分だが、5段階すべてが完了するまで Issue #2695／本 Intent を完了扱いにしない。

## Backlog Guardrails

- Proto-Unit 分割はデリバリー順を示すだけで、Issue スコープの分割・延期・別 Intent 化を許可しない。
- 新規 audit event、window identity 改修、効率化施策、モデル／ハーネス帰属は追加しない。
- #2700 解消済みを理由に PU-5 の新出力実サイズ検証を削除しない。
- 新しい instrumentation candidate は observed fact から分離して別 Issue 候補として記録する。
