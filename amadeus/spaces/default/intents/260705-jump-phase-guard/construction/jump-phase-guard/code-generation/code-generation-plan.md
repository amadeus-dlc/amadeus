# Code Generation Plan — jump-phase-guard（Issue #481）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 計画（TDD）

1. RED: `dev-scripts/evals/jump-phase-guard/check.ts` を追加（隔離 workspace + 実 CLI 駆動、hooks-state-bugfix と同型）。(a) phase-check 不在拒否、(b) Verified 同時更新、(c) 実行済みなし phase の Skipped 化、(d) backward の無 emit、(e) validator 整合の 15 検査。修正前のエンジンで 10 件失敗することを確認した。
2. GREEN: `amadeus-state.ts` の `markPhaseVerified` / `verifyPhaseCheckArtifact` / `PHASE_PROGRESS_FIELD` を export し、`amadeus-jump.ts` の execute に R000（閉じる phase の per-phase 列挙）→ 事前ガード（mutation・emit 前の error 退出）→ 同一トランザクションの Phase Progress 更新 → per-phase の VERIFIED / SKIPPED emit（backward は無 emit）を実装した。
3. 手続き: `dev-scripts/data/parity-map.json` の engineFileExceptions へ `tools/aidlc-jump.ts` を宣言（learning c3、上流ドリフトは #428 で追跡）。
4. 検証: eval 15 検査 GREEN、既存 hooks-state-bugfix 23 assertion pass、`npm run test:all` exit 0。

## 検査精密化の記録

audit の PHASE_VERIFIED 検査は「境界の起点 phase」でアンカーした。intent-birth が正当に emit する initialization 境界の行（`initialization → inception`）を、窓の広い部分一致が誤検知したためである。
