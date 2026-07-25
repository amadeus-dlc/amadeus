# Scalability Requirements — harness-provenance

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## スケール特性

business-logic-model.mdとbusiness-rules.mdの処理はintent birthごとの固定回数処理である。requirements.mdは単一Harness値の記録だけを求め、technology-stack.mdのローカルBun process内で完結する。水平scale、分散coordination、database capacityは非該当である。

## 容量上限

| ID | 要件 |
|---|---|
| SCALE-1 | intent数が増えても1 birthあたりの判定回数は1、state追加量は1行 |
| SCALE-2 | process内cacheはresolution 1件で、intent数・stage数に比例して増えない |
| SCALE-3 | CWD probe候補数は既存5件の固定上限 |
| SCALE-4 | canonical type mappingはIssue #1452対象5件。未知ハーネスは無制限に保持せず`unknown`へ畳む |
| SCALE-5 | 全6配布形態で同一core実装を使い、ハーネス別の重複logicを増やさない |

## Growth strategy

新しいハーネス種別を正式対応するときは、canonical mapping、`HarnessType`、docs、全配布testを同一変更で追加する。`KNOWN_HARNESS_DIRS`追加だけで自動的に既知typeへ昇格させない。open-set script-pathは未知dirを受けても`unknown`へ安全に縮退する。

## Concurrency

resolution cacheはprocess-localで、非同期mutationを持たない。現在の同期Bun CLIでは同一module instanceの初期化競合はない。worker/process間共有やlockは不要であり、導入しない。

## 検証

複数回の連続birth/callでもcache件数と結果が安定するtestを置く。多数intentのload testは固定処理の性質に追加価値がないため必須としない。
