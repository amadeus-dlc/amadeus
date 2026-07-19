# Frontend Components — election-store(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## N/A 宣言(反証可能根拠付き)

U2 は I/O 層で UI・CLI 面なし(CLI 配線は U5)。elections/ 配下のファイルが人間可読の正本(services.md の記録参照面)であり、表示整形は U3 render の責務。

## 出力契約

| 消費側 | U2 が返すもの |
|---|---|
| U5 CLI | Result<*, StoreError>+ElectionStatus |
| U3 render | ledger/timeline の読取値(型は U1/U3 共有) |
| 人間(直接閲覧) | elections/<ID>/ の JSON 群(git 管理 — ADR-2) |
