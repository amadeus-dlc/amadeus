# 実装ノート — U-1 landed-finalization(#3062 / FR-1)

測定 ref: worktree `bolt-landed-finalization`、base commit `8b36a0ad0`(`git log --oneline -1`)。以下の行番号はすべて `8b36a0ad0` 断面の実測。

## Step 1: 患部の現行断面(再実測)

`git grep -n "landed" -- plugins/github-pr-convergence/tools/pr-convergence-cli.ts` からの転記:

| 層 | 行 | 内容 |
| --- | --- | --- |
| CLI 1 | `pr-convergence-cli.ts:823` | `writeSelfReport` 冒頭。`report.kind === "landed"` → exit 1 `landed is not convergence evidence` |
| CLI 2 | `pr-convergence-cli.ts:1260` | `reportOutcome` の landed 分岐。`self !== null` → 同 exit 1 |
| CLI 3 | `pr-convergence-cli.ts:1364-1366` | `runConvergence` 入口。`isSelfRecord(record) && evaluation.kind === "landed"` → 同 exit 1(verb 非依存 = status / report / override を一律拒否) |
| センサー | `amadeus-sensor-pr-convergence-report-format.ts:368-371` | `kind === "landed"` に無条件で finding を push(`stage` 引数を参照しない = stage 非依存の拒否) |
| 非 self の landed 扱い | `pr-convergence-cli.ts:1392-1393` | `const settled = verdict.converged || evaluation.value.kind === "landed";` → status exit 0 |

FR-1 (3) の非対称はこの CLI 3(self のみの入口拒否)+ CLI 1/2(self report 経路の拒否)であることを確認した。

## Step 1: 波及候補 3 モジュールの射程判定

RE が挙げた波及候補について `git show HEAD:<path> | grep -c 'landed'` を実行(base 断面):

- `pr-convergence-attestation.ts` → **0 hit**
- `pr-convergence-provenance.ts` → **0 hit**
- `pr-convergence-ledger.ts` → **2 hit**(:77 / :340。いずれも "the commit that landed it" / "reply names where the fix landed" という散文コメントで、`kind: "landed"` の判別値を消費していない)

判別値 `"landed"` の実消費面は `git grep -n '"landed"' -- 'plugins/**' 'packages/**'` で `pr-convergence-cli.ts` / `amadeus-sensor-pr-convergence-report-format.ts` / `pr-convergence-predicate.ts:262,284`(`EvaluatedVerdict.verdict` の定義と `landedVerdict` の構成)のみ。predicate は landed を第一級 verdict として既に定義しており本是正で変更不要。

**結論**: 3 モジュールはいずれも変更対象外。是正射程は CLI + センサー + stage 文書 + センサー manifest に閉じる。

## Step 2-5: TDD の実測

### Red(実装前)

`bun test tests/integration/t3062-pr-convergence-landed-finalization.integration.test.ts` → **3 fail / 1 pass**。

- fail: `status on a merged self record is settled: exit 0 with the landed verdict`(exit 1 / stderr `landed is not convergence evidence`)
- fail: `report writes the attested landed record with the merge facts`(同 stderr)
- fail: `the blocking sensor accepts the landed record at the pr-convergence stage`(report が exit 1 のため到達不能)
- pass: `the created report that precedes the merge is still rejected there`(落ちる実証の負方向。是正前から正しく赤を出す面)

### Green(実装後)

同コマンド → **4 pass / 0 fail**(32 expect)。

関連スイート一括: `bun test t450 t482 t541 t448 t533 t534(integration)t3062 t481 t534(unit)t2996` → **220 pass / 0 fail**。
ゲート系: `complexity-gate` / `t-test-size-drift` / `t-plugin-projection-packaging` / `t416` / `t445` / `t449` → **98 pass / 0 fail**。
allowlist 台帳: `bun tests/allowlist-semantic-audit.ts` → exit 0、`t534/t535/t536` → 48 pass / 0 fail。
coverage registry: `bun tests/gen-coverage-registry.ts` 実行後に追跡ファイル差分なし、`--check` → `coverage registry: OK (fresh, guards green, ratchet held)` exit 0。

## Step 5: 落ちる実証(1 セット)

正方向・負方向は同一 fixture の対で持つ(t3062 の 3 番目と 4 番目のテスト): merged fixture → sensor pass(findings 0)/ 未 merge(created のまま)fixture → sensor fail(field `kind`)。

注入 → 赤 → revert(対象 `amadeus-sensor-pr-convergence-report-format.ts`、実行スイート `t450`):

| 注入 | 結果 |
| --- | --- |
| `if (stage !== "pr-convergence") {` → `if (false) {`(landed を全 stage で合格化) | t450 **42 pass / 1 fail** |
| merge commit の object-id 形式検査ブロックを削除 | t450 **42 pass / 1 fail** |

いずれも revert 後に `grep -c 'not a commit object id'` = 1、`grep -n 'stage !== "pr-convergence"'` = :384 を確認し、t450 → **43 pass / 0 fail** に復帰。残渣ゼロ。

## Step 6: 契約改訂

- `plugins/github-pr-convergence/stages/pr-convergence.md` — 「**Already merged?**」節を旧契約(self では status / report が拒否、landed report はセンサーを満たせない)から「merge は既に起きた記録事実であり、収束証拠とは区別して記録する」へ書き換え、merge queue の auto-merge が `report` より先に着地した場合は `landed` report で最終化するという順序契約を明記。override 節の「already-converged **or merged**」を「already-converged」へ改め、merged は `report` が landed として記録すると追記。
- `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md` — 「`landed` is rejected」を、`--stage pr-convergence` に限り合格する canonical kind の項目へ置換(合格条件: `converged: false` / parse 可能な `merged at` / commit object id 形式の `merge commit`、check rollup は記録のみで合格条件にしない)。

## 設計裁定の反映確認

- 裁定 A(landed 記録方式): self でも `kind: landed` / `converged: false` の report を書き、merge fact は非 self 経路が既に書く集合(`mergedAt` / `mergeCommitOid` / `checkRollupState`)と同一。新フィールドは発明していない。
- 留保 1(`checkRollupState` は記録項目・合格必須条件にしない): センサーは rollup を一切参照しない(`checkLanded` は `merged at` / `merge commit` のみ検査)。
- 留保 2(`converged:false` 意味論維持): landed report は `converged: false` のまま。センサーは `converged: true` の landed を従前どおり矛盾として拒否。
- 留保 3(旧拒否は削除して置換・二重経路なし): CLI 3層をすべて削除。landed の self 経路は非 self と同じ `ConvergenceReport` を構成し、self のときだけ `writeSelfReport`(attestation + audit + sensor)へ渡す単一分岐。フォールバックや互換シムは追加していない。
- 是正に伴い `transitionAllowed` に `created -> landed` を追加(created epoch → auto-merge 着地 → landed 最終化)。final state からの遷移や final state の相互上書きは追加していない。

## 既存テストの契約更新

`tests/integration/t448-pr-convergence-cli.integration.test.ts` の `a merged pull request is not convergence evidence for a self record` は旧拒否契約を固定していたため、新契約下で残る不変条件 —— 「merged でも created epoch がなければ最終化できない」 —— を検査するテストへ置換した(`created report is missing` を実測)。
