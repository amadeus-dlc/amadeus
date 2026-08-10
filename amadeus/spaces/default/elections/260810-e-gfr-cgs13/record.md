# Election Record — E-GFR-CGS13

- question: 260810-grilling-frontier-resync code-generation ステージの §13 学習候補の採否。conductor 提案 = 採用2件 / 不採用12件(surface が挙げた c1-c12 のうち下記2件へ吸収されるもの・intent 固有の執行記録)。

【採用案 A(既存 cid への追補)】cid:code-generation:mirror-merge-before-approve への追補: **§12a reviewer は conductor ツリーを読むため、Bolt の取込は approve 前ではなく review 前に行う**。取込前にレビューへ出すと、成果物が申告する実測(sweep 0 hit 等)を reviewer が再現できず、実装の欠陥でない BLOCKER を量産してイテレーション予算を消尽する。さらに source-only 境界下では、取込直後の conductor ツリーは gitignored な自己インストール投影(.claude / .codex 等)が旧内容のままであり、`git status --porcelain` 空は追跡ファイルの不変を示すのみで投影の更新を証明しない — 取込後に `bun run build` を実行し、**配送先ツリーの述語**(生成物木を明示対象にする非 git grep 等)で再実測してからレビュー/ゲートへ出す(cid:requirements-analysis:c2-acceptance-at-delivery-tree の実例)。実測: 本 intent の projection-sweep §12a で i1 = BLOCKER 4件(全件が未取込起因)、i2 = BLOCKER 3件(全件が自己インストール投影の未再生成起因)、いずれも実装の欠陥ゼロでイテレーション予算2を消尽し、conductor が build + R4 再実測(exit 1 / 0 hit)で閉包した。

【採用案 B(既存 cid への追補)】cid:code-generation:c1-degrade-batch-directive-capture ファミリへの追補: **swarm の unit pool はセッション断で未確定 attempt を残し、以後の acquire が capacity-exhausted で恒久ブロックする**。回復は (i) 対象 attempt の効果面(worktree の tracked 変更)を実測して no-effect を確定 (ii) `record-reconciliation --effect no-effect-confirmed` で tail-requeue(同ツールが新 attempt を自動再取得する) (iii) `prepare` が worktree 既存で ok:false を返す場合は既存 worktree を再利用し、base が Bolt 依存を満たすことを実測してから dispatch → `confirm-dispatch`。pool の projection は audit シャードの UNIT_POOL_EVENT_SET_COMMITTED から復元でき、attempt id はそこから読む。実測: 本 intent の batch 2 で前セッションの ordinal 1 attempt 2件を本手順で回収し、ordinal 2 で完走(converged 2 / failed 0)。

choice 1 = A・B の2件を採用(推奨)。choice 2 = 一部のみ採用または別案(留保に記す)。choice 3 = 0件(いずれも既存 cid の射程内)または質問自体に欠落・誤り。

検証対象: `amadeus/spaces/default/intents/260810-grilling-frontier-resync/construction/code-generation/memory.md`(Deviations)、同 `construction/projection-sweep/code-generation/{code-generation-plan.md,code-summary.md}` の Review ブロックと conductor 是正節、同 `construction/budget-sensor/code-generation/code-generation-plan.md` の Review ブロック、`amadeus/spaces/default/memory/project.md` の既存 cid 群(mirror-merge-before-approve / c2-acceptance-at-delivery-tree / c1-degrade-batch-directive-capture / c1-pcp-isolated-session-swarm-incompat)、および audit シャードの UNIT_POOL_EVENT_SET_COMMITTED 行。既存 cid の射程内かどうかを独立に実測して判断すること。

裁定: A・B の2件を採用(推奨)(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-2, GoA2): B の追補先 cid は再考の余地がある。B の機序は unit pool の attempt ライフサイクル(active スロット占有 → acquire の capacity-exhausted、record-reconciliation --effect no-effect-confirmed による tail-requeue と fillReleasedSlots による自動再取得)であり、c1-degrade-batch-directive-capture ファミリが縛る directive 捕捉(record 側の produces/consumes 解決)とは機序が異なる。persist 時は swarm 運用系 cid(swarm-finalize-claimed-required / c2 / swarm-unit-artifact-backfill)への追補として置くか、少なくとも『directive 捕捉とは別面の pool 復旧手順である』ことを本文に明記して射程差を可視化すること。文面そのものの正確性には異議なし。
- 留保(subagent-1, GoA2): B の persist 文には record-reconciliation の必須フラグ --reconciliation-kind <kind> を併記すること — packages/framework/core/tools/amadeus-swarm.ts:1211 の `if (!flags["reconciliation-kind"]) fail(...)` により未指定は fail し、提案文の逐語コマンドは再実行不能(cid:requirements-analysis:mechanism-cite-verify-at-draft / verbatim-quote-with-cite)。
票タイムライン: 配信 2026-08-10T14:09:34Z → 配信 2026-08-10T14:09:34Z → subagent-2 2026-08-10T14:11:18Z → subagent-1 2026-08-10T14:12:16Z → 開票 2026-08-10T14:12:38Z
GoA[E-GFR-CGS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
