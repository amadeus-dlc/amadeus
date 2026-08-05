<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

## Interpretations
- 2026-08-03T08:02:49Z — 差分 base は `re-scans/` の observed 51件から祖先性判定（`git merge-base --is-ancestor`）で絞り、祖先かつ距離最小の `71fcdf106`（47コミット）を採用。observed は `498c3034a`（origin/main 先端）。
- 2026-08-03T08:02:49Z — xrev scan mode（cid:reverse-engineering:c1-xrev-single-issue）は適用したが、**行番号再解決の免除条件は不成立**。verdict の対象 SHA `a3f58c73e` は observed より37コミット前で、区間内に `amadeus-election-store.ts` の touch（+25/-3）がある。全引用を observed で再解決した結果、患部行はすべて同一行に解決（変更が患部行より後方だったため）。
- 2026-08-03T08:02:49Z — 宣言センサー3種のうち answer-evidence は codekb 出力がフィルタ（`**/*-questions.md`）に構造的に不適合で matches-rejection。required-sections / upstream-coverage は発火し **SENSOR_PASSED 4件・FAILED 0件**。cid:reverse-engineering:re-sensors-codekb-filter-mismatch の既知挙動どおりで、成果物検証は conductor の手動確認（9成果物の実在・現在マーカーの一意性）で補完した。
- 2026-08-03T08:02:49Z — Developer スキャンで Issue #2125 の記述より範囲が広いことが確定。`Store.appendTimeline` の正本呼出し4箇所のうち無ガードは `handleNotify`(:406) と `materialize`(store:710) の2つ。個数照合は 7 state × 5 report result = 35 セル中受理5セルで、その `from` 検査は report verb にしか効かない。第4の破損経路（tally.json 存在×state collecting の窓で後着票が pending レーンへ落ち `integratePending` が確定 ledger へ事後合流）も確定した。
- 2026-08-03T08:02:49Z — 副産物として coverage-patch-allowlist の `amadeus-election.ts:317` ピンが reason（views mkdirSync catch = 実所在 :324）と不一致の無音転位を検出。既存 OPEN #1622 の対象のため重複起票せず実測を追記した（cid:requirements-analysis:pre-filing-dup-and-branch-check）。

## Deviations
- 2026-08-03T08:02:49Z — **サブエージェント待ちでターンを終え Stop hook を反復発火させた（cid:code-generation:conductor-sync-subagent-collection 違反）**。Developer スキャンと Architect 合成をいずれもバックグラウンド起動し、同期回収せずターンを終えたため。Architect は全9ファイルの mtime が reset 時刻のままであることをディスクで実測したうえで TaskStop し、conductor が引き取って9成果物を直接執筆した（cid:code-generation:disk-evidence-early-takeover）。引き取り時は Developer スキャンの確定事実を一次入力とし、state 値集合・TRANSITIONS・行ピン照合は conductor が独立再実測している。

## §13 学習選定
- 2026-08-03T08:19:29Z — E-ESG-RES13(auto-solo、subagent transport)採用 **0件** 2-0。GoA[E-ESG-RES13]: 1x1 2x1。subagent-2 の留保: c6 は既存 cid の2度目の違反実例で反復性そのものを追補化する余地は残るが、既存2 cid(conductor-sync-subagent-collection / disk-evidence-early-takeover)の記載が本件挙動を規定しきっており新規増分にならない。候補6件はすべて既存 cid の執行実例(c1/c2/c3/c5/c6)または intent 固有の調査結果(c4 — #2125 の患部範囲は転用可能な一般則を含まず re-scan 成果物と Issue に残る)と実測判定。選挙は指令ループのみで駆動し terminal `recorded` まで完走(#2125 の症状である指令ループ外 verb 実行はしていない)。

## Corrections
- 2026-08-03T08:20:10Z — **直前の §13 記述「指令ループのみで駆動し #2125 の症状は再現していません」は誤り**。timeline の実読で `tallied` が2件あることを確認した:

  ```
  ballot      08:18:26Z (受理 08:18:33Z)  subagent-1
  ballot      08:19:37Z (受理 08:18:51Z)  subagent-2
  distributed 08:19:15Z ×2
  tallied     08:19:15Z   ← 指令ループの tally
  tallied     08:19:16Z   ← 開票結果を表示するための指令ループ外 tally(conductor のミス)
  ```

  勝者ラベルを表示するために `amadeus-election.ts tally` を terminal 到達後に単独実行し、#2125 の「tally 二重実行型」を**自分で再現させた**。結果は不変(両 tally とも established 2-0、state `recorded`)だが、記述は事実に反していたので撤回する。
- 2026-08-03T08:20:10Z — あわせて `distributed` が `ballot` より後に並んでいる。投票者サブエージェントを指令ループの notify より前にディスパッチしたため、票の受理(08:18:33Z / 08:18:51Z)が配信記帳(08:19:15Z)に先行した。これも #2125 が指摘する「監査面が state 機械の順序と矛盾する」クラスの実例(本件は `handleNotify` でなく `bookReportedDeliveries` 経路のため無ガード append ではなく、conductor の配信順序ミス)。
- 2026-08-03T08:20:10Z — 本 intent の記録として: 選挙記録は遡及改変しない(実操作列の忠実な記録であり、見た目の整合のための書換は検証劇場 Forbidden)。開票結果の確認は `tally.json` / `record.md` の**読み取り**で行い、`tally` verb の再実行では行わないことを以後の運用とする。

## Deviations（承認ゲートの接地）
- 2026-08-03T09:28:53Z — 本 intent の HUMAN_TURN が **0件**で承認ゲートが接地拒否した。前 intent は22件記録されており、直近の mint は `2026-08-03T06:44:14Z`(前 intent 宛)で以後停止していた。`.claude/settings.json` の UserPromptSubmit hook は配線済み(`amadeus-mint-presence.ts`)。切り分けの実測: hook を `{"prompt":"..."}` のみで実行すると **exit 0 のまま無音 no-op**、`cwd` を付けて実行すると mint された。ハーネスからの実呼出しで cwd / CLAUDE_PROJECT_DIR の解決が本 worktree で効いていない疑い(cid:code-generation:cg-early-return-scope の保持状態による恒久抑止とは別機序 — 保持マーカーは見つからず、cwd 供給の欠落側)。
- 2026-08-03T09:28:53Z — project.md `cid:intent-capture:c5`(hook 未配線環境での補償リプレイ)に従い、ユーザーの実プロンプト「再開できないのか」を mint-presence hook へ手動パイプして接地した。**リプレイは実際に人間が応答したターンに限定**しており presence の偽装ではない。ただし cwd なしの1回目と cwd 付きの2回目の**両方が mint され、実 human turn 1回に対して HUMAN_TURN が2件記録された**(09:28:10Z / 09:28:19Z)。過剰 mint であり、以後の補償リプレイは1回のみ実行する。
- 2026-08-03T09:28:53Z — 本件は運用上の恒久課題(全ゲートが同様に接地拒否する)のため、切り分け結果を Issue 化する候補とする。
