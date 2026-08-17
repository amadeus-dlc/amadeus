# code-summary 草稿 — unit prc-finalization(Bolt 3 / FR-3 / Issue #3149)

commit: `66b398a2e`(branch `bolt-pbb3-prc-finalization`、base `89053172e`)

## 変更ファイル(`git diff --stat 89053172e..HEAD` 転記)

```
 .../sensors/amadeus-pr-convergence-report-format.md |  10 +
 .../github-pr-convergence/stages/pr-convergence.md  |  50 ++-
 .../amadeus-sensor-pr-convergence-report-format.ts  |  54 ++-
 .../tools/pr-convergence-attestation.ts             |   7 +-
 .../tools/pr-convergence-cli.ts                     | 371 ++++++++++++++++---
 ...vergence-stale-epoch-landed.integration.test.ts  |  23 +-
 ...rgence-report-format-sensor.integration.test.ts  |  51 +++
 ...convergence-merged-finalisation.integration...ts | 555 +++++++++++++++++++++
 8 files changed, 1029 insertions(+), 92 deletions(-)
```

## Step 1 の再実測(ADR-4 契約4、測定 tree = worktree HEAD `89053172e`)

3 ペアすべてで **patch 等価は不成立**、祖先関係も不成立。裁定(ADR-4 = override のみ)の前提は現行断面でも維持。

| pair | tree 一致 | patch-id 一致 | `merge-base --is-ancestor` |
|---|---|---|---|
| 66dc18b4 → a91edf2ac | 否(4459919857… / 22493d3666…) | 否(d84ca216… / f2ea282e…) | exit 1(非祖先) |
| 46d8e8524 → 26d04cd0 | 否(0dd054017… / bfb8e5e710…) | 否(fd2837d0… / aa28e13b…) | exit 1(非祖先) |
| df4c7489 → de3581285 | 否(d74df4e67… / 9586d73eaa…) | 否(24241f3c… / f23d4938…) | exit 1(非祖先) |

取得コマンド: `git rev-parse <sha>^{tree}` / `git diff-tree -p <sha>^ <sha> | git patch-id --stable` / `git merge-base --is-ancestor <attested> <merged>`。6 コミットすべて `git rev-parse --verify` で現存を確認。

## 主要判断

- **束縛の分岐述語(ADR-3)**: `checkAttestationEnvironment` の `kind === "landed" ? merge : checkout` を削除し、`touchesMergeFacts(body, receipt)`(receipt が mergeCommit/mergedAt を attest、**または** body が `merge commit`/`merged at` を宣言)で分岐。`checkAttestation` / `checkAttestationEnvironment` から `kind` 引数を除去(全 kind 同一規則)。body 側の選択肢を残したのは負例 (i) の担保 — attestation を伴わない手書き merge facts は checkout 束縛へ逃げず `attestation` finding で FAIL する。`checkCheckoutBinding` の「only a landed record attests merge facts」分岐は到達不能となるため削除。センサーは無ネットワークのまま(receipt + audit shard のみ参照)。
- **in-place finalisation の条件(ADR-3 契約1)**: 証拠水準は landed arm と同一。`landedSelfContext` が `verifyMergedEpochAncestry`(無改変)を通過した後にのみ `finaliseMergedInPlace` が発火し、`report.kind` を作らずに既存 payload バイト不変のまま receipt を merge facts 付きで打ち直して canonical audit 行を append。unit ごとに `measuredBy(epoch, receipt.prHead, mergedHead)` を要求(landed arm の member-unit 規律と同型)。同一 merge へ既に束縛済みなら `resumeSelfReport`(冪等)、別 merge へ束縛済みなら拒否。`transitionAllowed` は無改変。
- **override の provenance 形(ADR-4)**: `currentSelfContext` の merged 分岐に `mergedOverrideSelfContext` を追加。live checkout 前提は `verifyLandedPrerequisites` 同等(両 merged arm で `mergedSelfEvidence` に集約)。新 kind なし(既存 `override`)。祖先検査を**実行**し、**成立した場合は拒否**して `report` を案内(機械経路があるものを人間裁定に載せない)。不成立時のみ ruling を発行し、逐語メッセージ(attested/merged 両 SHA を含む)を報告書の `- reason:` と audit decision 行へ転記。presence 不在の拒否メッセージにも同じ実測を載せる(ラバースタンプ化への応答 = 提示面)。`lifecycleAtChangedHead` で ruling 経路にも `transitionAllowed` を課したため `converged -> override` は merged でも拒否。
- **副次的に閉じた穴**: 修正前は converged 報告書でも「head が前進していて祖先が成立する」場合に限り `landed` へ無音で書き換わっていた(Red ログの received body が `- kind: landed`)。in-place 経路が先に捕捉するため、既決ノルム `converged-final-no-landed-rewrite` に整合する形へ収束。
- **複雑度**: `selfReportLifecycle` が CCN 16(gate 閾値 15、baseline 未登録 = NEW_VIOLATION)になったため `lifecycleAtChangedHead` を抽出して 15 以下へ戻した(実測 `python3 -m lizard --csv`、変更後の 15 超関数 0 件)。kind 行の正規表現が 2 箇所へ複製されかけたため `declaredKind` へ集約。

## Red → Green 実測

| 面 | コマンド | 修正前 | 修正後 |
|---|---|---|---|
| クラスA/B 全体 | `bun test tests/integration/t3149-pr-convergence-merged-finalisation.integration.test.ts` | exit 1、**3 pass / 9 fail**(ログ: `scratchpad/b3/red-t3149.log`) | exit 0、**12 pass / 0 fail** |
| 周辺退行(#3113 経路含む 18 ファイル) | 上記 + t447/t448/t449/t450/t482/t533/t534/t541/t2996/t3062/t3110/t446/t481/t532/t534attest/t534allowlist/t535 | — | exit 0、**393 pass / 0 fail**(ログ: `scratchpad/b3/green-suite.log`) |

Red の逐語(代表):
- クラスA(同一 head): `report lifecycle refused: converged -> landed`
- クラスA(head 前進): 報告書が `- kind: landed` へ書き換わる(converged 消失)
- クラスB: `delivery prerequisite failed: checked-out branch main is not the PR head branch bolt/3149`

負例 pin(Step 8): (i) 手書き merge facts → t3110「merge facts written into a record its receipt never attested are refused (#3149)」+ t450「a record stating a merge its receipt never attested is a finding (#3149)」 (ii) presence 不在の override 拒否 → t3149「without human presence the override is refused, and it names what was measured」。

既存2テストは ADR-3 が覆す前提を pin していたため更新した(t3110): 拒否理由の kind 中立化(`a landed record attests…` → `a record bound to a merge attests…`)と、「landed 以外は merge facts を attest できない」→「attest していない merge facts の宣言を拒否する」への差し替え。

## 検証(worktree 内、いずれも exit code 実測)

- `bun run typecheck` → 0
- `bun run lint` → 0(scoped biome は warning のみ。テスト fixture の CCN warning は既存 t3110 と同族、gate は tests/ 対象外)
- `bun tests/complexity-gate.ts --check` → ローカル lizard 実行不能(`Cannot find the lizard_languages module`、環境起因・本変更と無関係)。代替として `python3 -m lizard --csv` で対象2ファイルを実測し CCN>15 が 0 件であることを確認
- `bun run build` → 0、追跡ファイルの drift なし(`git status --porcelain` は本変更分のみ)
- `bun tests/gen-coverage-registry.ts --check` → regen 前後とも 0(新規テストファイルは registry 差分を生まず、同梱すべき変更なし)
- フルスイートは未実施(push-first 方針、リモート CI が正)

## 逸脱

ADR-3 / ADR-4 からの逸脱なし。ADR が明示していない点を実装判断として2件記録する:
1. 束縛述語に body 宣言側の選択肢を含めた(receipt 単独だと landed の body merge facts が無検証になり、既存の担保が退行するため)。
2. merged override で祖先が**成立**する場合は拒否して `report` へ回す(ADR-4 が扱うのは不成立ケースのみ。人間裁定を機械経路の代替にしない fail-closed 側の選択)。
