# Election Record — E-STG-S13C

- question: intent 260805-subagent-type-guard / ステージ reverse-engineering の §13 学習選定。diary から surface された候補は7件。採用集合を選べ。判断基準: (i) 一般化可能か (ii) 既存 cid との重複 (iii) 実測接地。候補要旨: c1=差分 base の距離最小選定(既存 cid rescan-base-ancestry の適用実例) / c2=xrev scan mode 併用と免除条件(既存 cid c1-xrev-single-issue の適用実例。ただし Architect が免除根拠の誤読を訂正した) / c3=live probe の隔離設計(CXR-33 準拠のキー限定 dump) / c4=scan 中の新規欠陥は即起票(既存 issue-first-capture の適用実例) / c5=RE センサー不適合の手動代替(既存 cid re-sensors-codekb-filter-mismatch の適用実例) / c6=既定モデルのレート上限で --model 明示が必要だった手法知見(scan ノート手法メモに保存済み) / c7=2段直列の独立再実測が座標4件+判定3件を訂正した実効(既存 cid re:c3 の設計どおり)。

裁定: c3 のみ採用(live probe 手法)(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): c3 は独立した新規 cid ではなく外部 seam 実測ファミリへの追補として persist し(第一候補は cid:reverse-engineering:saas-undocumented-source-read の姉妹面、あるいは cid:application-design:external-seam-vocab-measurement への追補)、未被覆面 —『ソース直読が不能な閉ソースハーネスの payload 語彙は、repo の settings を触らない隔離 scratch プロジェクト + headless 実行 + 秘匿制約準拠のキー限定 dump で live 実測する』— に絞ること。jq 式・CLI バージョン・フラグ名・intent 固有の観測値(model パスの有無等)は落とした一般形で書き、再現手順の逐語は re-scans/260805-subagent-type-guard.md:291-300 の参照で足す。c6(既定モデルのレート上限で --model 明示が要る)は §10 item 3 の同一メモ内にある同手法の細目であり、c3 の追補文中に1句として吸収して独立 cid にしない。適用範囲は『閉ソース外部ハーネスの hook payload 実測』に限定し、あらゆる seam への live probe 一律義務化へ拡張しない。
- 留保(subagent-1, GoA2): 採用に賛成だが、persist 文には live 実測の対象ハーネスとバージョン(Claude Code 2.1.222、実測日 2026-08-05)を焼き込み、次回の週次蒸留ラウンドで現存を再判定する条件を明記すること — ハーネス挙動は世代交代しうる。先例として cid:requirements-analysis:c4-agent-async-despite-sync-flag が同じ形でバージョンと実測日を焼き込み、逐語『ハーネス挙動は世代交代しうるため、次回以降の週次蒸留で本追補の現存を再判定する』と再判定を予約している。あわせて intent 固有の Issue 番号・患部ファイル列を持ち込まず、手順の一般形(隔離 scratch プロジェクト + headless 実行 + キー限定 dump)に絞ること。
票タイムライン: 配信 2026-08-05T15:54:47Z → 配信 2026-08-05T15:54:47Z → subagent-2 2026-08-06T00:00:00Z(受理 2026-08-05T15:57:10Z) → subagent-1 2026-08-06T00:00:00Z(受理 2026-08-05T15:57:53Z) → 開票 2026-08-05T15:58:08Z
GoA[E-STG-S13C]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
