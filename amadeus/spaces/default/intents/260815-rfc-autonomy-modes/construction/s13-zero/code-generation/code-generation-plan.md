# Code Generation Plan — unit s13-zero

## 拘束

- R-1(FR-11・ADR-6): 0件確定の唯一の根拠は`amadeus-learnings surface`出力に束縛されたdigestとする。conductorの自己申告(散文のみの主張)を根拠にしない。
- R-2(ADR-6): `confirmZeroCandidates`は`candidates.length === 0`かつsurface実行結果由来のdigestが一致する場合にのみ`ZeroReceipt`を発行する。
- R-3(ADR-6): `addConductorCandidate`は候補集合を増やす方向のみ操作可能 — 既存候補の削除・書換を提供しない。
- R-4(ADR-6): 追加候補はdisk上の記録(`diskEvidencePath`)から再導出可能であることを要件とし、パス不在・内容不一致はfail-closedで拒否する。

## TDD 順序(実施順)

1. 不在確認: `t-learnings-s13-zero-seam.test.ts`を実行 → Red(`confirmZeroCandidates`export不在、exit 1)。business-rules.mdの「機械的な0件確定手段が存在しない」Red期待を確認。
2. `amadeus-learnings.ts`(+221行)に`confirmZeroCandidates`/`addConductorCandidate`を実装。設計上のFDが明示的に開いた自由度内の判断:
   - `confirmZeroCandidates`: domain-entities.mdの2アーム型`ZeroReceipt|NotZero`をそのまま採用。digest不一致+候補0件のケースはNotZero{candidateCount:0}へ(FDが3アーム目を明示的に実装者裁量としていたため)。
   - `addConductorCandidate(candidate, diskEvidencePath)`: component-methods.md C10の2引数シグネチャどおり、既存候補配列を受け取らない。追加分のみを返す(マージはconductorの orchestration層の責務、business-logic-model.mdが明記)。
   - Evidence対応検査: evidenceファイル内容が`candidate.summary`を含むかの部分文字列検査(機械検査可能な最小形)。
   - `surfaceDigest`: sha256(JSON.stringify(正規化candidates+parked)).slice(0,16)、`amadeus-learnings.ts`内に閉じる(`amadeus-lib.ts`は触らない)。
3. 監査: `LEARNING_ZERO_CONFIRMED`/`LEARNING_CANDIDATE_ADDED`をcategory `"learning"`で新規登録(Q4の明示的申し送り + swarm-brief rule #2の明示的許可)。event-registry.ts(93→95)、amadeus-audit.ts、audit-format.md、t28/event-registry-drift.testのcount pin。

## 検証・配送

- swarm batch 1(recommendation-core / presence-detection / s13-zero / merge-provenance / grant-ceremony / d6-investigation)。
- referee: `3e9bb386f integrate bolt-s13-zero (batch 1)` で `swarm-int-rfc0001` へ収束。
- worktree: `.amadeus/worktrees/bolt-s13-zero`、base `main`。
