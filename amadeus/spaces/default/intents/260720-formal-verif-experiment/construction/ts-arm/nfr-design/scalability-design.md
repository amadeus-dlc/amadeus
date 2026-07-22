# Scalability Design — ts-arm

## 上流と closed capacity

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、core=5,760、identity=160、PBT=100、predicates=7、workers=1を固定する。

## Revision と claim

revision identityはarm freeze/subject tree/universe/arbitrary/runtime snapshot/sandbox policy/coverage schemaを束ね、unknown tuple/field/discriminator/pluginを拒否する。変更は旧evidenceを保持した全case新revisionとし、同revisionへ追加しない。

`TsExecutionClaimStore` はfull run manifest identity、revision/run/owner session/process-start identityへbindしたACTIVE successorをexclusive取得する。dead ownerとmanifest全fieldを再読し、fresh owner/nonceのatomic RESUMED後だけresumeする。live/unknown ownerまたはsubject/runtime/sandbox/schema driftは拒否し、terminalはCLOSED、明示放棄はABORTEDで閉じる。

## Verification

5,760/160/PBT100と各±1、duplicate/unknown、2 revision、heap全case array=0、claim競合、live resume拒否、stale RESUMEDを検査する。active process/worker/claim各1である。
