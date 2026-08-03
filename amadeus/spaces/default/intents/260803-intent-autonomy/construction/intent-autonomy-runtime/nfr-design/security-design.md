# Security Design — intent-autonomy-runtime

## 入力とauthority boundary

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

authority boundaryはmode command、full grant issuance / replacement / revoke、gate / question occurrence、effect authorization、resume conditionである。headless実行、environment variable、harness種別、standing delegation、agent recommendationをhuman authorityへ昇格しない。

## Human provenanceとgrant

mode commandはexplicit target Intent UUID、real `VerifiedHumanTurn`、principal、command occurrence、current projection revisionへ束縛する。full grantは人間へ表示したscope fingerprintとpolicy set digestを同じhuman turnが確認した場合だけ発行する。

grantはIntent audit上のnon-secret authorization recordであり、bearer tokenではない。current grant IDだけで行使せず、各interactionでscope、option、effect classification / payload、graph / registry / norm revisionを再検証する。team child / parent / siblingへ暗黙継承しない。

legacy standing grantは`legacy-non-authoritative` diagnosticとしてのみ再生し、mode昇格、Intent grant発行、synthetic human turnへ変換しない。

## Effect safety

M05がoptionを選んだ後、M06はCore-owned registryからeffectをexact lookupし、`EffectAuthorizationValidator`でpermission、irreversibility、scope、norm / quality waiverを検査する。`new-permission / irreversible / scope-out / norm-waiver / quality-waiver`は全modeでauto対象外である。

confirmed policyはapplicable normや禁止effectをoverrideできない。norm conflictは優先順位を推測せず`NORM_CONFLICT`へparkする。payload schema、classification、registry revision、norm fingerprintはgrant exercise reservation digestへ含める。

## Identity separationとredaction

audit / statusはprincipal、decider、actor、basisを別fieldで保持する。deterministic policy / norm / historyをagentや人間のdeciderとして表示しない。failure evidenceはsanitized digestとstable referenceだけを保存し、prompt、credential、secretを含めない。

## Security verification

別Intent command、stale projection、scope tamper、policy digest差替え、legacy grant行使、synthetic human、unknown effect、payload mismatch、new permission、waiver、norm driftをred fixtureにする。すべてでgrant exercise / effect commitを0件とし、abortまたはhuman / conflict routeへ閉じる。

