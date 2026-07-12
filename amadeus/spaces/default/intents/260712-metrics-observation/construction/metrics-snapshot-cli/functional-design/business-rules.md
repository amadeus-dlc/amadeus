# Business Rules — U2

1. snapshot の全値は実計測出力から導出(S2 — 定数・推定の混入禁止。閾値等は complexity-gate の named export を参照し再定義しない)
2. 部分 snapshot・既存ファイル上書きの禁止(temp→rename、ファイル名は captured_at 由来で一意)
3. 失敗 collector 名の明示(FAILED [COLLECTOR: x])と exit 1
4. collector 追加は配列への1要素追加で完結(既存 collector・スキーマ他部に diff なし — FR-5 AC)
5. tool_version の自己記録(lizard はバージョン出力、runner 系は repo rev)
6. 引数なし・未知フラグ = usage+exit 1(mutating 既定禁止)
