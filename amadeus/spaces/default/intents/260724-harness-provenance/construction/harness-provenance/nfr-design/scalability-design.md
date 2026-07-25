# Scalability Design — harness-provenance

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## 設計

scalability-requirements.mdの定数容量をbusiness-logic-model.mdのprocess-local同期処理で実現する。performance-requirements.mdの固定上限、security-requirements.mdの正規化、reliability-requirements.mdのunknown fallback、tech-stack-decisions.mdの既存Bun stackを維持する。

## Capacity model

- birth件数Nに対し処理回数O(N)、1 birthあたりO(1)
- process cacheはresolution 1件でO(1) memory
- state増分はintentごと1行
- mapping 5件、CWD probe 5件、出力union 7件の固定集合
- 全6配布形態は同じcore sourceを投影しlogicを複製しない

load balancer、sharding、queue、horizontal/vertical auto-scaling、distributed cacheは非該当である。

## Extension path

新ハーネス追加時はmapping・union・docs・testsを同時変更する。未知script-pathは`unknown`となるため、未対応数が増えてもmemoryや処理時間は増えない。
