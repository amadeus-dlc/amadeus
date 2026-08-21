# Code Summary — U1 fmc-retirement

上流入力: `code-generation-plan.md` / FD 4 成果物(`business-logic-model.md`・`business-rules.md`・`domain-entities.md`・`frontend-components.md`)/ `../nfr-design/security-design.md` / `inception/units-generation/unit-of-work.md` / `inception/requirements-analysis/requirements.md`。数値は builder 完了報告と worktree 実測からの転記(測定 ref = worktree bolt-fmc-retirement、rebase 後 head 002b34542 系列、base = origin/main 5117c57b8)。

## 実装実測

- **規模**: `git diff --shortstat origin/main..HEAD`(rebase 前実測)= **271 files / +1,090 / −44,899**。コミット 6 件(fixture 新設 / B1 差し替え / A2 再配線 / O-5 代替 / 本体削除+CI+docs / allowlist 是正)
- **削除照合**: plugin 43 / specs 21(rfc 4 残置確認)/ tests 97(A1 92 + A2 再分類 4 + 改名旧 1)/ docs 全面 4 — census と一致
- **166 パス reconciliation 確定**(上流 §12a FOLLOW-UP 閉包): 多軸 grep 母集団 164 + boundary テスト + sha256 fixture = 166。A1 92 / A2 8 / B1 16 / B2 45 / 台帳 5
- **FR-DEL-1 落ちる実証**: 削除前 **1122 hits / 192 files**(現状赤)→ 削除後 **0 hits**(緑)、対照 `pr-convergence` 69 files 非ゼロ(述語健全)
- **TDD 実測**: t2415 は literal-pin 型と実読確定 → 正本先行更新で Red 1 fail(逐語 `Expected to contain: "model-map.json"`)→ Green 17 pass。O-5 代替 2 本とも Red 実測(2 fail / 1 fail)→ Green(5 pass / 4 pass)。B1/A2/B2 は characterization(前後 green)
- **B1 assertion 保全**: expect 静的件数 442 → 444(減少ゼロ、機械照合)
- **O-5 被覆**: regen 後 registry で 3 unit すべて covered(`amadeus-log advisory-decision` は UNDER-MECHANISM → covered へ改善、ratchet 87→88)
- **CI 面**: ci.yml job 106 行 + needs + require_result 除去、`grep -c formal-model-check ci.yml` = 0、risk arm の `require_result "e2e"` 維持(赤が止まる面の非空を実読確認)。detect-ci-changes 3→1 パターン。mise JDK 除去
- **検証(worktree、rebase 前)**: typecheck 0 / lint 0(warnings は全て pre-existing、接触ファイル diff 空で実証)/ **フルスイート `bun run test:ci -- -P 4` exit 0(1009 files / 0 failed / 13,563 assertions)** / source-only 0 / graph invariants 0 / registry --check 0 / complexity 0 / distribution 0
- **検証(rebase 後 5117c57b8 起点)**: build 0 / registry --check 0 / typecheck 0 / targeted 8 ファイル 46 pass / 0 fail。rebase 競合は #3399 の 3 ファイル(modify/delete)のみ — 削除側採用、マーカー残ゼロ機械確認
- **初回フルスイートの帰属**: t535/t537 = allowlist 欠落パス(是正 c8044bc46)、t435 = 並行実行 flake(単独 14 pass・2 回目再現せず — cross-job 帰属手順の適用)

## 逸脱(全て conductor 裁定済み — code-generation-plan.md の裁定表参照)

A2 のファイル内一部削除(2 件)/ fixture 形状 2 点 / INSTALL seam 変更 / census 未収載 2 件の回収 / **measured GraphQL fixture 2 件のリテラル置換(実測記録の改変 — FR-DEL-1 の 3 キーのみ、構造同一を機械検証。§12a レビュー対象として明示)** / B2 側 assertion 2 件の削除(subject 消滅)。

**加えて、承認後スコープ追補 2 件(下記「追補 1」「追補 2」)も開示済み逸脱に含める** — 根拠は ADR-7(ユーザー裁定 A)と unit-of-work.md「write scope 追補」節。逸脱の全数監査はこの 6+2 件が母集合である。

## FR トレーサビリティ追補(§12a iteration 1 FOLLOW-UP の名指し実測、配送ツリー = bolt worktree head 091e910c8)

- **FR-DOC-1**: `bun test tests/integration/t3028-sensors-docs-sync.integration.test.ts` → **12 pass / 0 fail**。docs 部分除去 16 + 索引 4 の残渣ゼロは FR-DEL-1 全域 grep(subject 0 hits、対照非ゼロ)が docs/ を対象集合に含む形で被覆
- **FR-DEL-3**: `bun .claude/tools/amadeus-graph.ts compile --check` → OK (i)-(v)。compiled `stage-graph.json` の slug 33 件中 `tla-authoring` / `formal-model-check` = **0 hits**(grep exit 1 = 不一致、対照 `"slug"` 33 hits)
- **FR-DEL-4**: `bun .claude/tools/amadeus-runner-gen.ts check` → **stage-runner set is in sync (30 runners)**(退役 2 stage の runner 不在を含む同期確認)

## 追補 1 — Project Coverage Gate 拡張(ユーザー裁定 A、2026-08-21)

PR #3401 の相対条件が高被覆コード削除の混合効果で構造的に赤(初回 −0.6955pp)となり、ユーザーが選択肢 A(ゲート拡張)を裁定。waiver・policy 緩和は不採用(ADR-4 整合)。

- **実装**(commit `ca1449428` / `e9d1c66bd`): `tests/lib/lcov-file-totals.ts` 新設(per-source LCOV 読取の単一定義)、`tests/coverage-project-gate.ts` の相対条件を「残存ファイル母集団(retained basis)」比較へ拡張(絶対条件は不変、`LCOV_TOTALS_MISMATCH` fail-closed、片側欠落時は従来比較へフォールバック=厳しい側)。ci.yml 4 箇所(base 側 lcov 搬送、cache key v2 繰り上げ)、t222 pin 追加、docs 対訳更新
- **落ちる実証(不可分 1 セット、実データ)**: (a) ablated head で旧判定 −0.5461pp 赤 / 新判定 +0.0141pp 緑 (b) 残存劣化注入(LH+60)で新判定 −0.0481pp 赤 → revert 残渣ゼロ(sha256 照合 4/4 OK) (c) unit テスト 45→54 pass
- **rebase**: origin/main 前進(#3375/#3393)に伴い base `38289ad1d` へ rebase。衝突 1 件のみ = `specs/tla/model-map.json`(modify/delete)— 削除側採用(main 側変更はハッシュピン更新のみで FR-DEL-2 の退役対象)

## 追補 2 — 残存コア被覆の回復(commit `091e910c8`)

新判定でも相対条件は赤(−0.1741pp)が残存 — 退役した plugin 系テストがコア側の分岐を広く駆動しており(未カバー純増 182 行: amadeus-graph +83 / advisory-choice +47 / orchestrate +39 ほか)、O-5 代替 2 本では一部しか回復しないことが実測で判明。AC「ゲート green」(FR-TEST-6 / NFR-1)の充足手段として公開 seam 経由の回復テストを追加(設計逸脱ではなく AC 充足の完遂):

- 新設: `tests/harness/plugin-composition-fixture.ts` + integration 4 本(`t-plugin-stage-compile` / `t-sensor-glob-expansion` / `t-advisory-choice-boundaries` / `t-plugin-runtime-trust`)— いずれも合成 fixture 経由の characterization(振る舞い不変の被覆源付け替え)
- Patch gate 赤 1 行(`coverage-project-gate.ts:522`)は removed 説明文を既存 `describeBasis` へ集約し両分岐を unit 被覆(t113 に +67 行)
- **ゲート実測(conductor 再実測)**: CI 実 base artifact(`38289ad1d`、totals 100150/106895 = 93.69% と lcov 整合を実読確認)比で `retained basis delta +0.0978pp` / **exit 0**。registry --check 0 / typecheck 0 / lint 0 / 新規・変更テスト 195 pass / 0 fail
- 実施主体: 追補 1 とテスト作成は builder subagent、最終検証・commit・push・create 再 mint は conductor(ユーザー指示によりメイン実施へ切替)

## swarm 収束・配送

referee converged:true(tamper 判定の経緯は plan 参照)。settle-release succeeded、pool terminal。配送 = 本 Bolt PR(単一 unit・単一 PR — multi-member 暫定禁止ノルムに整合)。FR-NORM-1 / FR-ISS-1 は着地後 conductor 実行。
