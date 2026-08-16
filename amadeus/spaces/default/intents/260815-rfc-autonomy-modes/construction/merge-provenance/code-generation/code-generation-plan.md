# Code Generation Plan — unit merge-provenance(C11/FR-9)

## 拘束

- R-1(ADR-10・FR-9): 委任条件(必須CI green ∧ pr-convergenceの`converged:true`)の正本はteam.md常任マージ承認ノルムのみ。本unitは新設config・新設policyキーを一切作らない。
- R-2(ADR-10): 本unitの責務はマージ実行後のprovenance記録のみ。GitHub上のPRマージ実行そのものをcoreがトリガー・代行しない。
- R-3(Q2): `recordDelegatedMerge`は記録専用API — 副作用としてgit/GitHubへの書込を一切行わない。
- R-4(Q3): 記録用の監査イベント種は新規登録する — 既存の`WORKTREE_MERGED`/`STATE_MERGED`/`AUDIT_MERGED`(Bolt worktree内部マージ)、`MERGE_DISPATCH_*`(Boltマージ戦略委任)のいずれとも意味が異なるため転用しない。
- R-7: `evidence`の必須フィールドいずれかが欠落・空の場合は記録を拒否する(fail-closed)。

## TDD 順序(実施順)

1. 不在確認: `grep -rn "recordDelegatedMerge\|DELEGATED_MERGE" packages/framework/core` → 0 hits、exit 1(APIが存在しないことの実測)。
2. `amadeus-audit.ts`に`recordDelegatedMerge`+ドメイン型を実装。component-methods.md C11のシグネチャ(`recordDelegatedMerge(evidence): AuditReceipt`)を、既存のrecord-only監査関数(`handleAuditFork`/`handleAuditMerge`)と同じパターンでプラミング引数付き(`evidence, projectDir, intent?, space?`)へ拡張 — domain-entities.mdが定める`{ok:true,receipt}|{ok:false,error}`ユニオン(本unitの拘束FD、component-methods.mdの裸`AuditReceipt`より詳細)に従う。
3. 新規専用CLI `amadeus-merge-provenance.ts`(`record --standing-ruling-ref --ci-conclusion --converged-digest`)を追加。`amadeus-bolt.ts`へは配線しない — unit-of-work-dependency.mdがU10をゼロ共有ファイル制約と明記しており(U1/U6/U8/U11とは異なる)、共有ファイルへ触れるとswarmの並行書込保証を壊すため。副次的に四集合drift guardのBR-6(全canonicalイベントはamadeus-audit.ts外に参照点を要する)も、これにより正当な理由をもって満たす。
4. `t-merge-provenance-record.test.ts`で成功パス・2回呼出2行append・evidence各フィールドのfail-closed(3種)・空白のみのfail-closed・GATE_APPROVEDへの無退行を実装後にpin(7ケース)。
5. 監査カウントpin(93→94)をt28/t81/event-registry-driftへ同期。

## 検証・配送

- swarm batch 1(recommendation-core / presence-detection / s13-zero / merge-provenance / grant-ceremony / d6-investigation)。
- referee: `b150e7496 integrate bolt-merge-provenance (batch 1) — union event pins to 96` で `swarm-int-rfc0001` へ収束。
- worktree: `.amadeus/worktrees/bolt-merge-provenance`、branch `bolt-merge-provenance`、base `main@2eb94f1e3`。
