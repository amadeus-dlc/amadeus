# Code Generation Plan — unit: lifecycle-guard-runtime

- Intent: 260813-lifecycle-guard-runtime(Issue #2771、scope self-fix、depth Minimal、test-strategy Comprehensive)
- 入力: `inception/requirements-analysis/requirements.md`(FR-1〜FR-9)。units-generation は scope により SKIP(expected)— 要件と codekb(`re-scans/260813-lifecycle-guard-runtime.md` の G1〜G40 が一次ソース)からスコープする。
- 実装形態: 裁定 Q4 — 新規 Runtime のゼロベース新設ではなく**既存機構の汎化・昇格**。
- 隔離: Bolt worktree(base `main`、branch `bolt/lifecycle-guard-runtime`)で実装し、レビュー前に conductor ツリーへ取込 + `bun run build` 再実行(cid:code-generation:solo-bolt-worktree-required / c1-mirror-and-rebuild-before-review)。
- TDD: 各 slice で失敗テスト先行 → 最小実装(team.md Testing Posture)。

## Steps(step → FR trace)

- [ ] Step 1: Guard Runtime コア型の失敗テスト追加(verdict 判別ユニオン ALLOW/DENY/UNKNOWN/NOT_APPLICABLE + reason/evidence/policyId/targetRevision/recovery、集約規則、決定的順序、例外→UNKNOWN 写像)→ FR-1, FR-3
- [ ] Step 2: `packages/framework/core/tools/amadeus-lifecycle-guard.ts` 新設 — 型 + 評価関数(pure、状態書込手段を持たない Adapter Interface)。`IntentOperationGuardResult` 様式(kind + error.recovery)の拡張として定義 → FR-1, FR-3, FR-4
- [ ] Step 3: Stage 完了 checkpoint の移行 — `verifyStageCompletionGuards`(state.ts:2539)の内部を built-in Adapter 群(artifact 存在 G6 / blocking sensor G7 / unit レビュー G10)の Runtime 評価へ置換。拒否メッセージ・off-switch(`AMADEUS_SKIP_*`)・日付 cutoff の挙動は逐語保存 → FR-2, FR-7
- [ ] Step 4: Phase 遷移 checkpoint の移行 — `verifyPhaseCheckArtifact`(state.ts:392)を Adapter 化し、呼出 5 箇所(advance/finalize/complete-workflow/approve/jump)を Runtime 経由へ → FR-2, FR-7
- [ ] Step 5: Workflow 完了 checkpoint の移行 — G13(prepared)/G14(mandatory plugin)/G15(goal receipt、not-settled→UNKNOWN 写像で awaitCompletion 分岐保存)/G16(record 解決)を Adapter 化 → FR-2, FR-7
- [ ] Step 6: Intent 生成 checkpoint の移行 — `handleIntentBirth` 前段の G1(workspace scan)/G2(予約名)/G3(autonomy)/G4(repos)を Adapter 化(mutation 前評価・refuseWithoutAudit 挙動保存)→ FR-2, FR-7
- [ ] Step 7: census テスト — 4 checkpoint + jump の全 commit 経路が評価関数を呼ぶことを機械列挙で固定(迂回不能の測定述語)→ FR-2
- [ ] Step 8: 対照テスト — 7 観点(allow/deny/unknown/not-applicable/例外/タイムアウト/複数ガード競合)× 4 checkpoint(+jump は Phase 遷移マトリクスへ折込)。同期 Adapter に構造的に適用不能な観点(タイムアウト等)は根拠付き明記で省略 → FR-8
- [ ] Step 9: 回帰テスト — 移行前後で判定結果・拒否文言・復旧可能性が不変(off-switch 4 種・cutoff・G9 真理値表無変更を含む)→ FR-7
- [ ] Step 10: 棚卸し分類表 — G1〜G40 の built-in/policy 分類と移行対象/対象外(根拠)を設計文書へ確定 → FR-6
- [ ] Step 11: 設計文書(ADR 相当)`docs/reference/`(en + .ja 対訳)— Module/Interface/Seam/Adapter/信頼区分(built-in=コード登録・無効化不可、ユーザ空間=既存 blocking-sensor 登録面の流用)/監査(既存語彙への写像)/原子性/fail-closed 規則/Alternatives Rejected(ゼロベース新設、Interface のみ先行着地)→ FR-5, FR-9
- [ ] Step 12: `bun run build` 全ハーネス再生成 + 追跡ファイル不変確認、`tests/.coverage-patch-allowlist.json` の `authorizeWorkflowCompletion` エントリ整合、フルスイート(`bash tests/run-tests.sh --ci` 相当)green

## 備考

- ユーザ空間 Adapter(FR-5)は新規登録スロットを作らず、既存 blocking sensor 登録面(`.claude/sensors/*.md`)が Stage 完了 checkpoint のユーザ空間経路として Runtime を通る形で充足する(dormant 実例様式)。他 checkpoint への新規ユーザ空間スロットは先行着地禁止ノルムにより対象外(設計文書に記録)。
- 監査: 新規イベント種別は発明しない。ガード評価は既存の拒否経路(error() 文言・audit 既存行)を保存する形で記録する。
- 本 plan は units-generation SKIP の degrade 様式(cid:code-generation:c1-degrade-batch-directive-capture)に従い、intent(Issue #2771)+ requirements.md からスコープした。
