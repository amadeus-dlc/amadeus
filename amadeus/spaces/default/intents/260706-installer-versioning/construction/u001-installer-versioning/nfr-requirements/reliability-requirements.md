# Reliability Requirements — u001-installer-versioning（260706-installer-versioning）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

## 要求

| ID | 要求 | 根拠 |
|---|---|---|
| REL-1 | 途中失敗（runStep / smoke）で manifest を書かず、再実行が 3-way の (d) 象限で自然回復する（二重退避なし） | FR-1.3、interaction-spec、C-2 |
| REL-2 | 退避は上書きの前に完了していること（退避失敗時は上書きせず InstallError で停止 = 利用者の変更を失わない） | 無言喪失の防止（Intent 目的） |
| REL-3 | spawnSync の throw（コマンド不在）と非 0 exit を区別せず "unknown" へフォールバックする | smoke() の既存教訓（REL-3 コメント） |
| REL-4 | 検証結果（eval・test:all）を build-and-test で記録する | FR-4 系、NFR 検証の記録 |

## 検証（担保元を正直に書き分ける）

- REL-1 = eval (d)（同一配布物の再実行）に加え、「途中失敗 → 再実行で退避 0 件」の検査（FR-5.1 追補 (i)。functional-design のグローバル優先規則 = current = newHash → skipped が前提。§12a 指摘 3 で判定表の欠落を補正済み）。
- REL-2 = (i) 順序（backup → write）は eval (b) の退避内容一致で観測。(ii) 退避失敗時の停止は実装レビューで担保し、eval には含めない（read-only 模擬は CI 環境依存が強い。過大主張を避けるため書き分ける）。
- REL-3 = 実装レビュー。
- REL-4 = build-and-test の記録。

## 対象外の明示

- 同一 target への並行起動は想定外とする（単一利用者のローカル CLI。排他制御・lock は作らない。manifest の read-modify-write 競合と退避 dir 競合は運用上起きない前提を明示的に記録する）。

## ID 名前空間の注記

- 実コードへ新規に打つ NFR 系コメント（REL / SEC / PERF）も BR-10 と同じ `REL(#543)-n` 形式で Intent を併記する。既存の REL-3 / REL-4 コメント（260705 由来、533・441 行）は書き換えない。
