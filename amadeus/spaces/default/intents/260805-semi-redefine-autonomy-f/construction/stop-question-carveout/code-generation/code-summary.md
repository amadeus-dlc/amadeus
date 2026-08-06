# Code Summary — `stop-question-carveout`(#2253、swarm batch 2 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

## 着地

- ブランチ: `bolt-stop-question-carveout`(builder worktree ブランチから ff 採用、最終 HEAD `24647a2df`)。conductor ブランチへ --no-ff 回収マージ済み(ls-files -u 0)。
- コミット: `b787df05f` feat(stop): open the question carve-out to human-declared semi Intents / `6a67bbc96` test(stop) / `24647a2df` docs(stop)。

## 変更ファイル

`packages/framework/core/hooks/amadeus-stop.ts`(`isQuestionCarveoutIntent` 新設 :189、差し替えは :447 の 1 箇所のみ。:482 / :741・cap/budget 無改変)/ `tests/integration/t456-stop-question-carveout.integration.test.ts`(新規)/ `tests/unit/t121-*`(full 限定ピンの明示改訂+S3 追加 — FR による仕様改訂の申告付き)。

## 検証(builder 実測 exit code + conductor 統合再実測)

builder(worktree): build 0(drift なし)/ typecheck 0 / lint 0 / t456・t121 0 / complexity 0 / registry 0 / source-only 0 / full `bash tests/run-tests.sh --ci` PASS(852 files)。
conductor(マージ後統合): referee `amadeus-swarm check` converged=true / tampered=false、finalize(batch 3)converged。統合 typecheck 0 / lint 0 / full --ci は本 backfill と並行実行(結果は stage diary へ記録)。

## 申告

- t121 の既存ピン反転は FR が命じる仕様置き換え(`cid:reverse-engineering:c1-pinned-behavior-ruling` の要件段裁定済みクラス)— assertion の弱体化ではなく対象状態の反転+S3 追加。
