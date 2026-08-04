# Business Rules — intent-autonomy-runtime

## 上流入力と適用範囲

本規則は`units-generation/unit-of-work.md`、`units-generation/unit-of-work-story-map.md`、`requirements-analysis/requirements.md`、`application-design/components.md`、`application-design/component-methods.md`、`application-design/services.md`からU3 `intent-autonomy-runtime`の不変条件を抽出する。#2067のmode / grant / auto decision / stop-resumeだけを扱い、PR、runner、completed decision review、terminal live completionを含めない。

## Mode規則

| ID | 規則 | 違反時 |
|---|---|---|
| AUT-M01 | accepted modeは`none / semi / full`だけ、既定は`none` | malformed / none fail-closed |
| AUT-M02 | headless、harness、environment、legacy grantからmodeを昇格しない | noneを維持 |
| AUT-M03 | mode upgrade / downgradeはreal `VerifiedHumanTurn`とtarget Intent UUIDを要求する | provenance error |
| AUT-M04 | `none`はgate / questionをhumanに委ねる | await human |
| AUT-M05 | `semi`はphase内gateだけauto、phase boundary / question / Walking Skeletonはhuman | await human |
| AUT-M06 | `full`はgrant scope内gate / question / Walking Skeletonだけauto | scope外はAWAITING_HUMAN |
| AUT-M07 | `semi / full`はQuality Repair Pluginを開始前必須検証する | fail-closed |
| AUT-M08 | child Intentへの操作はtarget UUIDを必須とし、space / parent / siblingへ波及させない | scope error |
| AUT-M09 | unset / legacy-onlyの`none` provenanceはsystem-default / legacy-fail-closedとして決定的に導出し、人間authorizationに使わない | noneを維持 |

## Grant lifecycle規則

| ID | 規則 |
|---|---|
| AUT-G01 | full grantはIntent UUID、principal、human turn、scope、confirmed policy setへ束縛する |
| AUT-G02 | grant IDはIntent / command occurrence / human turn / scope / policy digestから決定し、時刻に依存しない |
| AUT-G03 | grantはTTL、usage budget、secretを持たない |
| AUT-G04 | scope、normalized policies、principalを表示し、同digestの人間確認後だけ発行する |
| AUT-G05 | `none / semi`のcurrent grantはnull、`full`はactive grant必須 |
| AUT-G06 | revoked / completed grantを再active化しない |
| AUT-G07 | replacementはold revoked + new active、downgradeはold revoked + current nullを原子commitする |
| AUT-G08 | Request Changes、quality failure、parkをrevoke / expiryにしない |
| AUT-G09 | canonical sourceはIntent auditだけとし、gitignored per-clone stateを認可根拠にしない |
| AUT-G10 | suspended中でもhuman revoke / downgradeを即時適用し、workflow stateは維持する |

## Gate・question規則

- interaction occurrenceはIntent、kind、stage / phase / Bolt、skeleton flag、question / gate ID、options、graph revision、effectへ束縛する。
- `semi` phase-internal gateはmode human provenanceとcurrent projection revisionを内部再検証し、queue非対象`reviewState=not-applicable`の`AUTO_DECIDED + GATE_APPROVED`を原子commitする。grant eventを作らない。
- `full` auto gateはqueue非対象`reviewState=not-applicable`、full questionはbasis別review stateを使い、grant reservation / revalidation後に`INTENT_GRANT_EXERCISED + AUTO_DECIDED + effect`を原子commitする。
- Walking Skeletonを常時autoとせず、同じmode表を適用する。
- new permission、irreversible、scope外、norm / quality waiverをauto effectにしない。
- PR / merge / GitHub stateをgate、grant scope、Intent completionの入力にしない。

## Decision chain規則

| ID | 規則 |
|---|---|
| AUT-D01 | full questionはconfirmed policy→unique norm/history→solo election→recommendationの順で解く |
| AUT-D02 | policyはselector / scope / option setに一致し、一意なoptionの場合だけ行使する |
| AUT-D03 | historyはselector / scope lineage / norm fingerprint一致かつ一意な場合だけ行使する |
| AUT-D04 | applicable norm同士が矛盾すれば`NORM_CONFLICT`でparkし、優先順を創作しない |
| AUT-D05 | election capability欠落時はvoteを偽装せずrecommendationへloud degradationする |
| AUT-D06 | decision IDはIntent / question / occurrence / graph revisionから決定する |
| AUT-D07 | selected optionはcanonical option setに属し、対応するeffectがexactly oneでなければならない |
| AUT-D08 | `decider`と`basisKind`を分離し、policy / norm / historyを実行主体と表示しない |
| AUT-D09 | policy / norm / history decisionはqueue非対象、election / recommendationは`unreviewed` |
| AUT-D10 | mode-semi / grant-gate decisionは`not-applicable`かつquestion review queue非対象 |
| AUT-D11 | confirmed policyを含む全optionはCore effect registryの分類 / schema / scope / current norm検証を通し、policyで禁止effectやnormをoverrideしない |

## Grant exercise規則

- occurrence authorization後、selected optionとeffectが決まってからcandidateを作る。
- reservationはgrant、candidate全体 / digest、projection revision、graph revision、effect registry revision、current applicable norm fingerprintを保存する。
- replay後のM04がcurrent grant / graph / scope / occurrence / option / effect classification / registry / current norm / digestを再検証し、caller booleanでcommitしない。
- validな場合だけexercise / decision / effectを同一transactionでcommitする。
- invalid / changed / tamperedはexercise abortだけをcommitし、effectを生成しない。
- same candidate / transaction / effect identityの再送は同じreceiptまたはno-opとする。

## State・stop・resume規則

| ID | 規則 |
|---|---|
| AUT-S01 | active Intentのworkflow stateは`running | suspended`、completedはnull |
| AUT-S02 | `full + active grant + suspended`を合法とし、parkでgrantを終了しない |
| AUT-S03 | stop reasonは`AWAITING_HUMAN / REPAIR_STALLED / NORM_CONFLICT / USER_PARKED`だけ |
| AUT-S04 | same stop fingerprint / pending conditionはLLM / decision / repairを呼ばず同じresult |
| AUT-S05 | `REPAIR_STALLED`だけMonitor latch clearを要求し、他reasonはmonitor plan=null |
| AUT-S06 | condition satisfaction、optional latch clear、workflow unparkを原子commitする |
| AUT-S07 | `retryable=true`はcondition充足後の再開可能性であり、即時retry permissionではない |
| AUT-S08 | CLI `failed`はworkflow / mode / grant / latchを不変に保ち、runner auto retryを認めない |
| AUT-S09 | terminal failureはsanitized evidenceと同値before / after projection digestをfailed resultと同一transaction identityへcommitする |

## Legacy・audit・harness規則

- standing delegation eventは読める状態を保つが、new authorizationへ使わない。
- legacy mode / grantをnone / fullへ自動変換せず、migration diagnosticと人間操作を返す。
- synthetic `HUMAN_TURN`、proxy principal、per-clone authorizationを作らない。
- principal / decider / actor / basisをEvent Registry / OTelに登録し、別schemaを作らない。
- 5 harnessは同じCore contract fixtureを実行し、native adapterにmode / grant / decision algorithmを複製しない。
- 将来harnessはregistry row、adapter、contract fixture、live scenarioの追加で閉じる。
- U3でterminal live completion capabilityをtrueにしない。

## Failure classification

| Failure | Classification | Effect | Recovery |
|---|---|---|---|
| missing human provenance | authorization error | state不変 | real human command |
| full without active grant | illegal state | fail-closed | human issue / replace |
| scope / graph changed | stale reservation | exercise abort | new occurrence |
| candidate tamper | conflict | exercise abort | source correction |
| norm conflict | deterministic conflict | parked / `NORM_CONFLICT` | norm fingerprint change |
| permission / waiver | authority boundary | parked / `AWAITING_HUMAN` | human action |
| election unavailable | capability degradation | recommendation path | reasonをaudit |
| same parked condition | expected stop | same result | condition satisfaction |
| legacy standing grant | migration diagnostic | none / non-authoritative | human mode selection |
| invocation failure | terminal call failure | workflow running不変 | human normal restart |

## 要件・AC追跡

| 規則群 | 要件 / AC |
|---|---|
| mode / legacy | FR-AUT-001〜010 |
| grant | FR-GRT-001〜009 |
| decision | FR-DEC-001〜007 |
| quality / loop | FR-LMC-008〜012、FR-QRP-001〜013 |
| stop / result | FR-STP-001〜007 |
| harness | FR-HAR-001〜007、NFR-DET / SEC / REL / MNT |

### 2067-AC直接対応

| AC | 対応規則 / 検証 |
|---|---|
| 2067-AC01〜03 | AUT-M01〜03、M09 / mode schema・headless・human provenance |
| 2067-AC04〜07 | AUT-G01〜09 / grant schema・audit replay・synthetic human禁止・exercise ordering |
| 2067-AC08〜09 | Gate・question規則 / mode matrix・Walking Skeleton |
| 2067-AC10〜13 | AUT-D01〜05、D11 / policy normalization・norm/history・conflict・degradation |
| 2067-AC14 | AUT-G08、AUT-S02 / U2 repair routeでgrant不変（U2 primary、U3 secondary） |
| 2067-AC15 | AUT-S01〜09 / loop stop・resume・terminal failure replay |
| 2067-AC16〜17 | AUT-D08〜10 / actor taxonomy・全auto decision event |
| 2067-AC21 | immutable `AutoDecisionRecord` / completed review projection入力（U4 primary、U3 secondary） |

U3は上記ACのCore contractをprimary所有する。`FR-HAR-001〜007`はU3ではsecondary contract coverageであり、5 harnessのcredential-attested live completionとterminal実測はU5 primaryである。

## 非目標

- completed decision review / rollback / new Intent auto-create。
- terminal live completion、PR / GitHub、runner / supervisor。
- TTL / usage budget、permission / waiver自動付与。
