# Feasibility Assessment: Solo Standing Grant

## Executive Verdict

Issue #1466の実現は、現行の監査eventモデルとstate machineを維持したまま可能である。新しい永続設定、外部service、AWS resource、規制対応基盤は必要ない。既存のgrant parse・探索・provenance検証・gate分類・approval commitには再利用可能なseamがある。

ただし、team modeのstanding delegation経路をsolo modeへ単純に解禁する方法は採用できない。実現可能性は、次の4条件を満たす小さなsolo固有経路に依存する。

1. solo grantをactive intentへ束縛し、space内の別intentを認可させない。
2. gateの存在と認可根拠を分離し、standing grant専用の擬似gate値を作らない。
3. route時に選んだGrant Idを明示的にcommitへ渡し、同じgrantをcommit時に再検証する。
4. 再検証失敗を通常の認可競合としてhuman gateへ戻し、error transitionとして扱わない。

## Current Team-Mode Flow

現行mainで確認したteam modeの流れは次のとおりである。

| Step | Current behavior | Primary code evidence | Audit result |
|---|---|---|---|
| 1. 発行 | leader sessionのfresh `HUMAN_TURN`とteam modeを要求し、4時間TTLのgrantを発行 | `handleGrantStandingDelegation`、`collectIssuerProvenance` | `GRANT_ISSUED` |
| 2. 探索 | active space内の全intent audit shardを走査し、最新の有効grantを選ぶ | `findActiveStandingGrant`、`qualifiedStandingGrant` | 読取のみ |
| 3. 適用判定 | target intentのscope・次stage・Skeleton Stanceから対象gateか判定 | `standingGrantSatisfiesGate` | 読取のみ |
| 4. 委任 | leaderにfresh turnがない場合、対象gateを覆うgrantでremote conductorへapprovalを委任 | `standingGrantForDelegation`、`handleDelegateApproval` | `DELEGATED_APPROVAL`、任意の`Grant Id` |
| 5. provenance検証 | conductor ledger上のdelegationがissuer shardの実`HUMAN_TURN`に接地することを確認 | `humanActedSinceGate`、`verifyDelegatedProvenance` | 読取のみ |
| 6. gate approval | artifact・presence・phase checkを検証し、approvalを一つのlock内でcommit | `authorizeApproval`、`approveUnderLock`、`emitApprovalAudit` | `GATE_APPROVED`、`STAGE_COMPLETED` |
| 7. 取消 | fresh `HUMAN_TURN`とteam modeを要求し、Grant Idを取消 | `handleRevokeStandingDelegation` | `GRANT_REVOKED` |

この流れでは、standing grantはleaderからconductorへの委任を認可する。solo modeにはleader sessionもremote conductor intentもないため、step 4のdelegationを流用する意味がない。

## Existing Safety Properties

現行実装には次の安全性がある。

- `GRANT_ISSUED`と`GRANT_REVOKED`は一般audit CLIからmintできず、専用verbに限定される。
- grantは`stage-gates` scope、parse可能なexpiry、未取消、issuer `HUMAN_TURN`の実在をすべて満たす場合だけ有効となる。
- expiryは`now >= expiresAt`で無効となる。
- phase-boundary gateは明示opt-inがない限り対象外となる。
- walking-skeletonが実効的にonの場合、最初のConstruction gateはgrant対象外となる。
- rejectはstanding grantで認可されない。
- approvalはauditを先に発行し、その後stateを書き、同じlock内で次stageへ進む。
- `GATE_APPROVED`へ、認可に使ったGrant Idを記録できる既存fieldがある。

これらはsolo対応でも弱めず、team modeでは現状のまま維持する。

## Solo-Mode Gap Analysis

| Concern | Team mode today | Solo mode required | Feasibility impact |
|---|---|---|---|
| 発行主体 | leader session | active solo intentの人間 | 専用verbのmode制限とtarget bindingを調整可能 |
| grant探索範囲 | active space全intent | target active intentに束縛 | 現行space横断resolverの無条件再利用は禁止 |
| 認可搬送 | `DELEGATED_APPROVAL` | route directiveからcommitへの明示carrier | 新しいdelegation eventは不要 |
| gate表現 | boolean gate、認可はcommit内で暗黙探索 | boolean gateと認可候補を別fieldで表現 | directive contractの後方互換な拡張が必要 |
| TOCTOU | commit時にその時点の任意active grantを探索 | route時に選んだ同一Grant Idを再検証 | id指定resolverが必要 |
| 失効時 | approve refusal | human gateへ通常フォールバック | typedな非error結果が必要 |
| per-unit | 全unit後にstage gate | 同じ最終gateだけをgrant候補化 | engineの既存coverage ledgerを維持可能 |

## Technical Viability

### High-confidence feasible

- 監査eventへのintent target情報追加
- Grant Id指定による再探索・再検証
- directive上でgateと認可候補を別fieldにすること
- ordinary gateだけをroute時にgrant候補化すること
- commit成功時に正確なGrant Idを`GATE_APPROVED`へ記録すること
- 失効時にstateとapproval auditを変更せずhuman gateへ戻すこと
- per-unitのall-covered再entryだけを認可候補化すること

### Requires design gate

- directiveの認可carrier名と型
- state toolからorchestratorへ返すtyped fallback契約
- solo grantのtarget fieldを既存team grantとどう後方互換にするか
- route時とcommit時で共用するgrant eligibility predicateの境界

### Not required

- standing grant専用のgate値
- 新しい設定fileまたはstate field
- leader/delegation経路のsoloへの流用
- stderr本文の文字列判定
- AWS・database・network・外部認可service

## Baseline Evidence

現行mainで次の基線を実行し、79 testすべてが成功した。

```text
bun test tests/integration/t-standing-grant.test.ts \
  tests/unit/t188-human-presence-gate.test.ts \
  tests/unit/t-delegate-answer-consume.test.ts

79 pass
0 fail
```

この基線はgrantの発行・探索・取消・provenance、phase-boundary・walking-skeleton、team delegation、human presenceのconsume-once、approve auditの現行挙動を固定する。

## Recommendation

設計を継続する。推奨する問題分割は、既存team delegationを変更せず、soloに次の3境界だけを追加することである。

1. **Route authorization selection**: gateが存在することを維持したまま、対象gateに使えるintent-bound Grant Id候補を選ぶ。
2. **Commit authorization validation**: 渡された同一Grant Idをlock内で再検証し、成功時だけ通常approval transitionへ進む。
3. **Typed fallback**: grantが無効なら何もcommitせず、同じstageのhuman gate提示へ戻る。

この分割なら、監査eventと既存approval transitionを保持しつつ、失効競合をerrorから分離できる。最終的な型と責務配置はapplication-design gateで決定する。

## Upstream Traceability

本評価は、`../intent-capture/intent-statement.md`のProblem Statement、Success Metrics、Initial Scope Signalを入力としている。市場調査stageは本scopeでSKIPされているため、存在しないcompetitive analysis、market trends、build-vs-buy成果物を仮定していない。
