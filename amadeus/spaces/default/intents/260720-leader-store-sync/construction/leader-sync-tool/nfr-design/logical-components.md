# Logical Components — leader-sync-tool(U1)

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model — AD C1〜C6 を NFR 観点で層別した論理ビュー(層別保証はモジュール別 — nfr-design:c4)。

## 層別保証(モジュール別)

| 層 | モジュール | 保証機構 |
| --- | --- | --- |
| 判定純関数層 | M1 列挙規則 / M2 / M3 判定 / M5 述語 / M7 閾値判定 | port 非保持(型シグネチャに runner 引数なし)— コンパイル時保証 |
| port 消費層 | C2(GIT)・C4(GIT+GH)・C5(GIT) | runner は default param 注入のみ(呼び出し順序契約 = business-logic-model.md の create 順序) |
| 組立層 | C6 dispatch / M8 main | port 非保持・コンポーネント呼び出しのみ。argv 化 export(in-process 駆動面) |

## 断定の回避

一枚岩の「全モジュール構造保証」は主張しない — 各層の保証は上表の機構別(nfr-design:c4)。port 消費層の順序違反は integration テストの fake runner 呼び出し記録 assert で検出する。
