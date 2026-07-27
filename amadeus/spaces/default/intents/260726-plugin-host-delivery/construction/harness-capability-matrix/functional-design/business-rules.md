# Business Rules — U1 harness-capability-matrix

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## BR 一覧

- **BR-U1-1(全数性)**: マトリクスは 7 ハーネス全行 × 6 面全列を持つ(requirements FR-1 合否)。欠落セルは成果物不成立
- **BR-U1-2(実測性)**: 各セルは (a) 実測(コマンド出力 or file:line 引用+ProbeRecord 参照)か (b) `⚠ deferred(実装時実測)` +確定条件 1 行、のどちらか。裸の断定は禁止(unit-of-work.md U1 の「実測で確定した文書」契約)
- **BR-U1-3(silent skip 禁止)**: 非対応・不能の面は必ず degrade 契約(利用者の手動床 1 コマンド — component-methods.md C1 — と doctor 表示)へ落とす。行の省略・空欄での回避は不合格
- **BR-U1-4(語彙と存在の分離)**: composeTrigger は「フック機構の存在」と「イベント語彙・起動保証の実測」を別セルで記録(external-seam-vocab-measurement)。書き手の起動条件(どのモード・設定で発火するか)まで確認して measured とする(seam-writer-mode-precondition)
- **BR-U1-5(前処理等価)**: ライブプローブは本番経路が行う前処理を全数再現してから陰性判定する(probe-preprocessing-parity)。前処理を欠くプローブの陰性は「手順漏れ」として ProbeRecord に残し、判定根拠にしない
- **BR-U1-6(fail-closed 割当)**: クラス判定不能は manual-only へ倒す(business-logic-model の判定ロジック)。上流に前例のない 3 面(cursor / opencode / kimi — components.md C9)も同規則で扱い、特例を作らない
- **BR-U1-7(下流確定条件の明示)**: マトリクスの結論部に「Bolt 3(投影対象面)/ Bolt 6(フック配線面)の確定集合」を機械可読の列挙(services.md の常駐なし前提での面リスト)として置く — 下流 Unit が推論でなく参照で消費できる形(unit-of-work-story-map リリース順 1 の出口条件)

## 検証(本 Unit はコード非搬送 — 検証は文書規則)

- BR-U1-1/2 は成果物レビュー(§12a)で機械照合(行数・列数・セル種別の count)
- BR-U1-4/5 は ProbeRecord の command verbatim の有無で検査
- 数値・件数はコマンド出力からの転記のみ(numbers-from-command-output-only)、測定 ref(HEAD SHA)を成果物へ明記(measurement-ref-in-artifacts)
