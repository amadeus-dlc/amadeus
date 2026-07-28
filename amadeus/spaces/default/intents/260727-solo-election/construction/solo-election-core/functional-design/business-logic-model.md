# Business Logic Model — solo-election-core (U1)

上流入力(consumes 全数): requirements.md(FR-05/06/07 の AC)、component-methods.md(tally 擬似コードの設計正本)、decisions.md(ADR-1/2)、unit-of-work.md(U1 スコープ)、unit-of-work-story-map.md(「割れたら」段のジャーニー = hold 分岐の利用者面)、components.md(変更対象の所在と規模)、services.md(正常系/異常系シーケンス — 判定順序の実行時文脈)。

## tally 2体分岐の確定ロジック

`tally(election, ballots)`(amadeus-election-model.ts:440、シグネチャ不変)の内部:

```
resolved = resolveBallots(ballots)                       // 不変(:293-300、amend 後着勝ち)
counts   = GoA 集計(FAVOR={1,2,3,6} :433 / AGAINST={7,8} :434) // 不変
1. blocks >= 1                     → hold "block"        // 不変・最優先(:455)
2. if election.voters.length === 2:                      // ADR-2: 宣言 voters キー
   2a. counts.discuss >= 1         → hold "discussion-needed"
   2b. counts.abstain >= 1         → hold "quorum-short"
   2c. counts.favor === 1 && counts.against === 1
                                   → hold "split"        // ADR-1: 新 HoldReason
3. else(voters.length !== 2):
   3a. counts.discuss >= 2         → hold "discussion-needed"  // 不変(:456)
   3b. favor + against === 0       → hold "quorum-short"       // 不変(:457)
4. choice winner / choice tie                            // 不変(:461-476)
```

判定順序は既存 first-match(block → discussion → quorum → split → winner)を保存。2c は 2a/2b を通過した後にのみ到達する(2体で discuss=0・abstain=0 が保証された状態での favor/against 対称判定 — 到達時の残余組合せは {favor2}, {favor1,against1}, {against2} の3通りで、{favor2}/{against2} は 4 へ落ちて choice 判定、{favor1,against1} のみ split)。

## 状態機械の個数照合(cid:functional-design:state-machine-cardinality-check)

| 軸 | 変更前 | 変更後 | 検算 |
|---|---|---|---|
| 選挙状態 | 7(draft/open/collecting/tallied/rendered/recorded/hold) | 7(不変) | hold は reason-typed の1状態 |
| directive kind | 7(distribute/collect-wait/tally-ready/render/verify/done/hold) | 7(不変) | |
| ReportResult | 5(distributed/tallied/rendered/verified/hold-resolved) | 5(不変) | |
| HoldReason | 4(tie/block/quorum-short/discussion-needed) | **5**(+split) | TallyResult の直和は 1(established)+5(hold reason)=6 値 |
| HOLD_RESOLUTIONS エントリ | tie:0(choice:n 別扱い)+block:3+quorum:2+discussion:1 = 6 語彙 | +split:3(adopted/rejected/reopen)= **9 語彙** | Record<HoldReason,…> の型検査が split キー追加を強制(amadeus-election.ts:81) |

鳩の巣検算: 新規に増えるのは HoldReason 1値と解決語彙3語のみ。状態・指令・report 結果は増えない(split は既存 hold 状態の新 reason であり、既存 hold-resolved 経路で解決される)。

## TLA 形式モデルの対応(ADR-1 波及先 (a))

FormalElection.tla: Voters を 2体インスタンス化可能に(現行 {V1,V2,V3} :5 固定)、HoldReasons へ "SPLIT"(:24)、HoldReason(r) 式(:51-56)へ上記 2a-2c の分岐を追加。TLC 完全探索(two-layer-verification-posture)を build-and-test 段で発動し、NOT_DETECTED 主張は completion marker+state 統計が揃う完走のみ(cid:application-design:finite-exploration-not-detected-proof)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T15:06:19Z
- **Iteration:** 1
- **Scope decision:** none

2体分岐の15組合せ全数検算・状態機械個数照合(語彙6→9)再計算・引用12点実在確認すべて一致。Minor 1件(:439→:440)は conductor が即時是正済み。

### Findings

- None
