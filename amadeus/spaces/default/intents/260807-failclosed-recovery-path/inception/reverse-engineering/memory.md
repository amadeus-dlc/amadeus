<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations

- 2026-08-07T04:05:00Z — scan mode は **xrev ではない**(`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue` の前提「起票者以外2名の独立エビデンス付き verdict」は #2313/#2330/#2358 の GitHub コメント上で成立していない — コメント著者は起票者本人のみ)。代替として (a) Issue #2385(3件の一次調査の正本、別ハーネス Kimi Code の独立再調査で突合検証済みと本文が記載) を Developer scan の一次入力とし、(b) conductor が患部3面すべてを observed 断面で verbatim 実読して二重化、(c) 失敗中の実 CI run ログを一次証拠として取得、の3点で接地した。#2385 の測定 ref `b8e3e664f` は本 intent の observed HEAD と**完全一致**するため行番号の再解決は不要(区間実測による currency 確定であり、免除の主張ではない)。
- 2026-08-07T04:05:00Z — 差分リフレッシュの base に `7060956c5`(距離76)を採用; `re-scans/*.md` の全 observed 候補109件を機械抽出し `git merge-base --is-ancestor` で祖先性を判定、距離最小を選定(`cid:reverse-engineering:rescan-base-ancestry`)。
- 2026-08-07T04:05:00Z — Developer Code Scan を `Explore` 型(書込不可)サブエージェントで dispatch した; `cid:reverse-engineering:c4` / `cid:functional-design:c4-subagent-structural-guard` により read-only の調査は explore に限定する。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

- 2026-08-07T04:05:00Z — ステージ本文 Step 2 は `amadeus-developer-agent` を指定するが、project.md `cid:reverse-engineering:c4` の「read-only 作業は explore 型」規則を優先して `Explore` を使った; 成果物への書込は conductor と architect のみが行う。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

- 2026-08-07T04:00:00Z — §13 学習選定はソロ選挙 E-FCR-RES13(`solo-election.trigger.mode` = auto により自動発動、`--trigger auto`)にかけ、1-1 の tie(subagent-1 = choice 2 / GoA 2、subagent-2 = choice 1 / GoA 2)。エスカレーション正準リスト(1)によりユーザー裁定へ回し、**0件(学習なし)** で確定。争点は候補 C1 の追補先 cid のみで、C2/C3 の採用・C4 の不採用は両票一致していた。実測自体は `re-scans/260807-failclosed-recovery-path.md` に全数保存されているため失われない。選挙記録は `amadeus/spaces/default/elections/260807-e-fcr-res13/record.md`(state = recorded)。
- 2026-08-07T04:00:00Z — codekb 9成果物の執筆は `amadeus-architect-agent` へ委譲し、書込先を10パスへ限定・engine/state ツールの実行を禁止する制約付きでディスパッチした(`cid:functional-design:c4-subagent-structural-guard`)。conductor 側で `git status` により**書込が10パス以外へ及んでいないこと**、削除27行が全件「現在」見出しの履歴降格のみで本文削除ゼロであることを実測検証した。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

- 2026-08-07T04:05:00Z — requirements-analysis 入口の formal-model-check advisory(instance `c2bb287f-b6a2-4c45-acd6-50ec74a54f54`)でユーザーが「今すぐ実行する」を選択(`record --choice run-now` 受理済み、human_turn 2026-08-07T03:59:37Z)。しかし `run_required: true` の verbatim コマンドは `HARNESS_ERROR / ENVIRONMENT_UNAVAILABLE` / exit 2。`--provider docker` を付した再実行(`cid:build-and-test:c1-advisory-correlated-run-required` が許容する逸脱)も同じ exit 2。実測した機序は2面の pin 不一致: (a) Darwin 経路は `plugins/formal-model-check/tools/tlc-spawn-planner.ts:150` が `/^openjdk version "26\.0\.1(?:"|\+)/m` で **JDK 26.0.1 を pin** するが、本機は Temurin **26.0.2**(`java -version` 実測) (b) Docker 経路は `:30-31` の digest 固定イメージ `eclipse-temurin:26-jdk@sha256:939e3577…` を要求するが `docker image inspect` = exit 1(ローカル未取得。docker daemon 自体は稼働 = `docker info` exit 0)。TLA jar は取得済み(`.amadeus-advisory-check/.amadeus-tlc-cache/…/tla2tools.jar` 実在)。解消には JDK 26.0.1 の導入かイメージの pull(いずれも外部取得を伴う)が要るため、正準リスト(3)によりユーザー裁定へ回した。

- 2026-08-07T04:40:00Z — **#2385/#2313 の影響範囲の記載が observed では成立しない**(要 requirements 段での再判定)。#2385「影響・価値」は「全 PR の trusted base ゲートが内容と無関係に `BASELINE_INVALID` になり、あらゆる修正 PR が着地できない」とするが、observed 断面の実測は次のとおり: (a) main の最新 CI run 31135183415 は **success**(全 job — ratchet ステップを含む `Lint and complexity` も success) (b) ローカルで `bun tests/no-silent-drop-gate.ts check --base-revision <HEAD^ の完全 SHA>` は **exit 0 / `NO_SILENT_DROP_OK`**。恒久赤なのは main 限定の `No Silent Drop Evidence Reconcile` ワークフローのみ。#2338(events ledger 化、PR #2353)着地でratchet の入力が baseline.json から events 台帳へ移ったことが効いている可能性がある。**修正の必要性は変わらない**(reconcile が赤のままだと evidence binding が陳腐化し続ける)が、S1-FATAL/P1 の根拠文と Bolt 1 の緊急度の前提は再確認が要る。
- 2026-08-07T04:40:00Z — ローカルで `check` を **`--base-revision` 無しに実行すると必ず `BASELINE_INVALID`("check mode requires a non-zero trusted base revision"、`tests/no-silent-drop/engine.ts:250-252`)**。これは欠陥ではなく呼び出し規約(`trustedBaseSha` は explicit / `AMADEUS_NSD_TRUSTED_BASE_SHA` / `GITHUB_BASE_SHA` / `GITHUB_EVENT_BEFORE` の順に解決、`tests/no-silent-drop/ledger.ts:213-223`)。さらに base は **HEAD の厳密祖先**でなければならない(HEAD 自身を渡すと "trusted base is not a strict ancestor of HEAD")。build-and-test で本ゲートをローカル実行するときの必須手順であり、`cid:build-and-test:c3-260805-subagent-type-guard` の「BASELINE_INVALID = base revision 解決依存」の具体形。

- 2026-08-07T04:20:00Z — #2313 のコメント(2026-08-06T23:41:38Z)は失敗コードが `REBIND_PR_LANDING_TREE_MISMATCH` へ変化したと報告するが、observed 断面の最新 run(31135902843)は `REBIND_NON_IDENTITY_DRIFT`。binding `fe8c701ba` が event `b8e3e664f` の祖先になったため主分岐へ戻った。**2分岐は交互に現れる**ため、requirements は片方だけの修正で閉じないことを AC に含める必要がある(#2385 §10 Bolt 1 の「Q1+Q2-A を同一 PR」制約の実測裏付け)。

- 2026-08-07T04:05:00Z — #2385 §7(b) は advisory store を「本調査 clone では 260805-subagent-type-guard に schema 1 store 1件」と記すが、本 clone の再census では **schema 1 が5件・schema 2 が1件**(worktree 横断)。回復 verb の対象範囲(1 store か複数 store か)を requirements で確定する必要がある。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

<!-- entries appended by the orchestrator during stage execution -->
