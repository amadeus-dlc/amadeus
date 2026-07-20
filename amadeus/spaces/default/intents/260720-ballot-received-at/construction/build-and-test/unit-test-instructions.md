# Unit Test Instructions — 260720-ballot-received-at

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象と実行方法

- `bun test tests/unit/t234-election-model.test.ts` — 受理軸 classifyLate(早い申告×遅い受理=late / 未来申告×早い受理=通常)
- `bun test tests/unit/t238-election-record.test.ts` — E-BFARA1 verbatim 回帰(申告非単調・受理単調 → verify pass)/移行窓(receivedAt なし=legacy at 軸)/遅延可視化(受理≠申告時のみ併記)

## 合否基準

- 新規4テスト green+既存 timeline-order(tallied-before-ballot 型)green 維持
- 落ちる実証実施済み: record.ts のみ base 切替で E-BFARA1 fixture 赤 → fix SHA 復元で緑(code-summary.md)
