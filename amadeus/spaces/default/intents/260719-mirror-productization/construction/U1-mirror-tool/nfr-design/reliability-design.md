# Reliability Design — U1-mirror-tool

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## RD-U1-1: 失敗分類の設計(RL-U1-1/RL-U1-2)

- gh 不在/未認証/record 不在 → precondition(exit 2、理由 stderr)
- gh view の対象 Issue 取得不能 → **本設計は business-logic-model.md の readMirrorIssue 分岐を次のとおり精密化する(申告 — citation-semantics-check)**: Issue 不在が gh の exit/stderr 実文で確定できる場合のみ mirror-missing finding(diverged 側)。ネットワーク一時失敗等で不在と確定できない場合は precondition(exit 2)へ倒す — 「取得不能=未作成」と断定して誤った create 案内へ誘導しない(fail-safe)。FD 側フロー図にも同精密化を反映済み(双方向一致)。「乖離なし」への丸め込み経路はいずれにもなし
- 期待本文レンダラの再利用(オラクル非分離 — business-logic-model)で比較系の実装差バグを構造回避

## RD-U1-2: テストでの失敗注入(RL-U1-3)

GhRunner fake で (a) auth 失敗 (b) view 失敗(Issue 不在確定/不定の両様)(c) 本文不一致 に加え、(d) **ローカル read のプラットフォーム差**(RL-U1-4 — buildSnapshot の readFileSync に対する ENOENT/dangling symlink のポータブル注入、bun-readfilesync-dir-platform-divergence 準拠)の4系を注入し、exit 0/1/2 の全経路を lcov DA で実測(error-path-reach-lcov — 偽経路 green の防止)。
