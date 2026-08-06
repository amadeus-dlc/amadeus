# Code Summary — `advisory-auto-resolution`(#2253、swarm batch 2 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

## 着地

- ブランチ: `bolt-advisory-auto-resolution`(builder worktree ブランチから ff 採用、最終 HEAD `2c42d13e6ae6031ecd1ccb292685efb74ba6ef8f`)。conductor ブランチへ --no-ff 回収マージ済み(`ba38c52cc`、競合 13 ファイルは定型解消 — codekb 9 件は ours 上位集合の機械実測、elections/intents/project.md は和集合、ratchet 台帳は両エントリ保持。マーカー全域 grep 0・JSON parse 検証済み)。
- コミット: `93b341311` feat(advisory): resolve pending advisory choices through the autonomy ladder / `2c42d13e6` fix(advisory): keep the autonomy stack off the prompt hook's load path。

## 変更ファイル

ソース: `packages/framework/core/tools/amadeus-advisory-choice.ts`(C16+C17)、`amadeus-orchestrate.ts`(two-branch guard)、`amadeus-intent-autonomy-production.ts`(`effectClassifications`・`PROHIBITED_EFFECTS` export)、`packages/framework/core/hooks/amadeus-mint-presence.ts`、`packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts`。
テスト: t457(unit)・t459(unit)・t458(integration)新規/ t-advisory-choice-record・t-advisory-human-choice-boundaries・t-advisory-human-choice-domain・t445・t203・t-coverage-mechanism-ratchet(receipt 形状同期)。台帳: coverage registry・patch allowlist(584 selector 全解決、stale 1 件は `--create-selector` で再アンカー、span 23 行不変 = straddle 膨張なし)。

## 検証(builder 実測 exit code + conductor 統合再実測)

builder(worktree): BUILD 0(drift 0 行)/ TYPECHECK 0 / LINT 0 / t457+t458+t459 0 / advisory 系 8 スイート 0 / COMPLEXITY 0 / REGISTRY 0 / SOURCEONLY 0 / full `bash tests/run-tests.sh --ci` **PASS 861 files・11477 assertions・0 fail**。落ちる実証 3 件(注入→赤→復元→残渣 0)。`recordProtectedAdvisoryChoice` 残存 grep 0(FR-ADV-3 置き換え確認)。
conductor(マージ後統合): referee `amadeus-swarm check` converged=true / tampered=false、finalize(batch 3)converged 3/0。統合 typecheck 0 / lint 0 / full --ci は本 backfill と並行実行(結果は stage diary へ記録)。

## 申告(FD 逐語超過 2 点+既存テスト改訂 — レビュー観点として引き継ぎ)

1. `commitProductionQuestionDecision` へ optional `effectClassifications` map を追加 — FD step 2 の effect registry(`defer-with-risk` = `quality-waiver` 分類)は既存 adapter の `workflow-reversible` ハードコードでは執行不能で、欠くと副次バリアが検証劇場化する(org.md Forbidden 回避)。既存呼び出しの既定挙動は不変。
2. `auto-decision` provenance に FD の 5 フィールドを超えて `phase`・`graphRevision` を搭載 — occurrence id が当該入力の digest であるため、搭載により誤帰属が自己申告でなく構造的に不能になる。全 provenance フィールドに消費者あり(parse gate / binding check)。t458・t459 で固定。
3. 既存 6 テストファイルの receipt 形状同期は FR-ADV-3(並存させない)による機械的改訂 — `cid:reverse-engineering:c1-pinned-behavior-ruling` の要件段裁定済みクラス、assertion 弱体化なし。
4. FD D4 の lock 4 箇所は base 前進で 7 箇所に増加 — 全 7 箇所を実測のうえ停止条件非該当と判定(本 plan §1)。
