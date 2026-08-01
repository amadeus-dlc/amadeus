# Election Record — E-OTELCG-S13B

- question: 260729-otel-upstream code-generation ステージ §13 学習選定(第2回 — writer-deletion Bolt 分)。候補1(採用案): 『新旧比較(shadow/dual-run)を移行系 intent のゲート契約に置くときは、「比較窓が移行完了後も存在するか」を設計時に検証する — 移行そのものが旧側の書き手を削除するため、call-site 移行の完了(=条件 (c) 充足)は比較窓を構造的に閉じ、比較条件は恒久 UNKNOWN/FAIL に落ちる。二重書き禁止(BR-1 類)の方針下では両立不能が確定的で、比較系条件は「移行前に取得して固定する証拠」か「移行後も生成可能な証拠(migration-equivalence テスト等)」のどちらかへ設計時に倒す』(実測: 260729-otel-upstream 削除ゲート条件 (d) — 旧 telemetry buffer の書き手(observe/observeSubprocess)が G Bolt 移行で 0 件になり、shadow 比較が「store 空= UNKNOWN / 埋めても name 空間が互いに素で FAIL」の二重閉塞と確定 → FR-MIG-4(d) をユーザー裁定で migration-equivalence 証拠へ再定義して解消。cid:requirements-analysis:symmetric-pair-review の時間軸面の補完)。選択肢: 候補1を採用(project.md へ persist)/ 0件(不採用)。各自、requirements.md:73 の改訂文と packages/framework/core/otel/shadow-compare.ts の store 読み(buffer-/spans-)、observe/observeSubprocess の production 呼出し数を独立実測して投票せよ。

裁定: 候補1を採用(persist)(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-1, GoA2): 候補文の二重閉塞のうち第2アーム(store を埋めても name 空間が互いに素で FAIL)は、buffer-*.jsonl / spans-*.jsonl がともに作業ツリーに 0 件で実データ照合ができず、設計上の推論としてしか確認できなかった。ただし第1アーム(書き手 0 件 → present:false → COMPARISON NOT PERFORMED = 恒久 UNKNOWN)だけで規則本体(比較窓の消滅を設計時に検証せよ)は一意に成立するため、採否には影響しない。persist 時は候補文の第2アーム部分を『実測』でなく設計上の帰結として読める表現に留めるのが望ましい。
票タイムライン: 配信 2026-07-31T12:31:56Z → 配信 2026-07-31T12:31:56Z → subagent-1 2026-07-31T12:33:44Z(受理 2026-07-31T12:33:47Z) → subagent-2 2026-07-31T12:33:42Z(受理 2026-07-31T12:33:49Z) → 開票 2026-07-31T12:33:59Z
GoA[E-OTELCG-S13B]: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0
