# Business Rules: solo-gate-transaction

## Design Inputs

規則は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`およびU1の認可結果契約から導出する。

## Route Rules

| Rule | Condition | Outcome |
|---|---|---|
| TR-01 | `gate === false` | grant探索・carrierなし |
| TR-02 | team mode | 既存leader/delegation route |
| TR-03 | human-only policy | carrierなしの既存gate |
| TR-04 | solo eligible candidateあり | workspace outer lock内でRoute Id未使用確認とprotected receipt成功後だけcarrier pair |
| TR-05 | receipt append failure | carrierなし、fatal I/O error |
| TR-06 | per-unit uncovered | body実行、carrierなし |
| TR-07 | per-unit all-covered final gate | 他条件を満たせばgrant探索 |

## Directive and Wire Rules

| Rule | Condition | Outcome |
|---|---|---|
| TR-08 | carrier 2fieldともvalid | run-stage directive受理 |
| TR-09 | carrier片方/format不正/他kind | fail-closed validation error |
| TR-10 | grant approve success exact JSON | approved |
| TR-11 | grant invalid exact JSON | receipt owner opaque `target_intent_id`付きtyped await-approval + session-local presence reservation |
| TR-12 | exit 0の空/複数行/非JSON/unknown shape | protocol error |
| TR-12a | exit 0、valid JSON、stderr非空 | protocol error |
| TR-13 | nonzero/I/O failure | 既存fatal error |
| TR-14 | human/team approve | 既存wireを変更しない |
| TR-14a | human input + full carrier pair | mutation前のprotocol error |
| TR-14b | partial/malformed carrier pair | mutation前のprotocol error |
| TR-14c | inputなし + carrierなし | 既存human/team guardが判定 |
| TR-14d | fresh human input + valid `target_intent_id` +同一sessionのmint済みreservation + carrierなし | registry target/stage/open gate/provenance検証後、既存human guardでtargeted approval |
| TR-14e | target ID + carrier、human inputなし、reservation不一致 | mutation前のprotocol error |
| TR-14f | target IDがmalformed/別space/未登録/ambiguous/非in-flight/path | mutation前のprotocol error |

## Commit Rules

| Rule | Condition | Outcome |
|---|---|---|
| TR-15 | workspace outer lock内のexactly-one receiptとowner inner lock内のexact grantがvalid | approval transaction継続 |
| TR-16 | expiry/revoke/intent/scope/provenance invalid | mutation前にawait-approval |
| TR-17 | receipt欠落/重複/field mismatch | mutation前にawait-approval |
| TR-18 | 後発grantあり | carrier IDを差し替えない |
| TR-19 | success | `GATE_APPROVED.Grant Id` = verified ID |
| TR-20 | fallback | approval/completion/error audit delta 0、state不変 |
| TR-21 | carrier + team/invalid mode | mutation前のprotocol error、team pathへ流さない |
| TR-22 | route後active cursor switch | space-wide exact receipt所有intentへpinし、新intentの全mutation 0 |
| TR-23 | same target内のgrant issuer-intent mismatch | mutation前にawait-approval |
| TR-24 | route/commit中のcross-intent duplicate Route Id追加 | workspace outer lockで直列化し、route collisionはfatal、commit前置duplicateはawait-approval |
| TR-25 | fallback後active cursorが非owner | opaque target IDとsession reservationをhuman reportへ引き回し、ownerだけをcommit、非owner delta 0 |
| TR-26 | 次turnがmachine injection/別session | owner `HUMAN_TURN` mint 0、reservation未消費 |

## Human-control Rules

- grantはapproveだけを認可し、reject、Request Changes、halt-and-askを認可しない。
- walking-skeleton human-only gateではcarrierを付けない。
- expected fallback後は同一sessionの実promptからowner ledgerへmintされたfresh human approvalとreceipt owner由来のopaque target IDだけを受理する。target/reservationは認可源ではない。
- human approvalは既存`HUMAN_TURN` guardを弱めない。

## Quality Ritual Rules

- carrierがあってもstage body、reviewer、sensor、§13 learningsを各1回完了してからcommitする。
- per-unit final fallbackで既存unit artifactまたはreview evidenceを削除・再生成しない。
- expected fallbackを`error` directiveとしてemitしない。

## Test Matrix

unit testsはdirective all-or-none、human/carrier入力行列、await schema、strict JSON parserのstderr非空を含む全分岐をcoverする。integration testsはsuccess、expiry、revoke、substitution、higher-priority grant、issuer-intent mismatch、active cursor switch、team/invalid mode carrier、receipt 0/1/複数、audit delta、state bytes、human continuation、team regression、per-unit invocation countをcoverする。
