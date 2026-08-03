# Services — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): requirements.md(FR-5a/5b の深掘り実行面、FR-3a/3c のガード CLI と落ちる実証、NFR-4 の決定性・実行時間、NFR-5 の既存ブロッキング集合維持)、architecture.md(投影と CI の含意 = core 改修が dist 7 面 / `dist:check` / coverage / `t258-boundary-guard` を引き込む)、component-inventory.md(「静的ガード = `tests/callsite-guard.ts` 同型の新規 allowlist ratchet 1 本」という対象規定 — 下記のサービス面をその1本に閉じる)

測定 ref: **worktree HEAD `5a6f79727`**(`.github/workflows/` は observed `9750f8aea` から差分ゼロ)。

## サービス面の性格

component-inventory.md 現在節が規定する対象3グループのうち、サービス面を持つのは第3グループ(「静的ガード(`tests/callsite-guard.ts` 同型の新規 allowlist ratchet 1 本)」)だけである。第1グループ(コーデック正本)は関数呼び出しのみ、第2グループ(テスト側 10 パス)は既存ランナーに載るだけで、いずれも独立した起動面を持たない。したがって以下の S1 / S2 は「棚卸しの第3グループ + FR-5 の CI 面」に閉じる。

本 intent は UI を持たない。「サービス」に相当するのは (S1) ガード CLI と (S2) CI ジョブの2つで、いずれも**出力文言 + exit code** が契約面である。したがって以下は API/UI 仕様ではなく**出力契約**として書く。オーケストレーションは choreography ではなく、CI のジョブ定義による静的な起動関係のみ(サービス間通信は存在しない)。

## S1: 無検査キャストガード CLI

### 起動形

```
bun tests/unchecked-cast-guard.ts --check                # ゲート実行(既定)
bun tests/unchecked-cast-guard.ts --update               # allowlist を再走査から書き直す
bun tests/unchecked-cast-guard.ts --check --report <path>  # 残存レポートを JSON で併出力
```

`tests/callsite-guard.ts:33-36` の使用法コメント(実文 `//   bun tests/callsite-guard.ts --check           # CI gate (exit 1 on a new site)`)と同じ3動詞・同じ並びを採る。新しい CLI 文法は発明しない。

### 出力契約(verdict 文言 + exit code)

| verdict | 条件 | stdout / stderr | exit code |
| --- | --- | --- | --- |
| OK | 新規サイトなし | stdout に残存レポート(`… N unchecked cast(s) remaining across M file(s)` + ファイル別内訳)+ `unchecked-cast guard: OK — 0 new casts, N remaining (shrink-only)` | **0** |
| OK(縮小検知) | 実測 < allowlist | 上記に加え `unchecked-cast guard: K allowlist entr(ies) now over-count — prune with --update:` と該当行 | **0** |
| NEW_CAST | いずれかの (file, kind) で実測 > allowlist | stderr へ `UNCHECKED CAST GUARD FAILED [NEW_CAST]:` と違反行(`<file>: <kind> — allowlist <a>, measured <m>`)+ 是正案内 | **1** |
| ALLOWLIST_UNREADABLE | allowlist 不在 / 不正 JSON / `direction !== "shrink-only"` | stderr へ `UNCHECKED CAST GUARD FAILED [ALLOWLIST_UNREADABLE]:` + 再生成コマンド | **1**(fail-closed) |
| 使用法エラー | 未知の引数 | stderr に usage | **2** |

引用元 `tests/callsite-guard.ts` のエラー分岐方針との明文照合(`cid:application-design:citation-semantics-check`): 同ファイルは `fail(code, lines)`(`:295-296` 実文 `function fail(code: string, lines: readonly string[]): number {` / `  console.error(\`CALLSITE GUARD FAILED [${code}]:\`);`)で **1** を返す。allowlist 不読も同じ 1(`:334`)。`main`(`:371`)は未知引数で `console.error(USAGE); return 2;`(`:378-379`)、想定外例外を `UNEXPECTED` として 1(`:381-382`)にする。本設計はこの4方針(通常違反 1 / fail-closed 1 / usage 2 / 例外 1)をそのまま継承し、**相違はコード名と語彙(`NEW_CALLSITE` → `NEW_CAST`)のみ**である。

### 落ちる実証(FR-3c)の駆動面

`CheckOptions.census` を注入して **in-process** で違反アームを駆動する(component-methods.md の U4 節)。理由は2つ:

1. spawn 越しの CLI 実行は `bun --coverage` の計測外(`cid:requirements-analysis:bun-coverage-spawn-blindspot`)で、NFR-2 の patch coverage を満たせない。
2. 実コーパスを注入せずに違反を作れる — 実ファイルへ違反を書き込む必要がないため、`cid:code-generation:falling-proof-injection-one-set` が要求する「赤の実測 → revert を不可分1セット」の revert 対象がそもそも生じない。

ただし**実コーパス側の落ちる実証も1回だけ行う**(注入面が「テストが実際に読む面」であることの確認 — `cid:code-generation:injection-surface-verify`)。この1回は `packages/framework/core/tools/` 配下の実行時に消費される行へ `JSON.parse(x) as SomeType` を一時注入し、赤を実測してから revert する。型注釈のみの変更では AST 述語は反応するが「実行時に消費される行」条件(`cid:code-generation:inject-runtime-consumed-lines`)を満たさないため、注入は**実際に評価される式**として置く。

### CI での実行位置

`.github/workflows/ci.yml` の `lint` ジョブ、既存の callsite-guard ステップ(`:119` 実文 `        run: bun tests/callsite-guard.ts --check`)の直後に1ステップとして置く。同ジョブに置く根拠は先例そのもの — `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` のヘッダが記録する再 baseline 事由に「`260729-otel-upstream U7: the lint job's callsite-guard step, placed in the lint job per the E-U7CG-Q1 ruling (guard lives in tests/, CI runs it as one lint step).`」とあり、tests/ に住むガードは lint ジョブの1ステップとして走らせる、という既決の配置規則がある。**S1 はブロッキング**(`lint` は `ci-success` の `needs` に含まれる、`:615-623`)。

## S2: PBT 深掘り実行ジョブ(FR-5)

### 配置(OQ-3 の解決)

`.github/workflows/ci.yml` に **`workflow_dispatch` 限定の非ブロッキングジョブ**を1本追加する。独立 workflow ファイルは新設しない。裁定と代替案は decisions.md ADR-3。

先例(同一ファイル内、HEAD 実測):

```yaml
  # .github/workflows/ci.yml:508-511
  # U4 formal-model-check begin
  formal-model-check:
    name: Formal model check
    if: github.event_name == 'workflow_dispatch'
```

このジョブは `ci-success` の `needs`(`:615-623` = `changes` / `typecheck` / `lint` / `distribution-contract` / `plugin-conformance-e2e` / `tests` / `drift-check` / `coverage`)に**含まれない**。すなわち「ci.yml 内にありながらブロッキング集合外」という形が既に確立している。FR-5b の要求はこの形でそのまま満たせる。

### ジョブ契約

| 項目 | 値 | 根拠 |
| --- | --- | --- |
| ジョブ id | `pbt-deep` | — |
| トリガ | `if: github.event_name == 'workflow_dispatch'` | FR-5a(手動)。ci.yml の `on:` には既に `workflow_dispatch: {}`(`:8`)があるため**トリガ定義の追加は不要** |
| ブロッキング | なし(`ci-success` の `needs` に追加しない) | FR-5b / NFR-5(既存ブロッキング集合を変えない) |
| 実行コマンド | `AMADEUS_PBT_DEEP=1 bun test <新規 PBT ファイル群>` | 対象を新規 PBT に限定し、深掘りの実行時間を有界に保つ |
| 失敗 seed の可視化 | fast-check の既定出力(seed / replay path / 縮小反例)をジョブログへ素通しする。加えて失敗時にステップサマリへ末尾を追記 | FR-5a「失敗 seed をジョブログへ可視化」 |
| 失敗の扱い | loud fail(`continue-on-error` や `\|\| true` は使わない) | `.github/workflows/perf.yml:6-11` が明文化する非ブロッキング loud-fail 契約(実文 `# Non-blocking loud-fail contract:` … `# not an acceptable way to keep this workflow green.`)を同じ姿勢で適用する |
| タイムアウト | `timeout-minutes`(実測ベースで実装段に確定) | 既存2ジョブが値を持つ(`formal-model-check` は `timeout-minutes: 30`、`perf.yml` は 25 で「2x the expected wall clock」の算出根拠を併記)。同じ様式で見積り根拠をコメントに書く |

### 実行 tier との関係(重要な非目標)

`AMADEUS_PBT_DEEP=1` は**環境変数による numRuns の切替のみ**で、テストの tier 所属を変えない。新規 PBT ファイルは `tests/unit/` と `tests/integration/` に置かれ、通常の `--ci`(`tests/run-tests.ts:117`)でも固定 seed・numRuns 100 で走る。したがって `t257-ci-residency-marker-guard` が扱う「CI-resident 自称と実行 tier の乖離」は発生しない。

**現況の実測**: `AMADEUS_PBT_DEEP` は `tests/unit/setup-semver.pbt.test.ts` / `setup-manifest.pbt.test.ts` / `setup-plan-decisions.test.ts` / `t204-audit-escape.pbt.test.ts` の**4ファイルの実装内にのみ**存在し、`tests/run-tests.ts` / `.github/workflows/*.yml` / `package.json` には**1件も無い**(測定: `grep -rn "AMADEUS_PBT_DEEP" --exclude-dir=node_modules --exclude-dir=.git .` の全ヒット16件を確認 — ソース側は上記4ファイルのみで、残る12件は codekb / intent record / requirements の文書)。すなわち深掘り階層は**規約として定義済みだが実行面が一度も存在しなかった**。S2 はその最初の実行面である。この不在は grep で反証確認済み(`cid:requirements-analysis:absence-claim-grep-verify`)。

### ci.yml 編集に伴う既知コスト(実装段の必須手順)

`tests/integration/t-formal-verif-ci-workflow.integration.test.ts` は `tests/fixtures/formal-verif-ci-baseline.sha256` により **ci.yml の formal ジョブ以外の領域**をハッシュでピンしている(同テストのヘッダ実文 `// The baseline SHA pins ci.yml OUTSIDE the three regions normalizedCiBaseline` / `// strips (the formal job block, the workflow_dispatch line, the empty-base` / `// branch), so every sanctioned edit elsewhere in the file re-baselines the` / `// fixture.`)。したがって S1 のステップ追加と S2 のジョブ追加はいずれも:

1. fixture の再 baseline
2. 同テストヘッダの「Recorded re-baselines」リストへ本 intent 分を追記

を伴う。既に3件の先行例(260725-mirror-review-fixes / 260729-otel-upstream U7 / U8 / 260801-open-bug-batch-5)が記録されており、**sanctioned な編集としての手順が確立している**。またジョブを `ci-success` の `needs` に足さないことで、`tests/unit/t222-ci-snapshot-wiring.test.ts` / `tests/integration/t222-ci-snapshot-branch.integration.test.ts` が持つ `ci-success` の `needs` に関するピンは触れずに済む。

## サービスのライフサイクルとスケーリング

常駐サービスは存在しない。S1 は CI ジョブ内の1プロセス(1回の走査 = SCAN_ROOTS のファイル走査)、S2 は手動起動の1ジョブである。architecture.md 現在節「配置と投影の含意」が実測した「テスト側は dist へ投影されない(`find dist -type d -name tests` / `find dist -name "*.test.ts"` ともに 0 件)」により、S1 の実体は正本1本のみで、7 ハーネス分のコピーは生じない — すなわち S1 は投影対象の外にあり、`dist:check` / `promote:self:check` の負担を増やさない。なお引用元 `tests/callsite-guard.ts:70-71` は**明示的に構文木を避けている**(実文 `// Detection. A single linear pass per file, no syntax tree and no type` / `// resolution (performance-design.md: lint-budget, O(files)). Detection leans`)。S1 はこの点で引用元と**意図的に相違する**(AST を使う) — 理由と代償は decisions.md ADR-2 に記録する。水平スケーリング・キャッシュ・サーキットブレーカ等の常駐サービス向け設計は適用しない(`cid:nfr-design:c1`)。

## 実行時間の合否基準(NFR-4)

- PR CI 側: 新規 PBT ファイル群の `bun test` 直接実行の合計が **2秒以内**(requirements.md NFR-4 の確定値。既存 PBT 4本 = 151ms の実測に対する10倍超マージン)。
- 深掘り側: 上限は設けず、`timeout-minutes` で有界化する。非ブロッキングのため PR のリードタイムに影響しない。
- S1 側: 実行時間は既存 `callsite-guard` と同オーダーを目標とし、AST parse への切替による増分を実装段で実測して記録する(SCAN_ROOTS のファイル数分の `ts.createSourceFile`)。実測が lint ジョブの体感を損なう水準なら、走査対象を拡張子と粗い事前フィルタ(`JSON.parse` を含む行が1つも無いファイルの早期スキップ)で削る — この事前フィルタは**述語の判定には使わず**、AST を作る前の足切りにのみ使う(見逃しを作らない)。
