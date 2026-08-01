# Reliability Design — u1-runner-relocation

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

## 回復性

- 移設は1 PR 単位で revert 可能(domain-entities.md E4 — フォールバック・シムなしの1方向設計。失敗時は PR revert が唯一の回復経路で、中間状態を残さない)。
- 複製の信頼性は drift 検査(business-logic-model.md T3)が担う — Git 管理資産の二重保持は drift 検出付きでのみ許す(nfr-design:c3 の適用: 単一ソース+機械検出)。

## fail-closed

- 台帳 remap(T7)の stale は coverage-patch gate が fail-closed で検出(requirements NFR-4)。純移設の代替検証(前後 green+drift — **NFR-2** の適用外条項)はこの fail-closed 群が担う。
- CI パス付け替え(T4)の失敗は formal-model-check ジョブの exit 分岐(ci.yml :629/:631)が loud に検出。
