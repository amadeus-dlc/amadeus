# Code Generation Plan — fix-2766-tla-applicability-wiring

上流入力（consumes 全数）: `requirements.md`

本プランは `requirements.md`（FR-1〜FR-7 / NFR-1〜3 / 制約 / スコープ外）を唯一の要件正本とし、同 §7 が設計段へ委譲した 5 論点をここで裁定する（self-fix スコープは functional-design を SKIP するため、設計裁定の所在は本プラン — `cid:code-generation:degrade-scope-unit-dir-layout` 系の degrade 経路）。

## 設計裁定（D1〜D5）

### D1（FR-1: 供給経路の実装方式）= 宣言ファイル書き手 CLI

`tla-authoring.ts` に verb group **`subjects`**（`subjects declare`）を新設し、`authoring-subjects.json` の唯一の書込点とする。入力は `--document <path> --kind <requirements|decisions>`（複数可）+ `--id <stable-id>`（複数可）。書込は staging + `renameSync` の atomic replace（`tla-registration.ts:265-270` の既習様式に倣う — 引用元のエラー分岐（失敗時 `rmSync(staging,{force:true})`）まで含めて一致させる）。書込前に `parseGovernedSubjects` と同一の検証 + `governedIdentity` の解決可能性検査を行い、解決不能な宣言は書かずに fail-closed（loud exit 1）。
**却下代替**: (b) checkpoint からの intent 成果物直接評価 — evaluator の同期 spawn 制約（NFR-1: 60 秒 timeout / 8MiB）内で毎 `next` × 3 checkpoint の全走査は停止リスク（RE 負債 7）であり、FR-5（空集合段階導入）とも整合しない。(c) 併用 — 2 書込経路は write⇔read 対称性を崩す（`cid:requirements-analysis:symmetric-pair-review`）。

### D2（FR-3: 実行接続の実現形）= 宣言 schema への `handoff` フィールド追加（formalCheck は null のまま）

advisory 宣言 schema に optional **`handoff: { stage: <slug> }`** を追加し、`amadeus-advisory-declaration.ts` の parse がこれを読み、engine の `await-advisory-choice` directive に **`handoff_stage`** として搬送する。`formal-model-check/plugin.json` の `authoring-hold` 宣言へ `"handoff": {"stage": "tla-authoring"}` を追加する。run-now 選択時の conductor 契約（`handoff_stage` があるとき run-now = `--stage <handoff_stage> --single` の起動）を stage-protocol.md §11a と docs 22 へ明文化する。
**FR-3 との対応の明示**: FR-3 本文の「宣言（`formalCheck`）を埋める形か ADR-6 を改訂する形か」の二択に対し、本裁定は第三の形 = ADR-6 改訂（2026-08-04）が既に許容する「宣言読取一般化に限る小さな engine 変更」の第3一般化点（handoff 宣言の読取）である。`formalCheck` は **null のまま**（BR-U2-05 の解除意味論と `t445-advisory-declaration-supply:257-274` のピンは無改変で維持 — run-now は起動接続であって解除経路ではない、を構造で表現する）。`declaredFormalCheckRoute` の `stage: "formal-model-check"`（`amadeus-advisory-choice.ts:948`）は formalCheck 経路専用のため本裁定では触らない（FR-3 の「遷移先の宣言駆動化」は handoff フィールドが担う）。
**却下代替**: (a) `formalCheck` に authoring 起動コマンドを埋める — 「formal check の実行」と「stage の起動」は意味論が異なり、run-now → コマンド実行 → 再 `next` の既存契約でステージ起動をネストさせると forwarding loop を破る。(b) ADR-6 の checkpoint 機構自体の改訂 — 発火点・解除規則は無変更が ADR-6 改訂の明示条件。

### D3（FR-4: FR-005 receipt の発行 owner）= `applicability receipt --persist`

既存 `applicability receipt` verb に `--persist`（+ 既存 `--store`）を追加する。route が終端（`impl-only` / `non-target`）かつ検証済み human approval があるとき、`terminal-route-receipt`（parts = applicability + approval、`tla-evidence.ts:274-275` の `TERMINAL_RECEIPTS`）を `EvidenceBundle.build` 経由で evidence store へ永続化する。owner = applicability judge を実行する conductor の同一 CLI フロー（judge → receipt --persist の 2 verb 直列）。`stages/tla-authoring.md:40-44` の終端経路拒否と `t450:163` のピンは**無改変**（stage は authoring 専用のまま、receipt 発行は stage 外の CLI が担う — ピンの意味論と一致）。

### D4（subjects 置き場）= watch-glob の外へ移設

`defaultSubjectsPath` を `specs/tla/authoring-subjects.json` から **`specs/authoring-subjects.json`**（= `dirname(resolveSpecRoots().tlaDir)` 直下、`ACTIVATION_WATCH_GLOBS = ["tla/**"]` の外）へ変更する。根拠: 宣言更新のたびに兄弟 advisory（spec-hash `changed`）が発火する非対称の解消（RE 🔴 R2）。evidence store を「既存 advisory 監視 glob の外」に置いた ADR-7 の設計意図（`amadeus-plugin-activation.ts:49-50` に明言）と対称。`t481-spec-root-resolver.integration.test.ts:227` の path 等価 assert は**明示改訂**（テスト契約の改訂として plan に宣言 — `cid:reverse-engineering:c1-pinned-behavior-ruling` 準拠、本プランがその裁定）。docs 22（en :223 / ja :112）の記載も同一変更で更新する。

### D5（FR-7: 痕跡の粒度）= hold を跨ぐ遷移のみ記録

hold の発生・解除（hold → 評価器 no-hold）の遷移は advisory 記録面（`.amadeus-advisory-choice.json` store / audit）に載せる。先行 hold のない純粋 no-hold は現行どおり痕跡なし（`advisoryFromEvaluatorRun` :171 の null 化を維持 — 毎 `next` × 3 checkpoint の記録肥大回避、FR-7 の設計判断条項の行使)。実装時に hold 記録の既存挿入点を再列挙し（`emitActivationAdvisory` の 2 call site `amadeus-orchestrate.ts:1808/:1844` の両方を棚卸し — RE 負債 8、`cid:requirements-analysis:enumeration-reverify-at-implementation`）、解除遷移の記録が既存機構で満たされる場合は新規コードを足さない（実測が先、追加は最小）。

## 実装ステップ（TDD — 各スライスで Red 実測 → 最小実装 → Green）

前提: 編集正本は `plugins/formal-model-check/` と `packages/framework/core/tools/`。テスト番号は **t524〜t529 を本プランで予約**（RE 実測: 使用済み最大 t523。`cid:code-generation:swarm-test-number-reservation`）。

1. **Step 1（FR-2 / t525）文法拡張**: `REQUIREMENTS_HEADING_RE` を実コーパス形（`FR-1` / `FR-CROSS-1` / `NFR-1` / `AC-1`、数字終端必須 — `FR-NA` 等の無数字形は対象外のまま）へ拡張。AC 逐語: 「実在 intent の requirements.md 見出し形を写した fixture で抽出が成功し、拡張前に `unresolvable-id` だった形が解消すること。登録済み evidence（model-map 2 モデル）への影響ゼロを機械確認する」。
2. **Step 2（FR-1 + D4 / t524）subjects 書き手**: `subjects declare` verb + `defaultSubjectsPath` の glob 外移設 + t481:227 の明示改訂。AC 逐語: 「書き手の実行後、`advisory hold` が宣言された subjects の identity を実際に評価する（`no governed subjects are declared` 以外の経路へ入る）ことをテストで実証する」。
3. **Step 3（FR-3 + D2 / t526）handoff 接続**: 宣言 parse（`handoff` フィールド）→ directive 搬送（`handoff_stage`）→ run-now 非解除の対照。AC 逐語: 「hold 状態からの run-now 選択で `tla-authoring` 到達経路（実行コマンドまたは同等の引き渡し）が構成されることをテストで実証し、その経路が hold を解除しない（解除は評価器の no-hold のみ）ことを同時に固定する」。
4. **Step 4（FR-4 + D3 / t527）terminal receipt 永続化**: `applicability receipt --persist`。AC 逐語: 「非対象判定の receipt が evidence store に永続化され、`advisory hold` の解除根拠として実際に消費されること」。
5. **Step 5（FR-7 + D5 / t529）痕跡**: AC 逐語: 「hold / 解除の遷移が既存の advisory 記録面（`.amadeus-advisory-choice.json` / audit）に載ることをテストで実証する」。既存機構で充足なら追加コードなし + テストのみで固定。
6. **Step 6（FR-5 + FR-6 / t528）段階導入ピン + 端到端回帰**: AC 逐語（FR-5）: 「着地コミット時点で `authoring-subjects.json` は依然として存在せず、全既存 intent のワークフローが従前どおり進行すること」（= 不在 → no-hold の既存ピン `t445:354` 不変 + 本 repo に宣言ファイルを作らない）。FR-6: 供給 → checkpoint 評価 → hold → 実行接続 → 解除の端到端を fixture で通し、落ちる実証は正負両側（供給欠如で素通り / 宣言投入で hold）を固定。
7. **Step 7 同期・検証**: docs 22（en/ja）更新、`bun run build`（self-install 再生成・全ハーネス）、`bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` 相当の対象スイート、coverage patch / complexity / drift の blocking gate、deslop、PR 発行。

## 制約の遵守（プラン段の宣言）

- BR-U2-05 不可侵（D2 が構造で保証 — formalCheck null 維持）。逸脱が必要になったら実装前停止（`cid:code-generation:deviation-stop-before-implement` — 既存様式への準拠と判断する場合も停止対象）。
- `scopes: []` / `t445-stage-frontmatter-compose:135` 無改変。
- 明示改訂するテスト契約は **t481:227（D4 の path 変更）のみ**。他の既存ピン（t445 両系・t450 系・t444）は無改変で green を維持する。
- NFR-2: fail-closed 3 経路（`governed-subjects-unreadable` / `unresolvable-id` / `evidence-unreadable`）は緩和しない。
- 着地時に `authoring-subjects.json` も evidence store も本 repo に作らない（FR-5。テストはすべて fixture / scratch）。

## 検証コマンド（完了条件）

`bun run typecheck` = 0、`bun run lint` = 0、新規 t524〜t529 + 既存ピン（t444 / t445×2 / t450 / t481）green、`bun run build` 後に tracked 不変、coverage patch gate PASS、complexity gate PASS。PR 発行 → 収束（pr-convergence plugin）→ `pr-convergence-report.md` 生成 → §12a → approve の順（`cid:code-generation:c2-ssp-plugin-overlay-review-order`）。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T03:10:43Z
- **Iteration:** 1
- **Scope decision:** none

READY (BLOCKER 0 / MAJOR 0)。D1-D5 と実装の忠実性・逸脱開示の完全性(t436 改訂 = 申告済み、t481:227 = 事前承認、t113 = 純追加)・BR-U2-05 保存(formalCheck null 維持 + run-now 非解除の両側 assert)・core/plugin 境界(plugin 語彙の core 混入ゼロ)・compat shim なし・falling-proof 整合・slop なしを実コード照合で確認。

### Findings

- FOLLOW-UP | tla-evidence.ts:42 vs :50 — STABLE_ID_RE(3桁固定)と拡張後 REQUIREMENTS_HEADING_RE の非対称。code-summary 申し送り §1 で自己開示済み・authoring-hold 経路は非依存で非ブロック(別 Issue 起票候補)
- NIT | code-summary.md:39 — --persist true の明示値制約は docs 22 記載済みで対応不要
