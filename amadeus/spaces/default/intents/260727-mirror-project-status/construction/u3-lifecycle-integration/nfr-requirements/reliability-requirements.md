# Reliability Requirements — u3-lifecycle-integration

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

信頼性は U3 の中核 — completion の安全性(未同期のまま閉じない)と、close 保留が恒久停止にならないこと(収束の委譲)の両立。requirements FR-4/FR-8 と business-logic-model の completion ゲート層分離が規定の中心。

## completion ゲートの安全性(requirements FR-8)

- final sync → `completionProjectGate` 評価 → ready の場合のみ close の順序を維持(business-rules BR-U3-4、requirements FR-8a — 受入条件7)。pending / safety-blocked / Done 未適用が残る間は close しない(requirements FR-8b — 受入条件10 後段)。
- 検証: Done 未達 Project を1件残した completion で close mutation 0 回の negative assert+全 Done 後の close 実行の対照ペア(business-logic-model 検証面)。

## 恒久停止の構造回避(business-rules BR-U3-9 — 層分離)

- `safety-blocked` は Project 台帳にのみ書き、sync の operation receipt には書かない — operation receipt は Project 同期未完の間 `pending`(IN_PROGRESS 分類)に留める。既存 policy の terminal-block 分類(実装直読: amadeus-mirror-policy.ts:61-65 `TERMINAL_BLOCK_STATUSES`、:219 `if (sync === "terminal-block") return null`)による completion 恒久停止を構造回避し、次の boundary で再試行される(:218 `if (sync === "in-progress") return "sync"`)。
- close 保留は失敗ではない(business-rules BR-U3-5): 台帳と警告に状態を残し、次の boundary / manual sync の reconcile(U2)へ委ねる。workflow 自体は停止しない(requirements FR-7e の既存 Mandated を継承)。

## parked の不変性(requirements FR-4)

- parked boundary または registryStatus=parked の間、Project Status mutation を発行しない(business-rules BR-U3-3 の二重判定 — boundary 経路と manual 経路の両方)。検証: 両経路で mutation 0 回を assert(FR-4 受入基準)。
- `Done` への遷移は Intent 完了の final sync のみ(business-rules BR-U3-2)— フェーズ同期で誤って Done を書く経路を作らない。

## 非目標

- SLA/SLO・バックアップ目標: N/A(根拠: requirements FR-1b — daemon・polling・GitHub Actions を導入しないチェーン内実行のみ。永続状態は git 管理の record/state — technology-stack 断面: 独自データストアなし。cid:observability-setup:c3 の N/A 規律)。
