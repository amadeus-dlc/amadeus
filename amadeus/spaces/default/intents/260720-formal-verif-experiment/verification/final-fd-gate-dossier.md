# 最終 Functional Design ゲート — 人間裁定用資料(2026-07-22)

上流入力(consumes 全数): build-and-test-summary.md, build-test-results.md, live-toolchain-probe-receipt.md

## 目的

`final-cli-root.ts` の `FINAL_COMPOSITION_STATUS = "DESIGNED_BLOCKED_ON_FINAL_FD_GATE"` が要求する
最終 FD 人間裁定のための証拠一式。E-FVEU3FD1 / E-FVEU4FD1 / E-FVEU5FD1 の裁定(「max-exhausted 履歴を
保持して進み、最終 FD ゲートで未解決状態ごと人間が裁定する」)と E-FVEU7NFR1 の残 Major を、
第三(独立)レビュー実施後の状態で提示する。

## 前提となる実測(全て main `ebcdf5c8e` 以降で実施)

- 密閉検証: 全テストスイート(smoke/unit/integration/e2e、510 ファイル)green(2026-07-22 実測)
- 実ツールチェーン検証: live TLC probe 完走(TLC 1.7.4 実取得 sha 一致・OpenJDK 26.0.1・sandbox-exec・
  complete exploration `NOT_DETECTED`)— 詳細は `live-toolchain-probe-receipt.md`
- 第三レビュー: 独立 architecture-reviewer subagent 4 本(U3/U4/U5/U7)、読み取り専用・実測 verdict

## 第三レビュー verdict 集約

| Unit | 裁定時の未解決 | 第三レビュー結果 | 残課題 |
| --- | --- | --- | --- |
| U3 execution-evidence | iteration2 の 3 findings | **NOT READY** — F1 (writer race) FIXED / F2 (envelope 改変検出) FIXED / **F3 (finding union) PARTIAL** | BR-19 の discriminator 粒度未達(下記詳細) |
| U4 tla-arm-toolchain | iteration2 の 3 findings | **READY** — 3/3 FIXED | TIE 単独の unit test 不在(機能は reviewer が直接実行で確認済み) |
| U5 tla-invalid-timestamp-skeleton | iteration2 の 3 findings | **READY** — 3/3 FIXED | head/tree ドリフト専用テスト不在(OR 条件チェーンは clean:false ケースで被覆) |
| U7 full-matrix-suite | 残 Major 2 件 | **残 1 件 → PR #1342 で閉包** — M1 (InputSetIdentity 束縛) PARTIAL→修正 / M2 (IncompleteSuite binding) RESOLVED | PR #1342 マージで残 0 件 |

### U4 の要点(READY)

- hold markers + `TlaTallyReceipt` closed union(tla-arm.ts:72-82, :54-56)、GoA カーディナリティ式
  (:239-261 — blocks≥1→BLOCK / discuss≥2→DISCUSSION_NEEDED / favor+against=0→QUORUM_SHORT / unique argmax / 同数 TIE)
- 複合 invalid の precedence(:275-301 — budget→UNKNOWN_CHOICE→INVALID_TIMESTAMP→UNKNOWN_REF)を複合ケーステストで実測
- invariant source map の一意性(7 invariant 全行一意を reviewer が node 直接実行で実測)、queue=0 は型+実行時の二重ガード

### U5 の要点(READY)

- `WorktreeExecutionReceipt`(tla-skeleton-contract.ts:131-140)+ `verifyWorktree()`(tla-skeleton.ts:338-355)で
  起動直前 HEAD/tree/clean 再検証が run1/run2 両 attempt に構造的に適用
- CI artifact exactly-2-rows + run1/2 bijection + 全 raw identity re-hash(tla-skeleton-outcome.ts:199-249)
- COMMIT は `SkeletonFailureReason` から除去され `SkeletonCommitError` へ外部化 — head conflict が domain failure に
  ならないことを統合テストが直接実証

### U7 の要点(PR #1342 で閉包)

- 第三レビューが偽陽性を実再現: 別 inputSet 由来 schedule でも `verifyFullMatrix` が `CompleteMatrix` を返した
  (identity 照合が `buildMatrixEvidence` にしかない)
- FD 宣言済みの `INPUT_DRIFT` finding を validator 層へ実装し、reviewer repro を回帰テスト固定
  (落ちる実証: pre-fix 面 2 fail → fix 面 green を実測)— PR #1342

## 未解決 finding(人間裁定の対象)

### U3-F3: finding union の discriminator 粒度(BR-19)

BR-19(execution-evidence/functional-design/business-rules.md:40)は matrix validator に
「HARNESS_ERROR / timeout / missing / **identity corruption** / **chain drift** / **store failure** を
discriminator と cause 付きで区別」することを要求する。現行 `CompletenessFindingKind`
(evidence-completeness.ts:22)には後3者が無く、store 検証不合格は全て
`HANDWRITTEN { identity: "unknown", cause: 固定文字列 }` に畳み込まれる。`SUITE_TIMEOUT` は宣言のみで
生成箇所ゼロ(死んだ union メンバー)。

**最小是正で閉じられない理由**: 6 分類の判別には「store 読取時の失敗種別」を cell 型
(`VerifiedCellEvidence`)が運ぶ必要があり、U3 公開面と U7/U8 の消費面(`runFullMatrix` の cell 構築、
U8 `verifyStructure`)に波及する設計変更になる。deviation-stop 規範により実装者単独では進めず、
本ゲートの裁定対象とする。

**選択肢**:
- (a) seam 拡張を承認: `VerifiedCellEvidence` に typed store-read failure を追加し、U3/U7/U8 を同一変更で整合
  (BR-19 完全準拠。見積り: 実装+テストで小〜中規模)
- (b) BR-19 を改定: validator 層の判別は「complete / not-store-verified + cause」まで、6 分類は store 読取層
  (readCell の error union — 既に typed)に帰属させる(実装は現状維持+HANDWRITTEN の cause 実情報化+
  SUITE_TIMEOUT の除去 or 配線のみ)
- (c) 現状維持で未解決のまま記録(実験実行には U8 verifyStructure が IncompleteSuiteProof を一律
  STRUCTURAL_INCOMPLETE で fail-closed するため、安全性は保たれる — 分類の情報量だけが失われる)

### 軽微な残課題(裁定は不要、記録のみ)

- U3-F1 の防御分岐(「evidence ledger head changed」)を直接踏むテストが無い
- U4: TIE 単独の unit test 不在 / U5: head/tree ドリフト専用テスト不在
- U7 FD union の `HANDWRITTEN` は実装に無い(INPUT_DRIFT と異なり実再現された欠陥機序は無い)

## 裁定事項(人間へ)

1. U4 / U5 を第三レビュー READY として確定するか
2. U3-F3 の扱い: (a) seam 拡張 / (b) BR-19 改定 / (c) 未解決のまま記録
3. PR #1342(U7 閉包)のマージ
4. 上記確定後、`DESIGNED_BLOCKED_ON_FINAL_FD_GATE` / `DESIGNED_BLOCKED_ON_U3_U4_U5_GATE` の解除
   (status 型の変更はユーザー可視契約の変更にあたるため、裁定なしに実装しない)
