# Election Record — E-STG-S13F

- question: intent 260805-subagent-type-guard / ステージ units-generation の §13 学習選定。diary 候補4件。採用集合を選べ。候補要旨: c1=Unit 分割の判断(intent 固有) / c2=edge block の正書式は入れ子形(- name / kind / depends_on)で、kind は UNIT_KINDS 閉語彙(service|spec|ui|packaging|library)の必須フィールド — フラット形は malformed、kind 欠落は missing_unit_kinds で required-sections センサーが FAILED になる(2段の是正を実測) / c3=reviewer stall の真因はセッションレート上限で、リセット後は同一タスクが2分で完走(idleReason: failed の failureReason にリセット時刻が載る) / c4=FOLLOW-UP の conductor 軽微是正(iteration 非消費)。

裁定: c2 + c3 採用(choice 2 — tie 裁定)
- 留保(subagent-1, GoA2): c3 は独立 cid でなく既存のサブエージェント・ライフサイクル系 cid(cid:requirements-analysis:c4-agent-async-despite-sync-flag)への追補として persist し、ハーネス名(Claude Code)と実測日を本文へ焼き込んで次回週次蒸留で退役判定できる形にする。あわせて failureReason にリセット時刻が載るというフィールド内容は本投票者が独立実測できず(現時点で failed 状態の subagent が手元に無い)、根拠は intent record の diary 記載に限られる点を persist 文へ明記する。
- 留保(subagent-2, GoA2): c3 は独立実測できなかった(stall の真因はハーネス内部の failureReason 自己報告 1 件のみで、投票者側から一次確認する手段がない)。同型の誤診(レート上限 stall を hang と誤認して TaskStop/再ディスパッチ)が再発した時点で、新規 cid ではなく cid:requirements-analysis:c4-agent-async-despite-sync-flag への追補として昇格させる条件付き不採用とする。c2+c3 が採られた場合も受容する(c3 はハーネス世代依存の知識クラスとして日付を明記し週次蒸留で退役判定できる形なら無害)。
票タイムライン: 配信 2026-08-05T21:40:19Z → 配信 2026-08-05T21:40:19Z → subagent-1 2026-08-05T21:42:00Z(受理 2026-08-05T21:42:28Z) → subagent-2 2026-08-05T21:42:30Z(受理 2026-08-05T21:42:58Z) → 開票 2026-08-05T21:43:15Z
GoA[E-STG-S13F]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0

- hold 裁定履歴: tie → choice:2(2026-08-05T21:44:10Z、復帰先 tallied)
