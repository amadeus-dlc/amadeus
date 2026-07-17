# Build and Test Results — standing-delegation-grant

上流入力(consumes 全数): `../standing-grant/code-generation/code-generation-plan.md`、`../standing-grant/code-generation/code-summary.md`

## 実測(測定 ref: bolt worktree head 186593e62 = PR #1147、実行 2026-07-17T07:15:14Z〜07:21:13Z)

| 検証 | コマンド | 結果 |
|------|---------|------|
| 型検査 | `bun run typecheck` | exit 0 |
| lint | `bun run lint` | exit 0 |
| dist ドリフト | `bun run dist:check` | exit 0 |
| self-install ドリフト | `bun run promote:self:check` | exit 0 |
| フル CI | `bash tests/run-tests.sh --ci` | **RESULT: PASS — 60 files / 379 pass / 0 fail / 3 skip**(smoke 15・unit 33/176・integration 9/138・e2e 3/63/2skip)、wall-clock drift 0 |
| 専用スイート | `bun test tests/integration/t-standing-grant.test.ts` | 47 pass / 0 fail(同ターン実測) |
| patch gate | `bun tests/coverage-patch-gate.ts --check` | PASS — 243行 / covered 235 / allowlist 8 / **uncovered 0**(同 head、07:0xZ 実測) |
| project gate | `bun tests/coverage-project-gate.ts --check` | OK — 68.13% / baseline 40.94% / **+27.19pp** |

## 失敗と是正の記録

- gen-coverage-registry FRESHNESS 赤(Major-1 是正で lib 関数目録が変化)→ `bun tests/gen-coverage-registry.ts` 再生成で解消 → 以後 PASS(本結果表は再生成後の再実測)
- 落ちる実証(両側): (i) revoke 判定無効化注入 → 1 fail → 復元 green (ii) pre-fix dist へ checkout → skeleton 素通り RED テスト 1 fail → regen 後 47/47 green

## カバレッジ

lcov は `bun run coverage:ci` 由来(パイプ経由 exit 捕捉なし — no-exit-capture-through-pipe 遵守)。allowlist 8 行は spawn-only CLI 配線行で全行理由付き。

## main 着地後の再接地検証(測定 ref: origin/main a4a33e59a = #1147 a2fea8424+#1149 着地後、実行 2026-07-17T07:24:58Z〜07:30:54Z、repo 外 scratch clone)

| 検証 | 結果 |
|------|------|
| typecheck / lint / dist:check / promote:self:check | すべて exit 0 |
| フル CI(`bash tests/run-tests.sh --ci`) | **RESULT: PASS**、wall-clock drift 0(総括行のみ捕捉 — 件数内訳は bolt head 実測表と同構成) |
| 専用スイート t-standing-grant | **47 pass / 0 fail** |

マージ後の main 上でも機構は全緑 — cross-merge dist drift(#1149 との並行着地面)も dist:check exit 0 で不在を実測。
