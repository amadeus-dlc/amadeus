# Code Generation Plan — engine-validator-gap

Intent: 260705-engine-validator-gap（bugfix scope、Minimal depth、Minimal test strategy）
対象要求: `../../../inception/requirements-analysis/requirements.md` の R001（#457）、R002（#458）
方針: TDD（RED → GREEN → REFACTOR）。要求 1 件につき失敗する検証を 1 本先行させる。

## 事前調査で確定した実装点

- #457: `.agents/amadeus/tools/amadeus-state.ts` L998 の `relativeMemoryPath(nextStage.phase, nextStage.slug)` が record prefix 引数なし（space prefix へフォールバック）。`amadeus-runtime.ts` L372 と同型の `relativeRecordDir(...)` 第 3 引数渡しへ統一する。
- #458: `skills/amadeus-validator/validator/lifecycle-v2.ts` `checkStageMark`（L216-224）が scope 外ステージに `[S]` のみ許可。パーサ（`aidlc-state-contract.ts`）は checkbox の `annotation`（`— SKIP` 等）を既に取得しているため、`[ ]` ＋ annotation `SKIP` を合法形として追加する。
- 既存 eval fixture（`dev-scripts/evals/amadeus-validator/check.ts` L224 以降）は `[S] <slug> — SKIP: out of bugfix scope` という手書き形で、エンジン実出力（`[ ] <slug> — SKIP`）と乖離している。この乖離が #458 を検出できなかった原因であり、fixture をエンジン実出力形に合わせる。

## Steps

- [x] Step 1: RED（#457） — `dev-scripts/evals/aidlc-state/check.ts` に「advance の stdout JSON の `memory_path` が record prefix（`aidlc/spaces/<space>/intents/<dirName>/`）で始まる」検査を追加し、修正前に失敗することを確認する（R001 対応、Minimal: 要求 1 件 = 検査 1 本）
- [x] Step 2: RED（#458） — `dev-scripts/evals/amadeus-validator/check.ts` に、エンジン実出力形（scope 外ステージが `- [ ] <slug> — SKIP`）の state fixture を validator が pass する検査を追加し、修正前に失敗することを確認する（R002 対応）
- [x] Step 3: FIX（#457） — `amadeus-state.ts` handleAdvance の `memory_path` を `relativeMemoryPath(phase, slug, relativeRecordDir(pd))` へ変更する（import 追加を含む）。advance stdout の `memory_path` を読む既存消費者を grep で洗い出し、旧形式前提の消費者がないことを確認して結果を code-summary に記録する
- [x] Step 4: parity 宣言 — `dev-scripts/data/parity-map.json` の `engineFileExceptions` に `tools/aidlc-state.ts` を追加し、reason に本修正（#457）を追記する
- [x] Step 5: FIX（#458） — `skills/amadeus-validator/validator/lifecycle-v2.ts` `checkStageMark` を「scope 外ステージは `[S]`、または `[ ]` ＋ annotation が `SKIP`（`SKIP:` 前置含む）の場合に pass」へ変更する
- [x] Step 6: 昇格同期 — `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` で `.agents/skills/amadeus-validator/` を同期する
- [x] Step 7: GREEN 確認 — Step 1/2 の検査、`npm run test:it:aidlc-state`、`npm run test:it:amadeus-validator`、`npm run test:it:promote-skill`、`npm run test:it:engine-e2e` が成功することを確認する
- [x] Step 8: 実 record 検証 — `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-engine-validator-gap` を実行し、#458 の再現ケース（scope 外ステージが `[ ]`＋`SKIP` annotation）は pass することを確認した。ただし本 record には R001/R002 と無関係な別系統の既存不整合（Phase Progress の Verified 未反映、後述）が残っており、validator 全体の判定は fail のままである（詳細は本ファイル末尾の「Step 8 で新規発見した範囲外事項」を参照）。
- [x] Step 9: 全体検証 — `npm run test:all` が成功することを確認する

## テスト構成（Minimal strategy）

- 新規テストファイルは作らず、既存 eval（`dev-scripts/evals/aidlc-state/check.ts`、`dev-scripts/evals/amadeus-validator/check.ts`）へ検査を追加する。テスト設定（新規 config）は不要である。
- traceability: Step 1/3/4 → R001（#457）、Step 2/5/6/8 → R002（#458）、Step 7/9 → 受け入れ条件 GREEN。

## 変更しないもの

- `amadeus-utility.ts` state-build の `[ ] — SKIP` 出力（上流パリティ維持、Q2 で確定）
- validator の operation ステージ常時 `[S]` 要求の論点（範囲外、diary に記録済み）
- `.coderabbit.yml`

## Step 8 で新規発見した範囲外事項（R001/R002 とは無関係）

Step 8 で `AmadeusValidator` を本 Intent 自身の record に対して実行したところ、#458 の再現ケース（scope 外ステージの `[S]` 検査）は pass する一方、次の 2 件が新たに fail することを確認した。

- `先行 phase が Verified または Skipped である`。根拠: `Initialization: Active`
- `先行 phase が Verified または Skipped である`。根拠: `Inception: Pending`

調査の結果、次を確認した。

- 本 record の audit（`audit/j5ik2o-mac-studio-lan-0ec055a40c48.md`）には `initialization → inception` と `inception → construction` の `PHASE_COMPLETED` / `PHASE_VERIFIED` イベントが記録済みである。
- 一方、`.agents/amadeus/tools/amadeus-state.ts`（`handleAdvance`、`handleCompleteWorkflow` を含む全 handler）には、`## Phase Progress` セクションの `Initialization` / `Inception` などの値を `Verified` へ更新する処理が存在しない。intent-birth（state-build）が書いた初期値のまま残る。
- 試しに `amadeus-state.ts set "Initialization=Verified" "Inception=Verified"` で値だけを揃えたところ、今度は `.agents/amadeus/amadeus-common/protocols/stage-protocol-governance.md` §13 が要求する `verification/phase-check-<phase>.md` 成果物が存在しないという別の fail（`v2 契約: Verified の phase は phase-check 成果物を持つ`）に置き換わった。この成果物は Phase Boundary Verification 儀式の証跡であり、本 Intent の実行中に実施していないものを事後的に捏造するべきではないため、値は `Active` / `Pending` に戻した（本ファイル執筆時点の record は変更前の状態のまま）。

この 2 点は、R001（#457: advance の memory_path）にも R002（#458: validator の `[S]`/`[ ]`+SKIP 許容）にも該当しない、別系統の「エンジンが書く値と validator の許可値の不整合」候補である。要件定義（requirements.md）にも記載がなく、`checkStageMark` のような 1 関数の最小修正では閉じない（PHASE_VERIFIED イベント発生時に Phase Progress を更新する仕組み自体がエンジンに存在しない）ため、本 Bugfix Intent の scope 外として現状のまま残し、人間判断のための新規 Issue 化を推奨する。
