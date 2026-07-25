# Security Design: grant-authorization-domain

## Inputs and Trust Boundaries

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を根拠とする。environment、CLI flags、audit blocks、registry rows、directive carrierをparse-don't-trust境界とする。

## Validation Pipeline

1. canonical mode resolverがunset/empty/solo/team以外をmutation前に拒否する。
2. audit parserはevent typeと必須fieldをexact parseし、Grant Id 8 lowercase hex、Route Id UUID v4、timestamp/expiry finiteを検証する。
3. issue provenanceはIssuer Space/Intent/Shard/Human Tsの実在`HUMAN_TURN`へexact matchする。
4. receipt lookupはprotected `GATE_AUTHORIZATION_SELECTED`だけを対象とし、space-wide cardinality exactly one、Stage/Grant Id一致を要求する。
5. owner intentはcurrent-space registryから内部解決し、active cursorやcarrier pathを信頼しない。
6. receipt owner inner lock取得後にowner auditを再読し、revoke/expiry/provenance/intent/gate eligibilityをfresh owner snapshotで検証する。space lookup時のowner projectionをgrant validityへ再利用しない。
7. approvalへ渡すGrant Idはfresh owner snapshotに対するvalidatorが返したverified valueだけにする。

## Protected Mint Boundary

`GATE_AUTHORIZATION_SELECTED`をprotected event catalogへ追加し、general audit CLIから拒否する。route adapterだけがworkspace outer lockを取得し、space-wide未使用Route Idを確認した後、workspace → route owner intentの順でinner lockを取得して`appendAuditEntryUnlocked`を呼ぶ。outer/inner両lockを保持したままappend receiptを検証し、成功後だけcarrierを返す。`GRANT_ISSUED`/`GRANT_REVOKED`の既存trusted writerと監査fieldは維持する。

## Threat Outcomes

forged provenance、substitution、duplicate identity、cross-intent mismatch、invalid modeはapproval mutation 0でfail-closedにする。grant/receiptの想定内不正はtyped fallback、audit I/O・registry corruption・lock failureはfatalであり、両者を相互変換しない。

## Verification Mapping

U1-SEC-01–06をprovenance、mode、cardinality、carrier alteration、protected CLI、two-intent fixtureへ1対1に割り当てる。各attack fixtureで`GATE_APPROVED`、`STAGE_COMPLETED`、state mutationを比較する。
