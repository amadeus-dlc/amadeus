# Election Record — E-STG-S13H

- question: intent 260805-subagent-type-guard / ステージ functional-design の §13 学習選定。候補7件。採用集合を選べ。判断基準: (i) 一般化可能か (ii) 既存 cid との重複 (iii) 実測接地。候補要旨: c1=U1 §12a i1 BLOCKER(AD 正本に無い personaNames の無申告追加)を canonical シグネチャ保存の代替設計(builtin 先勝ち判定順)で是正 — 承認済み設計への回復であり逸脱裁定不要(P3 の回復側)/ c2=resolvePersonaPin の引き当て規則を FR-1a と同一原理(frontmatter name: 完全一致、basename 決め打ち禁止)で固定 / c3=walking-skeleton × full grant のユーザー裁定(Bolt 1 は実人間承認で運用 — canonical #2067+#2253 は full の自動承認を許すが intent 固有の運用選択。bolt-plan の事実誤認を訂正、Issue 起票は #2253 既決のため見送り)/ c4=reviewer 予算2回消費後の是正起因新 BLOCKER に E-LSSADS13 の閉包確認限定イテレーション(i2b)を適用 / c5=per-unit ステージで全 unit の成果物を先行作成すると engine は後続 unit の directive を re-emit しないため、捕捉済み directive からの機械的テンプレート置換(unit 名+produces)で後続 unit の directive を構成し reviewer-runtime scope へ投入した(c1-degrade-batch-directive-capture の非 degrade・per-unit 面への拡張)/ c6=pin 読取は C-1 拡張でなく独立ヘルパ(変更理由の分離を読取回数より優先)/ c7=対欠落は導出値+注記行で処理(型の肥大回避)。

裁定: c5 のみ採用(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-1, GoA2): c4 は E-LSSADS13 の自然な適用と判断して不採用としたが、「是正が新 BLOCKER を生む」型が同則の『残余是正』に含まれることは明文でないため、同型が再発した場合は delegated-review-analysis-with-owned-verdict への1行追補として再提案する余地を残す。
- 留保(subagent-2, GoA2): persist は独立 cid でなく cid:code-generation:c1-degrade-batch-directive-capture への追補として書き、機械的テンプレート置換は既定経路ではなく「成果物を先行作成してしまった後の回収経路」と位置づけること — 同 cid は「全 unit covered 後の engine emit は fail-closed のため build 時捕捉が唯一の in-band 経路」と明記しており、置換は out-of-band の回収であって (a) unit ごとの逐次捕捉が既定である旨を落とすと規範が逆転する。
票タイムライン: 配信 2026-08-05T22:28:48Z → 配信 2026-08-05T22:28:48Z → subagent-1 2026-08-05T22:30:46Z(受理 2026-08-05T22:30:56Z) → subagent-2 2026-08-05T22:31:30Z(受理 2026-08-05T22:31:28Z) → 開票 2026-08-05T22:31:41Z
GoA[E-STG-S13H]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
