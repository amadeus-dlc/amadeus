# Business Rules — u3-lifecycle-integration

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

BR は requirements の U3 担当 FR(unit-of-work の割付: FR-3c/3d, FR-4, FR-8, FR-10a — 受入条件 3,4,5,7,8,10 close 阻止面)から導出。実装面は components の lifecycle/executor 割付と component-methods の completionProjectGate。boundary 語彙は既存5種(services のプロセス境界 — 新設なし)。story-map ジャーニー3の成立条件。

## ルール一覧

| ID | ルール | 導出元 |
|----|--------|--------|
| BR-U3-1 | phase boundary の同期は state file の `Lifecycle Phase`(遷移後の現在フェーズ)から期待 Status を導出する。boundary の `phase` 引数(前フェーズ)を使わない | FR-3b/3d |
| BR-U3-2 | `Done` への遷移は Intent 完了(registryStatus=complete かつ Status=Completed)の final sync のみ。フェーズ同期で `Done` を書く経路を作らない | FR-3c |
| BR-U3-3 | parked boundary または registryStatus=parked の間、Project Status mutation を発行しない(Issue 本文同期は従来どおり) | FR-4a/4b(Q4 裁定) |
| BR-U3-4 | completion では final sync → completionProjectGate 評価 → ready の場合のみ close。pending / safety-blocked / Done 未適用が残る間は close しない | FR-8a/8b(受入条件 7, 10) |
| BR-U3-5 | close 保留は失敗ではない: 台帳と警告に状態を残し、次の boundary / manual sync の reconcile(U2)へ委ねる。workflow 自体は停止しない | FR-7e/FR-8b |
| BR-U3-9 | **層分離**: `safety-blocked` は Project 台帳(projectSync)にのみ書き、sync の operation receipt には書かない — operation receipt は Project 同期未完の間 `pending`(IN_PROGRESS 分類)に留める。既存 policy の terminal-block 分類(実装直読: amadeus-mirror-policy.ts:61-65, :218-219)による completion 恒久停止を構造回避し、BR-U3-5 の reconcile 委譲を成立させる | FR-6b(per-Project 面)+FR-7b(reconcile)+実装直読 |
| BR-U3-6 | prompt モードの ask は既存の操作単位 binding に Project 面要約を内包する。新しい ask 種別・同意種別を作らない | FR-10a(Q1 裁定) |
| BR-U3-7 | boundary 種別を新設しない。既存 eligible boundary / manual invocation のチェーンのみに配線する | 受入条件14(daemon/polling/Actions 不要 — 新トリガー機構の禁止)+ADR-1(operation/boundary union 不変の設計裁定) |
| BR-U3-8 | completionProjectGate は台帳(U2 の canonical 読取経路)のみを入力とし、Project API を直接照会しない(gate 評価は決定的・オフライン) | component-methods の completionProjectGate、FR-9c と同じ canonical 共有原則 |

## テスト規約(U3 分)

- boundary 表の全行(5種×挙動)を lifecycle runtime 注入の integration テストで固定(実 FS は integration 層 — fs-tests-integration-first)。
- close 阻止の negative assert(Done 未達1件 → close mutation 0 回)と、全 Done 後の close 実行の対照ペア。
- parked 2経路(boundary / manual)の mutation 0 回。
- ask 文言の golden(Project 面要約の有無で対照)。
