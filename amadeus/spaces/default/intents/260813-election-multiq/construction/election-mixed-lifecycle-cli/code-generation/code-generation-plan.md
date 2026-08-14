# コード生成計画 — election-mixed-lifecycle-cli

## 方針

U5 は既存コミット `fcd0d2f542 feat(election): orchestrate mixed lifecycle CLI` で実装済みである。9 verb、machine-readable directive、mixed lifecycle、held-only rerun、stale directive 拒否を再実装せず、承認済み functional/NFR design と既存 source/test の差分で実証できた欠落だけをテスト先行で補正する。

深度とテスト戦略は Standard。既存 Bun test / TypeScript / Biome 構成を再利用し、新しい test configuration は追加しない。Intent は full autonomy、本 unit は `gate: false` のため plan approval は認可済みとして扱う。`amadeus-state.md`、audit、commit、push、PR は変更しない。

## 変更面と非対象

| 面 | 対象 | 判断 |
|---|---|---|
| U5 正本 | `packages/framework/core/tools/amadeus-election-v2-cli.ts` | directive generation/execution/report、state/run/target/digest guard を検査し、実証された契約差分だけ修正する |
| U5 integration | `tests/integration/t553-election-mixed-lifecycle-cli.integration.test.ts` | lifecycle、preservation、stale/coverage/verification を確認する |
| U5 property | `tests/integration/t554-election-mixed-lifecycle-cli.pbt.test.ts` | mixed partition の決定性と held reason/target の対応を確認する |
| U5 process E2E | `tests/integration/t555-election-v2-directive-executor.integration.test.ts` | `next` の `verb` / `report` のみで mixed lifecycle を完走できることを確認する |
| test configuration | 既存 Bun test / TypeScript / Biome 設定 | 新規設定は不要。既存設定を再利用する |
| 非対象 | codec、tally policy、store、record/transport、legacy migration、TLA+、generated harness、deployment | U1〜U4/U6〜U8 の責務と共有作業ツリー差分を変更しない |

## 実装・検証手順

- [x] **Step 1: 設計・既存実装・統合コミットを照合する。** U5 functional design、security/performance design、unit 定義、requirements と commit `fcd0d2f542` を確認した。
- [x] **Step 2: focused baseline を取得する。** U5 integration/PBT/process E2E は変更前に 3 files、5 pass、0 fail、651 expect calls で green と確認した。
- [x] **Step 3: mixed lifecycle report の失敗テストを追加する。** 初回 mixed tally 後の `hold` notify は成功するが、元 directive の report が exit 1 / `stale-directive` になる Red を process E2E で再現した。
- [x] **Step 4: 実証された差分を最小修正する。** report 時の target 検証を directive kind に応じた現在の action target へ揃え、state/run/digest の fail-closed guard は維持した。
- [x] **Step 5: focused tests と対象 Biome check を実行する。** build 後の最終実行で U5 3 files、6 pass、0 fail、688 expect calls。新規 t555 test は Biome diagnostic なしだった。
- [x] **Step 6: repository 品質検証を実行する。** typecheck、lint、build、source-only boundary、diff whitespace、state file 不変を確認した。lint は既存 baseline の 473 warnings / 17 infos で exit 0。
- [x] **Step 7: 成果物を閉じる。** checkbox、code summary、PR convergence report を実測値へ更新し、code/test と stage evidence の blocker を分離した。

## 要件・設計トレーサビリティ

| Plan step | Requirement / rule | 検証方法 |
|---|---|---|
| Step 1–5 | FR-RER-1〜4、BR-D1〜D5 | fixed directive fields、held reason、held-only target、preserved digest、deterministic `next` の integration/PBT |
| Step 1–5 | FR-TAL-2/5/6、BR-C1〜C5 | target-only vote/tally、established rejection、U2/U3/U4 delegate の mixed lifecycle E2E |
| Step 3–5 | BR-T1〜T7、NFR-3/4 | expected state/run/target/digest、same-run repair、stale fail-closed、report receipt の process E2E |
| Step 1–5 | BR-O1〜O4 | stdout JSON、stderr one-line error、exit code、safe next action の process boundary |
| Step 1–6 | NFR-1、security controls | read-only `next` / `status`、Map/Set ベースの bounded processing、mutation 前 stale validation、typecheck/lint/build |
| Step 5–7 | U5 `Delivers`、NFR-5 | 9 verb orchestration と mixed completion の focused tests、成果物・検証証拠 |

## 完了条件

- 指定された3成果物が日本語で存在し、plan checkbox が実績と一致する。
- mixed lifecycle の directive-only process E2E が `hold` の notify/report を含めて `done` まで成功する。
- state/run/target/digest mismatch は引き続き fail-closed で拒否される。
- focused tests、typecheck、lint、build、source-only、diff check の結果を記録する。
- `amadeus-state.md` と U5 非対象の実装・共有差分を変更しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T17:35:41Z
- **Iteration:** 1
- **Scope decision:** none

差分は設計と整合する。tally-readyだけはコミット済みcandidate tallyのtargetを照合し、hold/distribute/render/verifyは状態遷移後を含む現在actionのtargetを照合するため、正当なhold reportを拒否せず、BR-T1〜T7およびFR-RER-1〜4のstate/run/target/digest fail-closed guardも弱めていない。U1〜U4のcodec、tally policy、store、record/transport責務の再実装、互換shim、fallback、二重実装は認められない。追加process E2Eは実装修正前にstale-directiveを再現し、directiveのverb/reportだけでmixed lifecycleをdoneまで完走するため、欠陥検出と回帰証明が独立している。許可成果物と提示diffから循環依存や無効なcross-referenceの具体的証拠はない。

### Findings

- FOLLOW-UP | pr-convergence-report-formatのpass:falseはU5コード品質のBLOCKERではない。正規PR identity、head、CLI attestation、audit receiptを必要とし、本実行ではcommit・push・PR・audit操作が明示的に禁止されているため、後続PR convergenceが所有して解消すべき配送証拠の未充足である。
