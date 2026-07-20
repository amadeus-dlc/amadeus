# Reliability Requirements — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要求

| # | 要求 | 導出元 |
| --- | --- | --- |
| R-1 | 受理・保存の原子性: writeStoreFile(tmp+rename)の既存 atomic write 経路を維持 — unknown-ref 照合追加後も append の部分書込を作らない | business-logic-model.md フロー、store 既存様式 |
| R-2 | fail-closed 一貫性: 全エラーは Result 型で伝播し CLI が loud exit 1 — サイレント失敗ゼロ(検証劇場 Forbidden) | business-rules.md BR-1〜BR-3、requirements.md NFR-1 |
| R-3 | 既存 corpus 互換: 実装時点の全選挙 ledger の load/verify を壊さない(両側実証 sweep) | requirements.md FR-2/NFR-3 |
| R-4 | late lane 整合: post-tally amend は fixed set 非影響(BR-4b)— tally 済み選挙の裁定が後着 ballot で変化しない決定性 | business-rules.md BR-4b |

## 検証方法

t234/t235/t236 の閉包・落ちる実証テスト+FR-2 sweep(build-and-test で PASS/N/A/PENDING を判定分離 — deployment-execution:c3 語彙)。
