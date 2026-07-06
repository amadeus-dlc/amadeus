# Code Generation Plan — implicit unit

Intent: 260704-grilling-mode-wiring（bugfix scope、Minimal depth、test strategy: minimal）
対象 Issue: https://github.com/amadeus-dlc/amadeus/issues/442
上流成果物: `../../../inception/requirements-analysis/requirements.md`（R001〜R007、N001〜N004）

bugfix scope のため user stories は存在しない。traceability は requirements の ID へ張る。

## 実装ステップ

### Step 1: RED — 決定論的 wiring 検査と eval の追加（R006、N003）

- [x] `dev-scripts/grilling-wiring.ts` — 検査ロジックの lib（`grillingWiringIssues(root)`）。検査観点は次の 3 つ。
  1. `skills/amadeus/references/question-rendering.md` に Grill me mode のレンダリング規則（4 択 mode 選択と Grill me 選択時の規則）が存在する
  2. engine-bridge を参照するステージ skill（`skills/amadeus-*/SKILL.md`）の結線文言が新文言に揃っており、旧文言（無条件に bridge へ従う指示）が残っていない
  3. 対象ファイルの source（`skills/`）と昇格先（`.agents/skills/`）の内容が一致している
- [x] `dev-scripts/check-grilling-wiring.ts` — bin。issues があれば列挙して exit 1（`check-claude-host-wiring.ts` と同形）
- [x] `dev-scripts/evals/grilling-wiring/check.ts` — fixture ベースの eval。正常 fixture が pass、旧文言・annex 欠落・source/昇格先不一致の各 fixture が fail することを確認する
- [x] `package.json` — `grilling-wiring:check` を追加して `test:ci:mock` 連鎖に組み込み、`test:it:grilling-wiring` を追加して `test:it:all` 連鎖に組み込む
- [x] 実 repo に対して `grilling-wiring:check` を実行し、**fail することを確認**（RED の証跡を記録）

### Step 2: annex に Grill me mode を定義（R001、R002、N004）

- [x] `skills/amadeus/references/question-rendering.md` に節を追加。
  - mode 選択を「Guide me / Grill me / I'll edit the file / Chat」の 4 択（この順）でレンダリングする規則。Grill me は 2 番目、既定は Guide me（1 番目）のまま
  - Grill me のラベルは「Grill me」、説明は英語で one question at a time, recommended answer attached（bridge 準拠）の趣旨
  - Grill me 選択時のレンダリング規則: 一問ずつ、推奨回答と根拠付き、`[Answer]:` 書き戻し、`aidlc-log.ts decision/answer` 記録（`engine-bridge.md` への参照）

### Step 3: conductor の run-stage 行に 4 択指示を追加（R003）

- [x] `skills/amadeus/SKILL.md` の `run-stage` 行に、ステージ質問ファイルを埋めるときは annex の 4 択 mode 選択を提示する指示を追加

### Step 4: engine-bridge に mode 挿入定義を追記（R004）

- [x] `skills/amadeus-grilling/references/engine-bridge.md` に「mode 選択の 2 番目に Grill me として挿入され、選択時に本 bridge が適用される」定義を追記

### Step 5: 29 ステージ skill の結線文言を一括置換（R005、N001）

- [x] 旧 3 行ボイラープレート（「When this stage asks the user questions, follow the grilling bridge protocol …」）を、「mode 選択で Grill me を 2 番目に提示し、選択時は bridge に従う」趣旨の新文言（英語）へ一括置換
- [x] 既存 3 択（Guide me / I'll edit the file / Chat）の表記と挙動には触れない

### Step 6: 昇格同期（R007）

- [x] 変更した skill（`amadeus`、`amadeus-grilling`、29 ステージ skill）を `dev-scripts/promote-skill.ts <name> --replace` で昇格

### Step 7: GREEN — 検証（N002）

- [x] `npm run grilling-wiring:check` が pass(Step 1 の RED が GREEN に転じたことを記録)
- [x] `npm run test:it:grilling-wiring` が pass
- [x] `npm run test:it:promote-skill` が pass
- [x] `npm run parity:check` が pass(`aidlc-common/` 無差分、`engineFileExceptions` 空のまま)
- [x] `npm run test:all` が pass

### Step 8: code-summary の作成

- [x] `code-summary.md` に変更ファイル一覧、実装判断、検証結果、plan からの逸脱を記録

## Traceability

| Plan Step | Requirement |
|---|---|
| Step 1 | R006-grilling-wiring-check、N003-deterministic-check |
| Step 2 | R001-grill-me-mode-insertion、R002-annex-rendering-rule、N004-label-language |
| Step 3 | R003-conductor-run-stage-wiring |
| Step 4 | R004-engine-bridge-mode-definition |
| Step 5 | R005-stage-skill-wording-alignment、N001-existing-mode-unchanged |
| Step 6 | R007-promotion-sync |
| Step 7 | N002-parity-preserved、受け入れ条件（Issue #442） |

## テスト方針（minimal strategy）

新規テストは Step 1 の eval（`dev-scripts/evals/grilling-wiring/check.ts`）に集約する。
skill markdown の変更はこの決定論的検査が唯一の自動回帰検知であり、requirement-driven（R006 の 3 観点 = 3 assert 群）とする。
vitest / jest の設定追加は不要（既存の bun eval パターンに従う）。

## Review

**Verdict: READY**

- **Iteration 1 で指摘した相対パス誤りは修正済みで、実際に解決することを確認した。** `skills/amadeus/references/question-rendering.md`(および昇格先 `.agents/skills/amadeus/references/question-rendering.md`)の「If the user picks Grill me」段落は `../../amadeus-grilling/references/engine-bridge.md` に修正されており、`skills/amadeus/references/` を起点に実パス解決を検算したところ `skills/amadeus-grilling/references/engine-bridge.md` に正しく到達し、ファイルは実在する。source と昇格先は byte-for-byte 一致(`diff -q` で確認)。
- **`grilling-wiring:check` に相対パス解決チェックが追加され、同種の回帰を機械的に検出できるようになった。** `dev-scripts/grilling-wiring.ts` に `extractEngineBridgeRefs()`(バッククォート内の `...engine-bridge.md` 参照をすべて抽出)と `pathResolutionIssues()`(各参照ファイル自身のディレクトリを起点に実在チェック)が追加され、annex・conductor `SKILL.md`・29 ステージ skill・その昇格先すべてに適用されている。`dev-scripts/evals/grilling-wiring/check.ts` に `brokenAnnexPath` fixture が追加されており、Iteration 1 で見つかった「`question-rendering.md` から見て `../` が 1 段足りない」パターンをそのまま再現し、`"does not resolve to an existing file"` で fail することを確認した。単なる文字列存在チェックから実解決チェックへ変わったことで、検査の抜け穴(review question #4 の "brittle" 懸念)は解消されている。
- 全検証を再実行し、すべて pass を確認した: `npm run grilling-wiring:check`、`npm run test:it:grilling-wiring`、`npm run parity:check`(38 skills、197 engine files、基準 commit 一致)、`npm run typecheck`、`npm run lint:check`、`npm run test:all`(全項目、engine-e2e 含む)。
- `git status` で `.claude/aidlc-common/`・`.agents/aidlc/` 配下(`stage-graph.json` 含む)に差分がないことを再確認した。本 Intent の変更ファイル一覧外の差分(`intents.json`、`260704-v2-parity-completion` の audit shard)は hook による自動追記のみで、スコープ外として妥当。
- Iteration 1 で確認済みだった R001・R003・R004・R005・R007(実装 diff)、N001・N002・N003(既存挙動不変・parity・決定論性)、および `ask` 行(ルーティング質問向け結線)の無変更は、今回の修正で影響を受けておらず再確認でも変化なし。
- 以上により、要求書(R001〜R007、N001〜N004)を満たし、クロスリファレンスもすべて実解決することを確認できたため READY と判定する。
