# Evidence — metrics-timeseries-report(practices-discovery)

上流入力(consumes 全数): codekb `code-structure.md`・`technology-stack.md`・`dependencies.md`・`code-quality-assessment.md`・`architecture.md`・`business-overview.md`(同日 RE 更新、c1 代用)+ affirm 済み `team.md`・`project.md`

## 証跡一覧(RE codekb 代用、c1)

| 面 | 証跡 | 出典 |
|---|---|---|
| CI 構成 | metrics-snapshot job(ci.yml:250-333)区間無変更、coverage 自己ゲート配線済み | scan-notes(observed d4feb5e3d) |
| テスト様式 | 兄弟 gate CLI の exported 純関数+in-process 駆動、tests 4層ランナー | scan-notes フォーカス4 |
| コードスタイル | main(argv):number+import.meta.main 1行ガード、判別ユニオン Result、AMADEUS_* env seam | scan-notes フォーカス4(file:line 付き) |
| 消費データ | schema v1・collectors 6種・test_pyramid 動的キー | scan-notes フォーカス2 |

## 差分ギャップ

affirm 済み team.md / project.md との矛盾・欠落なし(質問 0 件)。
