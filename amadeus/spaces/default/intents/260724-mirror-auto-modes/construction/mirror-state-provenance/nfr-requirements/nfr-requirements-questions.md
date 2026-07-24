# NFR Requirements Questions — mirror-state-provenance

## 判定

`business-logic-model.md`と`business-rules.md`はwire format、CAS、atomic replace、transition closure、provenance、repair challengeを実装可能な粒度で確定している。`requirements.md`のNFR-1〜4と`technology-stack.md`のBun／TypeScript／filesystem基盤から測定条件を導出できるため、追加質問はない。

## 確定済み回答

### Q1. State Storeの可用性SLOを置くか

[Answer]: 常駐serviceではないため置かない。代わりにatomicity、byte preservation、CAS conflict、failure injection、transition latencyを検証する。

### Q2. remote成功後のlocal write失敗をどう回復するか

[Answer]: remote前に永続化した`attempted` receiptとoperation identityを正本にし、次回reconciliationへ送る。未確認のcreate再実行やprovenanceだけの部分保存を許さない。

## 曖昧性分析

- lock待ち時間をavailabilityへ読み替えない。
- no-op、conflict、I/O failure、invalid stateを別outcomeとして扱う。
- repairは`auto`の継続同意へ含めない。
