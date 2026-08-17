# Code Generation Plan — unit election-append(Bolt 5 / FR-5 / #3046)

方式 = decisions.md ADR-5(voter スコープ採番 + 複合一意 + 辞書式順序、選挙 2-0)。本計画は ADR-5 実装契約 1-6 の機械的射影。テスト戦略 = Comprehensive。TDD 必須。

トレーサビリティ: 全ステップ → FR-5(#3046)。

- [x] Step 1: Red — 異なる voter 2名の実プロセス並行 append(バリア同期)で readAllPending が `err("corrupt")` を返すことを統合テストで Red 実測(クロスレビュー r1 の driver 構成を雛形に。scratch store、env 隔離シーム使用)
- [x] Step 2: 採番の voter スコープ化 — `appendPending`(amadeus-election-store.ts:1063)の全体 max+1 を `readPendingVoter`(:1057-1061)結果からの voter ローカル max+1 へ置換。readAllPending を採番に使う経路を残さない(明示テストで pin — ADR-5 契約1)
- [x] Step 3: 一意性検査の複合キー化 — `readAllPending`(:545-547)を (voter, arrivalSequence) 複合一意へ。同一 voter ファイル内の重複は corrupt のまま(fail-closed 強度維持 — ADR-5 契約2)
- [x] Step 4: 全体順序の1定義集約 — (arrivalSequence, voter) 辞書式の比較関数を1箇所へ置き、readAllPending の sort(:548)と全消費点(mergePendingEvents :634-654 / materialize 系)で共有。voter ローカル単調性の厳密保存を明示 assert(ADR-5 契約2-3)
- [x] Step 5: D-09 設計コメント(:16-19)を新不変条件(voter 単位採番・voter 間独立・ロック不要)へ同一変更で書換(ADR-5 契約3)
- [x] Step 6: 同一 voter の並行二重投稿 = last-write-wins(store 非破壊)の明文化 + テスト(ADR-5 契約4)
- [x] Step 7: property テスト(fast-check、固定 seed・低 numRuns)— (i) voter ローカル単調 (ii) (voter, seq) 一意 (iii) 到着順非依存の順序決定性(同一入力集合 → 同一順序列)(ADR-5 契約6)
- [x] Step 8: 既存テスト追従 — t549 / t235 / t373 の前後 green(互換シム・移行コードは追加しない — 旧データが読めなくなるのは許容済み)
- [x] Step 9: 台帳 resync — 新規テストファイルの coverage-registry regen。`bun run build` + typecheck / lint / 対象テスト green。フルスイートは push 後 CI

除外(スコープ外): 選挙 CLI(amadeus-election.ts)側の変更(呼出契約不変)。並行 voter の実運用化(将来 intent)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-17T05:31:12Z
- **Iteration:** 1
- **Scope decision:** none

code-summary.mdがPR最終head(4988c824c)ではなく初回commit(1240d0f0b)のみを記録し、CodeRabbit是正とNFR-3のmodel-map resyncが未反映のためBLOCKER、他3件はFOLLOW-UP/NIT。

### Findings

- BLOCKER | code-summary.md の『コミット』節と『変更ファイル』節は commit 1240d0f0b(`git show --stat HEAD` 転記)のみを記録しているが、pr-convergence-report.md の local head / remote head / pr head はいずれも 4988c824c であり、両者は一致しない。attested context によれば 1240d0f0b の後に CodeRabbit 指摘3件の是正(test強化、ece3a71f1)と FormalElection の model-map ピン resync(4988c824c)が追加されているが、code-summary.md にはこの2commit分の変更内容・ファイル一覧・検証結果が一切記載されていない。これはステージ契約 Step 5 の『Files created/modified』記載要求(code-generation.md Step 5)をPR head断面で満たしておらず、requirements.md NFR-3(model-map implPathファイルを触るunitはハッシュピンを同一変更でresyncする)の遵守を成果物単体からは検証不能にしている。加えて『検証(worktree内)』節のtypecheck/lint/build/test結果がどの断面のものか判別できず、実際のPR headに対する実測として信頼できない。是正: code-summary.mdをPR head(4988c824c)断面へ更新し、CodeRabbit是正の内容・model-map resync対象と検証コマンド/exit code・その断面でのtypecheck/lint/build/test結果を明記する。
- FOLLOW-UP | code-generation-plan.md Step 4 は比較関数 comparePendingEvents を readAllPending の sort に加え『全消費点(mergePendingEvents :634-654 / materialize 系)』でも共有することを求めているが、code-summary.md の『主要判断』節は『readAllPending の sort で共有』としか述べておらず、mergePendingEvents / materialize 系が同一比較関数を使うよう更新されたかが確認できない。Step 4 の完了([x])を裏付けるため、これら消費点でも共有されたことを code-summary.md に明記することを推奨。
- FOLLOW-UP | code-summary.md の逸脱2『writeStoreFile の共有一時ファイル名による敗者側 io-error の新発見』は、同一voterの真の並行二重投稿という新たに判明した latent な失敗モードだが、『将来intent候補として申し送る』という記述のみで GitHub Issue が起票されていない。team.md の cid:requirements-analysis:bug-zero-goal は『潜在バグ探索では修正せず実測だけを起票する』と定めており、record archiveへの記述だけでは将来のトリアージキューに乗らずロストするリスクがある。再現手順(実プロセス並行driver構成)を添えてIssueを起票することを推奨。
- NIT | code-generation-plan.md Step 2 は appendPending の位置を『amadeus-election-store.ts:1063』と1箇所で引用するが、code-summary.md は『旧 :1042/:1063』と2つの行番号を併記しており、どちらが変更前/変更後かの説明がない。差分によるshiftの可能性が高く実害は小さいが、file:line引用の一意性を保つため一行の注記を推奨。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-17T05:39:03Z
- **Iteration:** 2
- **Scope decision:** none

iteration1のBLOCKER(code-summaryが初回commitのみ記載)は追補節の3コミット列挙・累積diff転記・attested headとの文字単位一致確認で解消。残りはFOLLOW-UP3件・NIT1件で非ブロッキング。

### Findings

- FOLLOW-UP | (iter1由来・未解決) code-generation-plan.md Step 4はcomparePendingEventsをreadAllPendingのsortに加えmergePendingEvents(:634-654)/materialize系でも共有することを求めるが、code-summary.mdは追補後も『readAllPendingのsortで共有』としか述べておらず、当該消費点での共有実装は依然未記載。Step4完了根拠を明記することを推奨。
- FOLLOW-UP | (iter1由来・未解決) 逸脱2『writeStoreFileの共有一時ファイル名によるio-error』はteam.mdのbug-zero-goal(潜在バグ探索は実測のみでIssue起票)に該当するが、追補後もGitHub Issue番号の記載がなく『将来intent候補』の記述のみ。再現手順を添えたIssue起票を推奨。
- FOLLOW-UP | (新規) 追補節の検証記述『検証は各コミット時点でtypecheck/lint/対象テストgreen(コミット2: t3046/t549再実行green、コミット3: t-formal-verif-tla-model/t404 green)』は、元の『検証(worktree内)』節(pass/fail件数とexit codeを明記)と比べて厳密さが劣る。team.mdのnumbers-from-command-output-only運用に完全準拠させるには、追補対象コミットの検証にもコマンド出力の転記(exit code・pass/fail件数)を添えることを推奨(pr-convergence段での最終検証時に補完可)。
- NIT | (iter1由来・未解決) code-generation-plan.md Step2の『amadeus-election-store.ts:1063』とcode-summary.mdの『旧 :1042/:1063』の行番号併記について、どちらが変更前/変更後かの注記がないまま。実害は小さいが一行の注記を推奨。
