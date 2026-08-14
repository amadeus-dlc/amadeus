# PR Convergence Outcome — 260814-plugins-rename-drift

観測日時: 2026-08-14T15:50:00Z(`gh pr view --json mergedAt,mergeCommit` からの転記)

## 収束・着地の実測

| PR | Bolt / Unit | 状態 | mergedAt | merge commit |
|---|---|---|---|---|
| [#3052](https://github.com/amadeus-dlc/amadeus/pull/3052) | b2-settings / plugin-settings-core | **MERGED**(queue 経由) | 2026-08-14T14:19:00Z | `05da1758c` |
| [#3055](https://github.com/amadeus-dlc/amadeus/pull/3055) | b3-git-drift / git-drift-plugin | **MERGED**(queue 経由) | 2026-08-14T15:00:51Z | `2fbc07406` |
| [#3051](https://github.com/amadeus-dlc/amadeus/pull/3051) | b1-rename / rename-github-pr-convergence | **MERGED**(queue 経由) | 2026-08-14T15:43:48Z | `a4196f191` |

- マージ実行: ユーザー事前承認(2026-08-14「CI green になったら自動マージして OK」— 実 HUMAN_TURN)に基づく auto-merge(merge queue、必須 CI green 到達時)。AI の自発マージではない。
- マージ順の記録: 当初指示は #2996 → #2997 順。#3051 に後着 CI 赤(後述)が続いたため、green 到達順(#3052 → #3055 → #3051)で着地(実装依存なし・ユーザー包括承認下と判断し、逸脱として本記録に明記)。

## 収束ループの経緯(三面)

- base 競合: origin/main の高頻度前進(他 intent 多数着地)により #3051 は 3 回、#3055 は 2 回の base 再解決(merge → 途中からユーザー指示で rebase へ切替)。台帳(intents.json)は毎回 3 ステージ blob からの union 再構成 + parse 検証。
- レビュースレッド: 全 PR で未解決スレッド 0(Check unresolved comments green)。
- 必須 check の赤と是正(全て実測起点): #3052 = Patch Coverage(in-process 配線被覆→timing sink guard→防御分岐 5 行)3 巡 / #3051 = coverage-registry 鮮度(regen 同梱)+ 後着消費者 t2974(#3037 で main に新設された旧パス参照)の追随 / ローカル統合断面 = registry regen。負荷起因 flake(t224/t427 の生 5000ms timeout、size 分類)は非帰属判定(単独 green 実測)。

## 着地面の実測(origin/main 断面)

- `plugins/github-pr-convergence/` + `plugins/git-drift/` 実在、旧 `plugins/pr-convergence/` 不在(`git ls-tree origin/main plugins/`)
- `amadeus/config.json`: activation.names = [coverage-patch-quick, formal-model-check, git-drift, github-pr-convergence]、scope-bindings 外側キー `github-pr-convergence`(内側 slug `pr-convergence` 不変)
- 残存参照(パス軸述語、intents/elections/codekb/project.md 除外): **0 件(exit 1)**
- Issue #2996 / #2997: PR の Closes により CLOSED(着地実測後に in-progress ラベル除去済み)

## kind:landed report について

現行 CLI は self record の code-generation report(attested `kind: created`)への landed 上書きを拒否する契約(`writeSelfReport`: "landed is not convergence evidence")。よって landed 事実は本 outcome が一次記録であり、created report は attest 済みのまま据え置く。
