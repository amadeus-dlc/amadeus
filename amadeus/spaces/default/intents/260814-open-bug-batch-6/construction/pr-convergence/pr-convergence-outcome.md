# PR Convergence — Outcome(5 Bolt すべて MERGED、landed 最終化は構造的不成立を実測)

- 実施: 2026-08-15(resume 断面)/ intent 260814-open-bug-batch-6

## 出荷事実(実測)

| unit | PR | 状態 | merged |
|---|---|---|---|
| audit-sink-investigation | #3080 | MERGED | 2026-08-15(park 前) |
| landed-finalization | #3081 | MERGED | 同上 |
| sensor-declaration | #3086 | MERGED | 同上 |
| worktree-gc-determinism | #3089 | MERGED | 同上 |
| docs-sensors-sync | #3092 | MERGED | 同上 |

5 PR とも merge queue 経由・必須 CI green で着地(一次記録は各 PR と record checkpoint #3100)。着地面は現 main(`b9615ffb8`)に実在(本 record の build-and-test 成果物参照)。

## landed 最終化の試行と構造的不成立(実測)

各 unit の pr-convergence-report は `kind: created` のまま(attested head は PR 途中断面)。landed への最終化を CLI 正規経路で試行した結果:

1. `status` → verdict **landed**(exit 0)— 判定層は landed を返す
2. `report` → **`report attestation is stale`**(PR head が attested sha から前進済み)→ 是正指示は「push して create 再実行」
3. `create` 再実行 → MERGED PR は reuse されず**新規 PR を誤作成**(#3109 — 即クローズ済み)
4. `override` → 契約上「valid な created attestation」を要求するため stale では不成立、かつ「merged PR は ruling 不要 — report が landed を記録する」と自己言及

→ 「**stale created epoch × merged PR**」の組合せに正規の最終化経路が存在しない(#3042 の摩擦クラスの新実例 — **#3110 として起票済み**)。pool 捏造・attestation 偽装は行わない(P2)。本ステージは #3110 の修正着地まで park する(#3099 と同じ回復パターン)。

## verdict の書き分け

- 検証済み: 5 Bolt の配送(MERGED・CI green・着地面 grep)— 本ステージの実体条件
- 未検証(構造的不成立・申し送り): report ファイルの landed 最終化。record 上は created(stale attestation)のまま残り、本文書がその帰属と経緯の一次記録
