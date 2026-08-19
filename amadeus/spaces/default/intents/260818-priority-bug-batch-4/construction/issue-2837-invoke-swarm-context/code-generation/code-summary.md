# Code Summary — issue-2837-invoke-swarm-context(Bolt 1)

Intent: 260818-priority-bug-batch-4 / Unit: issue-2837-invoke-swarm-context / depth Minimal / TDD 必須

上流: `code-generation-plan.md`(11 step)、`../../../inception/application-design/decisions.md` ADR-1 実装契約 1〜8、`../../../inception/requirements-analysis/requirements.md` FR-2837-1〜5。

測定断面: worktree `bolt-pbb4-b1`(branch `bolt-pbb4-invoke-swarm-context`、base `origin/main` c8c393bba)。以下の実測値はすべて本 tree でのコマンド出力からの転記。

## 変更ファイル

- `packages/framework/core/tools/amadeus-directive.ts` — `InvokeSwarmDirective.batch` 追加、`INVOKE_SWARM_FIELDS` 拡張、`BATCH_IDENTITY` 述語、`checkInvokeSwarmIdentity`(必須性 + 形式 + retry arm 排他)、`:303-311` の偽コメント訂正、self-check examples 2 件へ `batch` 付与
- `packages/framework/core/tools/amadeus-orchestrate.ts` — `emitConfiguredSwarm(projectDir, units, batch)` が identity を搬送、`spentPoolRefusal` 追加(spent pool identity の emit 拒否)、emit 呼出 `String(pick.batchNumber)`
- `packages/framework/core/tools/amadeus-bolt.ts` — stale `SKILL.md Step 6.5` 参照の訂正(挙動不変・コメントのみ)
- `packages/framework/core/tools/amadeus-state.ts` — stale `SKILL.md Step 0.6` 参照の訂正(挙動不変・コメントのみ)
- `packages/framework/core/knowledge/amadeus-pipeline-deploy-agent/branching-strategies.md` — 同根の `Step 0` / `Step 6.5` 参照訂正(FR-2837-5 の受け入れ述語が `packages/` 全域のため必須)
- conductor 面 8 面 — `--batch <n>` → `--batch <directive.batch>`(7 面)、check_cmd / test_file の正規取得元 1 項目(8 面全て、pi 含む)
  - `packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide,pi}/skills/amadeus/SKILL.md`
  - `packages/framework/harness/{cursor,opencode}/commands/amadeus.md`
- `docs/reference/17-skill-system.md` / `.ja.md` — directive 表の `invoke-swarm` 行に identity 搬送と check_cmd 非搬送を明記(英日同一変更)
- `tests/unit/t113.test.ts` — validator の Red 2 本 + 既存 fixture の identity 対応
- `tests/unit/t211-swarm-batch-progress.test.ts` — `seedSpentPoolBatch` + a1(identity 搬送)/ a1b(spent pool 拒否)
- `tests/integration/t135-invoke-swarm.test.ts` — 1b に `directive.batch` の実物 assert
- `tests/unit/t181-conductor-skill-parity.test.ts` — 8 面パリティゲート(identity 転記 + 正規取得元 + `--batch <n>` 不在)
- 台帳: `amadeus/spaces/default/specs/tla/model-map.json`(impl hash pin)、`tests/.coverage-patch-allowlist.json`(entry 190 の意味的セレクタ再アンカー)

## identity 形の選定と根拠(ADR-1 契約2〜3、plan Step 3)

- **選定: 形 (a) — 1-origin DAG batch 番号を `batch: string` として搬送。generation は別フィールドとして載せない。**
- 根拠1(契約2): 搬送値は `prepare --batch` がそのまま受理する必要がある。受理形は `/^[1-9][0-9]*$/`(census P5 参照)で、`String(index+1)` は常に適合する。directive validator にも同一述語(`BATCH_IDENTITY`)を置き、engine が referee に拒否される値を emit できないことを境界で機械化した
- 根拠2(契約3): DAG index を鍵にする既存 join はすべて `String(index + 1)` を使う(census P1、4 箇所)。同じ値を emit するため、join 側は一切変更せずに搬送値と完全一致する — 一部だけ直す合意述語ドリフトが構造的に起きない。ADR-2(#3106、姉妹 unit)が逐語保存を課す `:2527` / `:2549` の数値 batch join もそのまま保存される
- 根拠3(plan Step 3 の形 a における「generation 別フィールド」): **載せない**。engine が populate できても消費者が存在しないフィールドは、契約1が禁じる「supplied と読めて実際は誰も読まない」クラスになる(construction guardrail の「どのコードも消費しない文書のふりをしたフィールド」と同型)。plan generation は `withPlanGeneration`(swarm.ts)が SWARM 行へ押す際にコンパイル済み DAG から自分で読むため、directive 経由の供給は不要
- 根拠4(既存設計との整合): `amadeus-lib.ts:8696-8698` の逐語コメント「A "Batch number" is a value the conductor / hands `prepare --batch`, not a batch identity — a re-dispatch after a failed / attempt-set advances it」が示すとおり、番号の意味は既に「conductor が prepare へ渡す pool 値」であり、swarm evidence 側は unit 名で join する。番号形を変えないことでこの既存契約に触れない

### FR-2837-4(b) の閉じ方と残余

- pool identity は durable(`unit-pool:<batch>:initial-enqueue` / `batchId`)であり、`proposeInitialEnqueue` は `projection.batchId !== null` を `already-initialized` で拒否する。したがって **spent(= `phase !== "open"`)な pool 番号を fresh fan-out 用に emit した時点で衝突が確定する**
- 本 unit の解: engine が identity の権威を持つ以上、**衝突する identity は emit しない**。`spentPoolRefusal` が pool projection を実測し、`batchId !== null && phase !== "open"` なら invoke-swarm ではなく error directive(観測事実 + 残 unit + 出口としての `resolve-failure` / 成果物 landing)を emit する。C6 が実測した「推測値が fail-closed に弾かれず黙って採用される」経路が塞がる
- **残余(未実施・別 Issue 候補)**: spent pool に対する *新世代 pool の自動 mint*(番号を進めて fresh pool を開く)は行っていない。実施するには pool identity ↔ DAG batch の束縛を新設し、`:2527` / `:3920` の pool 読み口と `terminalFailureStopsNext` / `failureOutsideRuntimePopulation`(いずれも `Number.parseInt(batch)-1` を DAG index として使う fail-open 面)を同時に変える必要があり、ADR-2 の逐語保存契約と交差する。ADR-1 の許容範囲を超えるため実装せず、本節に明記する

## join 面の全数 census(契約3、実測)

すべて本 tree(実装後断面)で実行。述語と exit code を併記。

| # | 述語 | 件数 | 結果 |
|---|---|---|---|
| P1 | `git grep -n -F "String(index + 1)" -- packages/framework/core/tools/` | 4 | exit 0。`amadeus-orchestrate.ts:2527`(pool fold / consume 母集団)、`:2549`(settle 行 batch join)、`:3920`(firstUncoveredBatch の pool terminal 読み)、`:4728`(settle emitter の batchOf)。いずれも emit 値と同一の 1-origin DAG 番号 — 変更不要 |
| P2 | `git grep -n -F "batchNumber" -- packages/framework/core/tools/` | 21 行 | exit 0。`firstUncoveredBatch`(:3912/:3929)、`owedBatchGate`(:3967-3971)、`declaredBatchOf`(:4018-4021)、`selectSwarmBatch`(:4046)、emit 呼出(:4322)、`batchNumberOf`(:5633 ほか audit 行読み)、`amadeus-lib.ts` の PlanIntegrityVerdict 群 |
| P3 | `git grep -n -F "readProjection(" -- packages/framework/core/tools/` | 39 行(うち Unit Pool 面は 5) | exit 0。batch を鍵に読むのは `amadeus-orchestrate.ts:3920` / 本 unit 追加の `:4078`(spentPoolRefusal)/ `amadeus-swarm.ts:920` / `amadeus-unit-pool-runtime.ts:233,350`。残りは autonomy / quality / loop-monitor の別 projection |
| P4 | `git grep -n -F "foldUnitPoolEventSets(" -- packages/framework/core/tools/` | 5 | exit 0。`amadeus-orchestrate.ts:2527` と pool runtime 内部のみ |
| P5 | `git grep -n -E '\^\[1-9\]\[0-9\]\*\$' -- packages/` | 10 | exit 0。batch 受理点は `amadeus-swarm.ts:554`(prepare)/ `:906`(finalize)/ `:1172`(pool 系)、`amadeus-bolt.ts:352`(start)/ `:614`(complete)、`amadeus-orchestrate.ts:4185`(failureOutsideRuntimePopulation)。本 unit が `amadeus-directive.ts:581` に同一述語を追加 |
| P6 | `git grep -n -F 'unit-pool:' -- packages/` | 10 行 | exit 0。durable な冪等鍵はすべて `unit-pool:${batch}:…`(swarm.ts:638 ほか) |
| P7 | `git grep -n -F 'parseApprovedSwarmBatches' -- packages/` | 5 | exit 0。approve-batch 台帳は `number[]` で同じ 1-origin 番号を使う |

結論: emit する identity は 4 つの DAG-index join、6 つの受理点、承認台帳のすべてと同一表現。**同一変更で整合済み(変更を要した join 面は 0 件、追加した整合点は directive validator 1 箇所)**。

## Red / Green 証跡(実測)

| # | 内容 | コマンド | 結果 |
|---|---|---|---|
| R1 | identity 搬送(t211 a1 / a1b) | `bun test tests/unit/t211-swarm-batch-progress.test.ts -t "a1"` | **exit 1** / 0 pass 2 fail。a1: `expect(directive.batch)` → `Expected: "2" / Received: undefined`、a1b: `Expected: "error" / Received: "invoke-swarm"` |
| R2 | validator(t113) | `bun test tests/unit/t113.test.ts` | **exit 1** / 59 pass 4 fail(`invoke-swarm: unknown key: batch` ほか) |
| R3 | emit 実物(t135 1b) | `bun test tests/integration/t135-invoke-swarm.test.ts -t "1b"` | **exit 1** / 0 pass 1 fail(`Expected: "1" / Received: undefined`) |
| R4 | 8 面パリティゲートの落ちる実証(注入 → 赤 → revert の 1 セット) | `git checkout -- .../claude/skills/amadeus/SKILL.md` → `bun test tests/unit/t181-conductor-skill-parity.test.ts -t "transcribes the batch identity"` → 復元 | **注入時 exit 1**(`missing: directive.batch` / `missing: the convergence check is conductor knowledge` / `still hand-types --batch <n>`)→ 復元後 `bun test tests/unit/t181-...` **exit 0** / 10 pass 0 fail。残渣ゼロの機械確認: commit 後の worktree で `git status --porcelain` → **出力 0 行**、`git diff HEAD --stat` → 空(2026-08-18 §12a iteration-1 FOLLOW-UP を受けて実測追記 — 注入対象の SKILL.md は `git checkout --` による復元後に実装 commit `9d275d912` の一部としてコミット済みであり、現 tree に未申告差分なし) |
| G1 | Green(4 ファイル一括) | `bun test tests/unit/t113.test.ts tests/unit/t181-conductor-skill-parity.test.ts tests/unit/t211-swarm-batch-progress.test.ts tests/integration/t135-invoke-swarm.test.ts` | **exit 0** / 127 pass 0 fail |
| G2 | 連動面 | `bun test tests/unit/t186-foreach-per-unit-iteration.test.ts tests/unit/t129-stage-runner-drift.test.ts …` (t113/t181/t211 と同一 run) | **exit 0** / 139 pass 0 fail |
| G3 | swarm 経路の integration | `bun test tests/integration/{t135-invoke-swarm,t166-multi-repo-construction,t251-swarm-and-next-stage}.test.ts` | **exit 0** / 45 pass 0 fail |
| G4 | 同上(第2群) | `bun test tests/integration/{t403-issuance-guard,t296-hook-launch-and-worktree-resolution}.test.ts` | **exit 0** / 17 pass 0 fail |
| G5 | allowlist 監査(再アンカー後) | `bun test tests/integration/t535-… tests/unit/t534-… tests/unit/t536-… tests/integration/t537-…` | **exit 0** / 57 pass 0 fail(再アンカー前は 44 pass + 1 error: `source fingerprint for …amadeus-orchestrate.ts#<module> resolved 0 times`) |
| G6 | coverage 台帳 | `bun test tests/unit/t-coverage-mechanism-ratchet.test.ts tests/unit/gen-coverage-registry.test.ts tests/unit/t229-coverage-patch-gate.test.ts` | **exit 0** / 23 pass 0 fail |
| G7 | docs ゲート | `bun test tests/unit/t174-docs-legacy-refs-gate.test.ts tests/unit/t-pi-docs-contract.test.ts tests/unit/t132-hooks-doc-count-sync.test.ts` | **exit 0** / 13 pass 0 fail |
| G8 | 型・lint・build・境界 | `bun run typecheck` / `bun run lint` / `bun run build` / `bun run source-only:check` | すべて **exit 0**(lint は既存 warning 474 件のみ、blocking なし) |

ローカルフルスイートは実行していない(remote-first — blocking 検証はリモート CI が正)。

## 台帳 resync(NFR)

- `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only` → **exit 0**、`IMPL_ONLY_UPDATED`。orchestrate.ts `cd9b3baa92a0 → 736bc3510fa1 → b07123099077`(関数順の整理後に再実行)、state.ts `e3612b309f28 → c889d93f414f`
- `bun tests/gen-coverage-registry.ts --check` → **exit 0**、`coverage registry: OK (fresh, guards green, ratchet held)`。新規テストファイルは追加していないため regen 不要
- `tests/.coverage-patch-allowlist.json` entry 190(`<module>` / 11 行 / 免除 1-11)を gate 自身の `createSemanticSelector` で再アンカー。**span は 11 行のまま**(免除の拡大なし)。免除対象は base と同じ「`swarmConfigIssue` 本体 + `emitConfiguredSwarm` の invalid-config arm」であり、新設した `spentPoolRefusal` は免除に含めていない(t211 が in-process で通す)。この連続性を保つため `spentPoolRefusal` を `swarmConfigIssue` の**前**に配置した

## 受け入れ実測(配送先ツリー、FR-2837-2 / 3 / 5)

対象 14 面 = dist 8 面(`dist/<harness>/…/skills/amadeus/SKILL.md` ないし `commands/amadeus.md`)+ self-install 6 面(`.claude` / `.agents` / `.cursor` / `.kimi-code` / `.opencode` / `.pi`。`.kiro` と kiro-ide 系の self-install 面はこの clone に存在しない — `ls -d .kiro .kiro-ide` 両方 No such file or directory(2026-08-18 実測)。self-install の対象は promote-self がこの clone へ生成した面のみで、dist 8 面とは母集団が異なる)。

- A4 `grep -c -- "--batch <n>" <face>` → **全 14 面 0**(手動指定の残存なし)
- A5 `grep -c "the convergence check is conductor knowledge" <face>` → **全 14 面 1**(正規取得元の 1 節、pi 面含む。FR-2837-2 の「0 件の面が残れば fail」を満たす)
- A6 `grep -c "directive.batch" <face>` → claude/codex/kimi/kiro/kiro-ide 7、cursor/opencode 6、pi 1(**全 14 面 ≥ 1**)
- A7 `grep -rn -F "Step 6.5" packages/ dist/ .claude .agents .cursor .kimi-code .opencode .pi .codex` → **exit 1(0 件)**、同 `"Step 0.6"` → **exit 1(0 件)**(FR-2837-5)
- 補助: `git grep -l -F "amadeus-worktree" -- packages/framework/harness/` → **exit 1(0 ファイル)** — stale 参照の書き換え文言(「どの conductor 面もこの dispatch を持たない」)の裏付け

grep の空出力はすべて exit code で不一致(1)と確認済み。ERE の `\b` は使用していない(ugrep ラッパの無音 exit 1 回避)。

## 逸脱

- **なし(ADR-1 実装契約 1〜8 の範囲内)**。契約2の選択肢のうち「pool generation を織り込んで非数値化する」形は採らず、数値のまま + spent identity の emit 拒否で閉じた(上記「FR-2837-4(b) の閉じ方と残余」)
- plan Step 7 は code コメント 2 箇所を名指すが、FR-2837-5 の受け入れ述語が `packages/` 全域であるため `knowledge/amadeus-pipeline-deploy-agent/branching-strategies.md` の同根参照 2 行も同一変更で訂正した(issue-evidence.md #2837 クロスレビュー claim ledger の C12 — branching-strategies.md:278 の逐語「the dispatch lives in SKILL.md prose」を引いて手順消失の根を特定した claim — が同根と実測した面。requirements Out of Scope 節の「C11/C12 finalize 偽 green」は同じ claim ledger の隣接番号で別件。挙動不変)
- **plan 未記載の追加変更(申告)**: `docs/reference/17-skill-system.md` / `.ja.md` の directive 表 `invoke-swarm` 行に identity 搬送と check_cmd 非搬送を明記した。plan の 11 step はこの 2 ファイルを名指していないが、directive 契約の変更は project.md Mandated「framework source、全ハーネス配布、self-install 面、tests、対訳ドキュメントを同じ変更で更新する」により対訳 docs の同期が義務であり、契約変更(Step 3)の同一変更として実施した。§12a iteration-1 BLOCKER を受けて本欄に申告を追記(2026-08-18)

## 未検証面

- ローカルフルスイート・coverage gate(Project / Patch)・conformance は未実行 — リモート CI が正(push-first)
- 実 conductor(Claude / Codex 等)による end-to-end の swarm 実行は未実施。検証したのは engine が emit する directive 実物と、配送先ツリーの面の記述の 2 断面
- `spentPoolRefusal` の `draining` arm はテストでは terminal 経路のみを通している(`phase !== "open"` の一括判定であり draining も同じ経路に落ちる)
