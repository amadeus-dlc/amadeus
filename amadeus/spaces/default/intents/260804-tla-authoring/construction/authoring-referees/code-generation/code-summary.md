# Code Summary — U3 authoring-referees(Bolt 3、バッチ 2)

上流入力(consumes 全数): U3 functional-design / nfr-design 成果物(READY 確定)、code-generation-plan.md、bolt-plan.md Bolt 3 節。

## 実装結果(実測)

- ブランチ: `bolt-authoring-referees`(base = tla-authoring-wt f00ce22c3)
- コミット(5件): 6dc9c59e0(C3 trace coverage)→ c1a14763d(C5 proof obligations)→ 4c66dd959(trace CLI 配線)→ bcfdbddaf(複雑度分割リファクタ)→ ed31d34ae(**裁定 A 是正: proof CLI + production TLC adapter**)
- 新設: `plugins/formal-model-check/tools/tla-referees.ts`(C3 + C5 + MutationWorkshopFs)、`tla-referee-toolchain.ts`(production adapter — 既存 toolchain 無改変を conductor が `git diff --stat f00ce22c3..HEAD` 空で機械確認)、`tests/formal-verif/support/tla-referee-real-toolchain-probe.ts`(standalone probe)、テスト t446(unit 38)+ t447(integration 15)
- 変更: `tla-authoring.ts`(trace / proof verbs、entry async 化)、`plugin.json`(重複宣言除去 + 2ツール登録 = 31件)、t439(async 追随の await のみ・assert 不変 — conductor が git diff で機械確認)

## 独立レビュー(§12a 相当、iteration 2/2)

- iteration 1: **REVISE(GoA 6)** — BLOCKER: proof CLI 欠落(3層契約: component-methods.md:143 / unit-of-work.md:38 / FD §3)。注: builder は逸脱1として申告・停止済み — 裁定待ちの宣言済み逸脱であり無申告ではない
- 人間裁定 A(2026-08-05): proof CLI + production adapter を本 Bolt で完遂 → ed31d34ae で実装
- iteration 2: **READY(GoA 2)** — proof CLI の argv 契約逐語一致、adapter の import-only 非破壊(conductor が diff 空で FOLLOW-UP 閉包)、reject→typed ProofFailure の実挙動テスト確認、slop なし

## 検証(実測 exit code)

- builder(HEAD ed31d34ae): typecheck 0 / lint 0 / complexity 0 / source-only 0 / coverage-registry 0 / t446+t447+t439 = 80 pass 0 fail / full CI RESULT: PASS(837 files / 11,062 assertions)/ `bun run build` 0・追跡ファイル差分なし
- conductor 裏取り: typecheck 0 / t446+t447+t439 = **80 pass / 0 fail**
- referee: `amadeus-swarm check authoring-referees` converged=true / tampered=false
- 統合ツリー(U2 マージ後): typecheck 0 / lint 0 / **full CI RESULT: PASS(842 files / 11,142 assertions / 0 fail)**
- 実 TLC 環境: 既存 probe exit 0(tla2tools 1.7.4、sha256 936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88、OpenJDK 26.0.1)。mise shim の JAVA_HOME 上書きに注意(実 bun バイナリ直呼びで解消)— 手順知識として記録

## 逸脱・裁定

1. **逸脱1(proof CLI)→ 裁定 A で完遂**: 上記のとおり閉包
2. **逸脱2(fallingMutation manifest 宣言)**: FD 未規定の falling 変異供給元を witness と対称な作者宣言の逐語置換({find, replace})で補完。アンカー不一致は mutation-failure で赤(無音 no-op なし)。機械的 `I /\ FALSE` は初期状態で必ず赤になり検証劇場化するため不採用 — conductor 受理、レビューも BR-U3-05 整合確認
3. **逸脱3(TDD 規律)**: handler 層6テストは事後追加(slice 2 実装後、初回から green)。CLI 系は Red→Green 実測済み — 規律申告として記録
4. **受理されたギャップ(裁定 C、2026-08-05)**: 変異系(falling/vacuity)モデルは model-map 未登録のため、実 TLC 実行の3経路すべてが登録済みモデルのバイト固定で拒否する(`run-model-check-source.ts:157` / `tla-arm.ts:636` frozen 経路 / `fs-tlc-toolchain.ts:1641` → `tla-model-receipt.ts:154-157`)。referee はこれを typed ProofFailure として loud に拒否(クラッシュ・無音 fail-open なし)。BR-U3-01(U3 は登録しない)× 登録済み検査 × ADR-5(toolchain 無改変)の3制約下で構造的に不能と実測確定 — **「登録済みモデルのみ実 TLC・未登録変異系は fail-closed で loud 拒否」を現行仕様として受理。解消先 = 後続 Issue #2286(変異モデルの一時登録面 + hermetic TLC fixture jar)。当初の裁定は U4 での解消だったが、U4 registration-committer の設計(正規 map の atomic replace)は一時登録面を含まないため、ユーザー裁定(2026-08-05)で解消先を #2286 へ変更**

## 申し送り

- 後続 Issue #2286 への引き継ぎ(旧記載「U4 設計への引き継ぎ」をユーザー裁定 2026-08-05 で訂正): 変異系の一時登録 API(裁定 C の解消先)。referee 側の結線点は `ProofObligations.evaluate` の toolchain port 注入(変更不要)と `tla-referee-toolchain.ts` の receipt 供給面
