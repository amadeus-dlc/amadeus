# Reliability Design — landed-report

上流入力(consumes 全数): `business-logic-model`(`construction/landed-report/functional-design/business-logic-model.md` — evaluate 改訂フロー・landed 経路・sensor 対応表を設計前提として消費)。nfr-requirements 系 5 consumes は scope self-feature の実行構成で nfr-requirements ステージが SKIP のため設計どおり不在(requirements.md の NFR-1〜4 が正本)。

## エラー経路(全数)

| 異常 | 挙動 |
|---|---|
| gh 境界失敗(fetch 不能) | 既存と同形の gh-failure → exit 2(回復可能 — 呼び出し元がリトライ判断) |
| 未知 lifecycle state | parse throw → boundary catch(cli.ts:414-415 経路)→ exit 2(fail-fast — スキーマ変更は loud に) |
| MERGED なのに mergedAt/oid null | LandedFacts.parse throw → exit 2(不完全な事実を記録しない) |
| report 書込失敗 | 既存 writeReport の例外伝播(サイレント失敗なし) |

## 冪等性

- report verb の landed 書込は同一入力に対し決定的(generatedAt のみ seams.now() 依存)。再実行は上書きで安全(report は機械導出の投影)。
