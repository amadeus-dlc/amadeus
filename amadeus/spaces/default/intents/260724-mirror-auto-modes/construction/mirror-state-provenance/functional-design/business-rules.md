# Business Rules — mirror-state-provenance

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## Rule Sources

`unit-of-work.md`のUnit 2、`unit-of-work-story-map.md`のAS-02／04／05、`requirements.md`のstate／provenance安全要件、`components.md`のC3／C4境界、`component-methods.md`のtransition contract、`services.md`のatomicity／repair lifecycleを正本とする。

## Codec Rules

| ID | Rule |
|---|---|
| SP-C01 | Mirror schemaはversion 1だけを受理し、未知versionを推測しない |
| SP-C02 | Mirror blockはstate document中0件または1件だけ |
| SP-C03 | duplicate JSON key、unknown field、unknown union variantを拒否する |
| SP-C04 | blockなしはrevision 0のempty snapshotとして読む |
| SP-C05 | receipt map keyはreceipt keyとcanonical event keyの両方に一致する |
| SP-C06 | root Issue numberとprovenance Issue numberは共にnull、または同じpositive integer |
| SP-C07 | credential、raw stderr、token、absolute secret pathを永続化しない |

## Atomicity and CAS Rules

| ID | Rule |
|---|---|
| SP-A01 | lock取得後に最新document全体を再読込する |
| SP-A02 | expected revision不一致ではwriteを行わずactual revisionを返す |
| SP-A03 | state-changing transitionはMirror revisionを正確に1増やし、同値no-opは`unchanged`でrevisionを増やさない |
| SP-A04 | Mirror block外のbytesを再serializeしない |
| SP-A05 | prepare receiptとcreate identityは同じatomic replaceで確定する |
| SP-A06 | create succeeded receipt、root Issue number、provenanceは同じatomic replaceで確定する |
| SP-A07 | repair transitionとactive challenge削除は同じatomic replaceで確定し、消費proofはaudit outboxへ置く |
| SP-A08 | temp write／flush／rename失敗時に元documentを変更しない |
| SP-A09 | CAS conflictをState Store内で無条件retryしない |
| SP-A10 | 全transitionはtrigger／operation eventとreconciliationを持つaudit contextを必須にする |
| SP-A11 | state commitは完全な`ARTIFACT_UPDATED` outboxを同時保存し、directory fsync後だけauditへidempotent appendする |
| SP-A12 | outbox未drain中は別transitionを開始せず、audit append／outbox clearへ先に収束する |

## Receipt Transition Rules

| From | Transition | To / Result |
|---|---|---|
| absent | `prepare` | `prepared`、createならidentity同時保存 |
| same key exists | `prepare` | 既存receiptを返し候補値を破棄 |
| `prepared` | `mark-attempted` | `attempted` |
| fresh create `prepared` | `claim-create-attempt` | CAS winnerだけ`attempted` |
| `pending + no-effect-confirmed` | `retry-after-no-effect` | 同operation IDの`attempted` |
| `pending + outcome-unknown` sync／close | `claim-observed-retry` | remote observation後のCAS winnerだけ`attempted` |
| `attempted | pending` | `complete` | `succeeded` |
| absentまたはremote前 | `skip-for-event` | event付き`skipped-for-event`を作成 |
| `prepared` | `set-warning(effect=not-started)` | status不変＋原因warning |
| receiptなし | `set-global-warning(configuration)` | global warning保存 |
| `attempted` | `mark-pending` | `pending`＋effect certainty＋同operation warning |
| eligible nonterminal | `mark-safety-blocked` | `safety-blocked`＋同operation warning |
| nonterminal | `abandon-attempt` | 明示repairによるterminal |

terminal receiptの通常transition、別operation IDのwarning更新、create identity差替え、成功receiptのabandonを拒否する。idempotent再入は入力が保存値と完全一致する場合だけ`unchanged`とし、writeしない。readiness失敗／attempted write失敗は`prepared`を維持し、`set-warning`で原因を保存する。warning保存も失敗した場合だけcurrent-invocation warningへfallbackする。

## Provenance Rules

- markerは成功したprepare writeが返したcreate identityだけから描画する。
- remote call前に永続create identityのIntent UUID、Intent directory、repositoryをcurrent contextと再照合し、不一致ならmutationを禁止する。
- local provenanceはcreate identity、Issue number、createdAtを持つ。
- repository比較はcanonical lowercase `owner/name`で行う。
- ownership verifiedにはrepository、marker identity、Issue numberの全一致が必要である。
- marker欠落、malformed、複数marker、identity不一致をverifiedへfallbackしない。
- Issue本文やtitleの類似性をownership根拠にしない。
- 1 Intentのactive provenanceは最大1件である。

## Candidate Rules

| Condition | Decision |
|---|---|
| fresh prepared、verified候補0件 | create-new |
| verified候補1件 | adopt |
| pendingかつno-effect-confirmedで候補0件 | `retry-after-no-effect`後、同じoperation identityでcreate-new retry |
| attemptedまたはoutcome-unknown後に候補0件 | safety-blocked |
| verified候補2件以上 | safety-blocked |
| mismatch候補だけ | safety-blocked |

candidate classificationは入力順に依存しない。曖昧時は採用、作成、edit、closeをすべて禁止する。

## Warning Rules

- warningはoperation ID、operation、classification、固定summary、occurredAt、retryable、effect certainty、sourceを持つ。
- prepared receiptのwarningはeffect=`not-started`だけを許可し、receipt statusを変更しない。
- persisted receiptから導出できるstate-write warningは追加writeの成功へ依存しない。
- current-invocation warningはstate write自体が失敗した場合だけ一時表示に使う。
- warning解消は同じoperation IDのsuccessful completionまたは明示repairだけが行う。
- 別operationの成功で既存warningを消さない。
- 同じoperation ID／classification／effectの反復warningは最新1件へcoalesceし、履歴はtransaction auditに残す。
- 1,000 slotのうち1件を`state-capacity`専用に予約し、通常slot枯渇時はcapacity warningを保存してremote operationを開始しない。

## Repair Challenge Rules

| ID | Rule |
|---|---|
| SP-R01 | repairは`auto`のstanding consentに含めない |
| SP-R02 | challengeはIntent、repository、operation、plan digestへbindする |
| SP-R03 | expected phraseは完全一致し、trim／case-foldしない |
| SP-R04 | challenge有効期限はissuedAtから10分 |
| SP-R05 | challengeは一度だけ消費できる |
| SP-R06 | validationとrepairと消費を同じlock／atomic transitionで行う |
| SP-R07 | marker欠落Issueを自動relinkしない |
| SP-R08 | expired／consumed challengeは再活性化せず、新challengeを発行する |
| SP-R09 | mapはactive challengeだけを保持し、consumedはrepair commit時、expiredは次回発行前に即時removeしてproofをaudit outboxへ移す |

## Acceptance Scenarios

1. Mirror blockのない既存stateはrevision 0のempty snapshotになる。
2. duplicate receipt keyを含むstateはinvalidとなり、writeされない。
3. 同revisionの並列prepareは1件だけwriteされ、もう1件はconflictになる。
4. create prepare成功後のreceiptとcreate identityは同じdocumentに存在する。
5. create completeのatomic replace失敗後はattempted receiptが残り、provenanceだけの部分保存は起きない。
6. Mirror block外に任意の未知sectionがあってもtransition後にbytesが一致する。
7. markerとlocal provenanceのrepositoryが違えばownership mismatchになる。
8. attempted receiptで候補0件ならcreate-newではなくzero-after-attemptになる。
9. verified候補2件なら入力順にかかわらずambiguousになる。
10. repair challengeを一度消費した後の再送はstate変更なしで拒否される。
11. 同じchallengeでもplan digestまたはrepositoryが違えば拒否される。
12. rename failure injectionでは元stateがbyte-for-byte維持される。
13. prompt時にreceiptがなくてもskip transitionはevent付きterminal receiptを作り、同じeventを再質問しない。
14. repository変更後に旧create identityへ再入するとremote command 0件でsafety-blockedになる。
15. no-effect-confirmed retryはpendingからattemptedへ再遷移した後だけremote callできる。
