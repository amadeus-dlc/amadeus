# Test Results — 260809-report-done-kind-split

上流入力: `construction/fix-2762-done-terminal/code-generation/code-generation-plan.md` Step 8 と `code-summary.md` の検証コマンド表。実行 tree = `e7c0515fec217a589035e8ba0aef814599ad34a2`(`origin/main` 断面)。コード面は attest 断面 `b47609adaaa689610faf9a1c5ace312b750e8606` と同値(`git diff --name-only e7c0515fe b47609ada -- . ':(exclude)amadeus/'` → 0 行)。環境: bun 1.3.13、`TEST_TIME_FACTOR=2`、macOS(darwin 25.5.0)。

## ビルドと静的検査

| コマンド | exit | 備考 |
|---|---|---|
| `bun install` | 0 | `Checked 116 installs across 139 packages (no changes)` |
| `bun run build` | 0 | 7 ハーネスの dist + セルフインストール面を再生成 |
| `git status --porcelain --untracked-files=no`(build 後) | — | record 配下のみ。`packages/` `dist/` `docs/` `tests/` は 0 行 |
| `bun run typecheck` | 0 | |
| `bun run lint` | 0 | |
| `bun run source-only:check` | 0 | |
| `bun scripts/mirror-distribution-check.ts` | 0 | |
| `bun scripts/mirror-docs-contract.ts` | 0 | `mirror-docs-contract: OK (4 documents, 44 topics)` |
| `bun scripts/scan-public-projections.ts` | 0 | `scan-public-projections: OK (448 files)` |
| `bun run no-silent-drop -- --base-revision e7c0515fec217a589035e8ba0aef814599ad34a2` | 0 | 引数なしは `BASELINE_INVALID` で exit 2(合否ではなく引数不足) |
| `bun tests/callsite-guard.ts --check` | 0 | |
| `bun .claude/tools/amadeus-graph.ts compile --check` | 0 | グラフ不変量ガード |
| 隔離2回ビルドの再現性検査 | 0 | 下記「再現性検査」節 |

`mirror-docs-contract.ts` と `scan-public-projections.ts` はフルスイート併走中の初回実行で exit 1 を観測したが、単独再実行でいずれも exit 0 かつ `OK` 行を出力した。表の値は単独実行のもの。

## 再現性検査(隔離2回ビルド)

CI の `Reproducible build` ジョブと同形の手順をローカルで実施:

```
SHA=$(git rev-parse HEAD)                       # b47609ada + 本ステージの record 追記前断面
for t in tree-a tree-b; do
  git clone --quiet --no-hardlinks . <scratch>/$t
  git -C <scratch>/$t checkout --quiet --detach "$SHA"
  (cd <scratch>/$t && bun install --frozen-lockfile && bun run build)
done
diff -r <scratch>/tree-a/dist <scratch>/tree-b/dist
```

結果: `diff -r` **exit 0**(差分なし)。両 tree の `dist` 配下ファイル数は **5256 / 5256**(`find <tree>/dist -type f | wc -l`)。clone 先は repo 外の scratch。

## 対象テスト(要件駆動)

| コマンド | 結果 |
|---|---|
| `bun test tests/integration/t528-report-ack-kind.integration.test.ts` | **7 pass / 0 fail**(15 expect) |
| `bun test tests/unit/t115.test.ts tests/integration/t118.test.ts` | **38 pass / 0 fail**(171 expect) |

## フルスイート

```
bun run test:ci          # TEST_TIME_FACTOR=2
```

ランナー SUMMARY の転記:

```
Test files: 1060
Failed files: 2
Total assertions: 14150
Failed assertions: 5
```

exit code: **2**。

### 失敗2件の帰属

本 unit の diff に非 `amadeus/` パスは含まれない(`git diff --name-only origin/main...HEAD -- . ':(exclude)amadeus/'` → **0 行**)。したがって構造的に本変更由来ではありえないが、`cid:build-and-test:c1-ablation-before-artifact-repro` に従い同一条件の切り分けを実施した。

**(1) `tests/integration/t-approve-batch-presence-guard.integration.test.ts` — 4 fail / 2 pass**

失敗の逐語:

```
error: setup approve failed rc=1: {"error":"Audit emission failed: OTel logs already bootstrapped for
project dir /Users/j5ik2o/orca/workspaces/amadeus/intent-2764-complete, refusing to re-bootstrap for
/private/var/folders/.../amadeus-test-eSnaBu — invariant violation (one workspace per process)"}
```

単独実行でも同じ 4 fail が再現する(クロステスト汚染ではない)。gitignored な入力での ablation:

| 条件 | 結果 |
|---|---|
| `amadeus/spaces/default/intents/active-intent` あり(= 実 intent を指す) | 2 pass / **4 fail** |
| 同カーソルを退避して実行 | **6 pass / 0 fail** |
| カーソルを復帰 | 元に戻る |

→ **gitignored な active-intent カーソルの存在に条件づけられた環境起因**。実 record が存在するワークスペースでフルスイートを回すと、OTel の one-workspace-per-process 不変量がテスト用の一時 project dir への re-bootstrap を拒否する。本変更とは無関係。Issue **#3243** として起票済み。

**(2) `tests/integration/t222-migration-routing.test.ts` — 1 fail / 42 pass**

失敗の逐語:

```
error: git add -A failed: error: unable to create temporary file: Invalid argument
error: .kiro/knowledge/amadeus-devsecops-agent/security-guide.md: failed to insert into database
```

単独実行 → **43 pass / 0 fail**(347 expect)。並行負荷下で git の一時ファイル作成が失敗した一過性のフレークであり、アサーション自体は成立している。

### 判定

自変更由来の失敗は **0 件**。両件とも環境起因(カーソル条件づけ / 並行負荷フレーク)で、本 intent のスコープを膨らませずに記録した。

## 参考: PR #3236 の CI

本 intent の record を運ぶ PR #3236(head `b47609ada`)では、`CI Success` 集約と `CI Review Thread Gate`、`Control byte gate`、`Detect CI changes` が pass。テスト系・coverage 系ジョブは docs/record 変更に対する `paths-ignore` により `skipping`。実装面の CI green は配送元 PR #2767 が merge queue を通過した時点の実績が正本。

## requirements の NFR ブロッキング集合に対する充足

`requirements.md` の Non-functional requirements が名指す集合(typecheck / lint / 再現性 / source-only / graph invariants / test:ci)を、漏れなく本ステージで測った:

| NFR 集合の要素 | 測定 | 結果 |
|---|---|---|
| typecheck | `bun run typecheck` | exit 0 |
| lint | `bun run lint` | exit 0 |
| 再現性 | 隔離2回ビルド + `diff -r` | exit 0(5256 / 5256 ファイル) |
| source-only | `bun run source-only:check` | exit 0 |
| graph invariants | `bun .claude/tools/amadeus-graph.ts compile --check` | exit 0 |
| test:ci | `bun run test:ci` | **exit 2**(Failed files 2、いずれも環境起因で自変更由来 0 — 上記「失敗2件の帰属」) |
| 生成物 drift なし | `bun run build` 後の `git status --porcelain --untracked-files=no` | record 配下のみ |
| coverage patch gate | — | 本 PR の diff に非 `amadeus/` パスが 0 行のため対象行が存在しない |

`test:ci` の exit は他の行と異なり非ゼロである。CI 上の実装面の green は配送元 PR #2767 が merge queue を通過した時点の実績が正本であり、本ステージのローカル実行は帰属の切り分けのために回した。

## code-generation §12a の FOLLOW-UP のうち本ステージで閉じたもの

iteration-2 の READY verdict に付いた FOLLOW-UP のうち、測定で閉じられるものを本ステージで測り直した:

- **FR-5 の不在側 census が docs 2面を覆っていない** → 覆った。`docs/reference/17-skill-system.md` / 同 `.ja.md` に対し、#2767 が置換した退役リテラル3種(`emits ten kinds today` / `discriminated union over **nine** directive kinds` / `emits seven kinds today`)と日本語版の対応表現(`9つ` / `7種` / `10種`)を `grep -c -F` で測り、**全件 0 hit**。対照として同ファイルの `committed` は 6 / 5 hit(en の 6 件目は swarm `finalize` 表の無関係な語)
- **NFR ブロッキング集合の3要素(再現性・graph invariants・test:ci)が未測定または未併記** → 上表で全要素を測定・併記した

残る FOLLOW-UP(`requirements.md` 本文が方式 A のままである件、SKILL 面の件数語ドリフト残余、`emitDeferredCompletionBoundary` の腕が列挙述語の外である件、配布 drift ガード2本の初回 exit 1 の帰属)は測定ではなく成果物改訂・別 Issue を要するため、完了ゲートの申し送りとして集約する。

## 形式検証(formal-model-check ハンドオフ)

`build-and-test` の完了報告時に engine が `execute-advisory-handoff`(`formal-model-check` / `spec-change` / instance `159c5aeb-7108-40e5-bea0-6df31788a1dd`)で hold した。hold 理由は `never-run` — activation state(`.claude/.amadeus-plugin-activation.json`、machine-local)がこの新規 worktree に存在しないためで、本 intent が spec を変更したからではない。

hold を「記録だけで」解消することは検証劇場に当たるため(`cid:formal-model-check:fmc-no-activation-record-on-not-applicable`)、**登録済み全4モデルに対して TLC の網羅探索を実際に走らせた**。ローカル単一モデル経路(`cid:formal-model-check:c2`)を使い、`--out` は repo 外の scratch を指定:

```
bun .claude/plugins/formal-model-check/tools/run-model-check.ts   --model amadeus/spaces/default/specs/tla/<Name>.tla   --cfg   amadeus/spaces/default/specs/tla/<Name>.cfg   --out   <repo外 scratch>/<Name>
```

| モデル | outcome | exit | runId | completion marker |
|---|---|---|---|---|
| BoltPrAttestationGate | NOT_DETECTED | 0 | `4add8861-bdc9-4e57-bd12-a2138a77a848` | `complete: true` |
| FormalElection | NOT_DETECTED | 0 | `1823b97f-3b8b-48d5-95e2-1d933ddefb26` | `complete: true` |
| MirrorLifecycle | NOT_DETECTED | 0 | `91db3093-8c69-4b8c-a456-1cb8d6f889e0` | `complete: true` |
| PrConvergenceGate | NOT_DETECTED | 0 | `2e25b689-1bd2-472d-919a-64e2b27642e5` | `complete: true` |

4件とも `completion-marker.json` の `complete: true` を持つ(部分探索・timeout は fail-closed で HARNESS_ERROR になる — `cid:application-design:finite-exploration-not-detected-proof`)。実行環境: java Temurin 26.0.1+8 / docker 稼働。1モデルあたり約2分。

あわせて model-map のピン drift を検査:

```
bun .claude/plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts
→ {"pass":true,"findings_count":0,"findings":[]}
```

本 intent は pinned implPath(`amadeus-orchestrate.ts` / `amadeus-state.ts` 等)を1バイトも変更していないため drift はなく、この結果と整合する。

実行後に `bun .claude/plugins/formal-model-check/tools/plugin-activation.ts record .claude`(exit 0)で verdict を記録し、`advisory .claude` が `{"verdict":{"kind":"no-hold"}}` を返すことを実測して hold を解消した。**記録は実際に完走した検査に裏打ちされており**、未実行のまま記録する経路は採っていない。
