# Security Design — quality-repair-runtime

## 入力とtrust boundary

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

trust boundaryはfirst-party contribution取込、reviewer / sensor / produce / verification receipt収集、`none` mode opt-in、repair / replan agent handoff、human retryである。Quality Repairはgate / question認可、host permission、Intent grantを所有しない。

## Activationとprovenance

`semi / full`はtrusted contributionの存在・content digest・schema・descriptor参照をstage副作用前に検証し、不備時は`ACTIVATION_FAILED`とする。stale graphや部分contributionへfallbackしない。

`none` modeのopt-inは対象Intent / plugin / revisionへ束縛したreal `VerifiedHumanTurn`だけを受理する。headless起動、過去Intentの回答、standing grant、autonomy modeをopt-in provenanceへ変換しない。opt-inはquality機能だけを有効化し、他の裁定権を拡張しない。

## Evidence minimization

各`QualityObservation`はsource category、terminal status、artifact / verifier identity、receipt digest、failure fingerprintだけをcanonical snapshotへ渡す。reviewer自由文、sensor stdout、secret、credential、個人情報、修復promptをstatusやauditへ複製しない。

source parserはvalidated reviewer verdict、blocking指定sensor、directive必須output、宣言済みconditionだけを受理する。advisory sensor、未検証コメント、人間Request Changesをblocking obligationへ昇格しない。不完全だがsource identityを確定できる観測は`evidence-incomplete`としてfail-closedにする。

## Repair authorization

repair / replan handoffはquality epoch、snapshot fingerprint、allowed route、reservation identityへ束縛する。agent resultが別scope、別snapshot、別review cycleを参照する場合は適用しない。`repair-stalled`解除のhuman retryはcomposite condition内の対象alternative identityとreal human turnの一致を要求する。

## Security verification

untrusted contribution、dangling descriptor、偽opt-in、advisory昇格、receipt欠落、cross-Intent evidence、route差替え、偽human retry、raw evidence漏えいをred fixtureにする。すべてで不正なrepair / replan / unparkを0件とし、safe metadataだけのtyped diagnosticを残す。
