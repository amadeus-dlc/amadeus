# Reliability Design — execution-observability-baseline

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Commit Barrier

`AuditRepository.commitBatch`成功後、`ProjectionCoordinator`がstate/runtime receiptを同じdigestへ進め、両方成功した時だけ`StartPermitIssuer`がpermitを返す。失敗時はauditを巻き戻さず`pending-rebuild`とし、native処理を開始しない。OTelはbarrier外である。

## Recovery

reserved／claimed／dispatch-confirmed／terminalをclosed reducerで復元する。claimed crashは`HarnessCapabilityPort.queryDispatchEffect`のno-effect-confirmedだけを後続retry候補とし、unknownは安全停止する。`ProjectionRebuilder`はauditから1回でstate/runtimeを再構築する。
