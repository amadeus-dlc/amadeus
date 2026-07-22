# Reliability Design — reference-plugin-and-guides

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Lifecycle closure

同一authoring sourceからU01 validation、U09 projection、U10 compose/doctor/dropを順に通し、同じprojection、compose result、doctor diagnostic、drop resultを得る。compose後は宣言成果物とplugin状態だけを検出し、drop後は宣言成果物だけを除去して再compile/doctorを成功させる。

record-owned dropはunrelated host bytesとrecord外pathを維持する。same-name、malformed、unknown seamはloud rejectされ、host/record/auditを不変にする。U10のownership、atomicity、failure recoveryをU11で再定義しない。

## Cleanup・evidence integrity

success/failure双方でtracked source treeとtemp rootを比較し、一時物0を確認する。6 package面とclosed 4 self-install面は別々に全数確認する。U11はFR-6 items 21–22のtest/docs evidenceだけをU12へ渡し、自らledgerを遷移しない。

availability SLO、RTO/RPO、retry、failover、backup、new audit event、metrics backend、cleanup/failure意味論は追加しない。

## Verification matrix

| Scenario | Required behavior |
|---|---|
| canonical test-pro | U01 schema受理、新API要求0 |
| 6 harness projection | 同一sourceから決定生成 |
| compose/doctor | 宣言成果物とplugin状態だけ検出 |
| record-owned drop | 宣言成果物だけ除去、unrelated bytes不変 |
| invalid/conflicting input | loud reject、三面不変 |
| success/failure cleanup | tracked一時物0 |
| package/self-install | 6/4を別matrixで全数確認 |

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U11-01〜07を中心に、`performance-requirements.md`のsingle E2E、`security-requirements.md`のdeclared-only mutation、`scalability-requirements.md`の6/4 matrix、`tech-stack-decisions.md`のintegration runner、`business-logic-model.md`のEvidence/failure scenariosへ対応する。
