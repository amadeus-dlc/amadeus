# code-summary: fix-841-swarm-batch-progress (Bolt FR-1 / Issue #841)

## 対象
Issue #841 (P1/S2-CRITICAL): `tryEmitSwarm` が完了バッチを除外せず静的 `batches[0]` を無条件再提示し、autonomous バッチ進行が進まない。

## 変更ファイル(正本+生成物)
- 正本: `packages/framework/core/tools/amadeus-orchestrate.ts`(`tryEmitSwarm` :1703- とヘッダーコメント、handleReport 内 rationale コメント、呼び出し2箇所)
- 生成物(`bun scripts/package.ts` + `bun run promote:self` で再生成、同一コミット):
  - `.claude/tools/amadeus-orchestrate.ts`, `.codex/tools/amadeus-orchestrate.ts`
  - `dist/claude/.claude/...`, `dist/codex/.codex/...`, `dist/kiro/.kiro/...`, `dist/kiro-ide/.kiro/...`
- 新規テスト: `tests/unit/t211-swarm-batch-progress.test.ts`

## 根本原因
`tryEmitSwarm` が `const firstBatch = batches[0]` を無条件 emit。`bolt_dag.batches` は静的トポロジであり、完了バッチをここで除外しないと `next` のたびにバッチ1を再提示し swarm がバッチを進めない。coverage ledger 基盤(`unitCovered`)は現行にも生きており、喪失していたのは tryEmitSwarm の利用配線のみ(origin: restart-loss、#486 の修正喪失)。

## 元修正との契約同等性(3eca83a56 / #486)と現行適合点
契約(verbatim 移植): batches を順走査 → 各 unit を `unitCovered`(produces 実在)で判定 → 未カバー unit を含む最初のバッチの未カバー unit のみ提示 → 全カバーなら `return false` で all-covered 再入(実ゲート)へフォールバック。

現行適合点(差分再接地):
- `tryEmitSwarm` シグネチャに `recordPrefix: string | null` / `codekbCtx: CodekbCtx` を追加(元修正と同型)。呼び出し2箇所(handleNext currentSlug 経路 / next.slug 経路)は既に両者スコープ内のため引数追加のみ。
- 現行 `unitCovered(projectDir, node, unit, recordPrefix, codekbCtx)` は元修正当時と同一シグネチャ・意味論。そのまま流用。
- 唯一の相違: 元修正は `nodeForCoverage = node` の別名を経由したが、現行は `node` を直接渡す(意味同一)。
- コメント accuracy 更新2箇所(ヘッダー :1691 の「emits batches[0]」、handleReport :2708 の rationale)を本変更に coupled で実施。

## 落ちる実証(RED→GREEN)
t211 を in-process(`handleNext` 直接駆動 + console.log spy)で追加。修正を一時 revert(`batches[0]` 版 + `void recordPrefix/codekbCtx`)して実測:

```
(fail) a: batch 1 covered -> advances to batch 2's units
  expect(received).toEqual(expected)
  -  ["beta"]
  +  ["alpha"]        ← バッチ1再提示(#841 症状)
(fail) b: every batch covered -> no swarm offered
  expect(received).not.toBe("invoke-swarm")
  Expected: not "invoke-swarm"    ← 全カバーでも invoke-swarm
 0 pass / 2 fail
```

修正復元で GREEN: `2 pass / 0 fail`。

## 閉包実測(ruling-premise-closure-verification)
Issue #841 の症状を CLI 境界で verbatim 再現(scratch fixture: 多バッチ DAG `[[alpha],[beta]]`、batch1=alpha covered、autonomous)。spawned `bun amadeus-orchestrate.ts next`:

```
{"kind":"invoke-swarm","units":["beta"]}
```

バッチ1(alpha)は再提示されず、バッチ2(beta)へ進行 → 元症状の非再現を確認。前提不成立の検知なし。

## 同根棚卸し(same-root-inventory)
- `grep -rn "const firstBatch = batches\[0\]" packages/ dist/ .claude/`(node_modules 除く)→ 修正後 0 件(残存は comment 参照のみ)。
- 同型の静的 `batches[0]` 採用は `tryEmitSwarm` 以外に存在しない。
- 元修正 3eca83a56 の他ファイル面: TDD テスト `dev-scripts/evals/swarm-batch-progress/check.ts` は repo restructure で喪失していたことを確認。t211 がその受け入れ基準(バッチ進行契約)を再確立する。t186 test 13 は同じ多バッチ形状を seed するが `kind === "invoke-swarm"` のみ assert し、バグ・修正の双方で green だった穴を t211 が塞ぐ。

## push 前 lcov
追加実行行(1730-1741: for ループ・filter・break・null チェック)の DA hits はすべて > 0(in-process 駆動で spawn-blindspot を回避)。未カバー追加行 0。in-body コメント(1721-1728)は lcov 上 DA エントリを持たない(DA:0 false-red なし)。

## codecov/patch 追対応(PR #867 レビュー指摘)
初回 push で codecov/patch が 93.75%(missing 1行)。conductor が Codecov report API(フル SHA)で miss 行を `packages/framework/core/tools/amadeus-orchestrate.ts:1669`(handleNext の**前進経路** `if (!tryEmitSwarm(next.slug, ...)`)と公式確定。初回 t211(a/b)は Current Stage=code-generation を in-flight にしていたため**再入経路** :1643 のみ駆動し、前進経路 :1669 が in-process 未駆動だった実ギャップ。

対応: t211 に前進経路ケース c を追加。Current Stage=infrastructure-design を完了([x])・code-generation を pending([ ])にし、`next` が code-generation へ前進 → `tryEmitSwarm(next.slug)` が発火する fixture で :1669 を貫通。
- lcov 実測: :1643 hits=88、**:1669 hits=79(初回 0/miss → 解消)**、追加実行行 1730-1741 は引き続き全 DA>0。:1670(emitForSlug フォールバック)は #841 diff 対象外の既存 context 行のため codecov/patch スコープ外。
- 落ちる実証: 新ケース c も修正 revert(`batches[0]` 版)で RED(a/b/c の 3件すべて fail)、修正復元で GREEN(3 pass)。
- 全検証再実行 exit code: typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / complexity-gate 0 / registry --check 0 / t211+t186+t135 = 26 pass 0 fail。
- 本追対応は test-only 変更(正本 core は初回コミットから byte 不変)。dist/self-install は無変更。

## 検証表(最終変更後・全再実行)
| コマンド | exit code |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0(既存の complexity 警告のみ、errors 0。変更2ファイルに新規 error なし) |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0(tryEmitSwarm CCN 15=閾値内、0 new violations / 0 regressions) |
| `bun tests/gen-coverage-registry.ts --check` | 0(fresh, guards green, ratchet held) |
| `bun test t211 + t186 + t207 + t135` | 0(31 pass / 0 fail) |

## 複雑度所見
`tryEmitSwarm` の CCN は修正後 15(gate 閾値=15、>15 が violation のため境界内で PASS)。biome cognitive-complexity は 17(soft-max 15 超の WARN、lint exit 0 で非ブロッキング。orchestrate.ts は main 時点で既に同種警告5件を保持しており house-consistent)。元修正のインライン形状に忠実であることを優先し、ヘルパー抽出は行わなかった(surgical 維持)。

## 逸脱
承認済み要件・設計からの逸脱なし(implementation-deviation-election 対象なし)。

## 成果物
- PR: https://github.com/amadeus-dlc/amadeus/pull/867
- ブランチ: `bolt/841-swarm-batch-progress`(origin/main +1 / -0)
