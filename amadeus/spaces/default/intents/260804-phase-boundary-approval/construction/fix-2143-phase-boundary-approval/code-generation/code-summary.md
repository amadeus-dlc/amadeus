# Code Summary — fix-2143-phase-boundary-approval(Issue #2143 + #2232)

ブランチ: `bolt/2143-phase-boundary-approval`(base `b938898f3`)。
計画: 同 dir `code-generation-plan.md`(裁定 D-1 / D-2 / D-3 を含む)。

---

## 1. Slice 毎の Red / Green 実測

### S1 — FR-2 drift 検査 + FR-1 正順記述の横展開

**Red**

```
$ bun test tests/unit/t-harness-approval-order-contract.test.ts
 1 pass
 2 fail
```

失敗の中身(実出力):

```
every skill-bearing SKILL.md states the phase-boundary artifact order
+ "claude: directive field `phase_boundary`, artifact fragment `phase-check-`, ordering phrase (...)"
+ "codex: ..."   + "kiro: ..."   + "kimi: ..."   + "kiro-ide: ..."

every skill-bearing SKILL.md routes await-advisory-choice through the record subcommand
+ "claude: `amadeus-advisory-choice.ts record` invocation, `--advisory-instance` flag, `--choice` flag"
+ "codex: ..." + "pi: no await-advisory-choice contract at all" + "kiro: ..." + "kimi: ..." + "kiro-ide: ..."
```

pi のみが順序契約を記述していたという RE の結論が、機械検査で独立に再現した。あわせて **pi は `await-advisory-choice` directive を SKILL.md に一切記述していない**という未報告のギャップが出た(directive 8種しか列挙していなかった)。

**Green(FR-1 実装後、S5 未着手時点)**

```
$ bun test tests/unit/t-harness-approval-order-contract.test.ts
 2 pass
 1 fail        # advisory 経路は S5 で解消
```

**最終 Green(S5 後、integration 層へ移設済み)**

```
$ bun test tests/integration/t-harness-approval-order-contract.test.ts
 3 pass  0 fail
```

### S2 — FR-3 production-path test

**初回実行(fixture 投入直後)**

```
$ bun test tests/unit/t-phase-check-gate-seam.test.ts
 23 pass
 1 fail
(fail) a non-boundary approve is not gated (#2143 negative control)
       > approving a mid-phase stage succeeds with no phase-check artifact on disk
       expect(r.threw).toBe(false)  →  Received: true
```

原因はテスト側の誤り(feasibility の declared produces は `feasibility-report` ではなく `feasibility-assessment`)。修正後:

```
$ bun test tests/unit/t-phase-check-gate-seam.test.ts
 24 pass  0 fail        # 既存 16 + 新規 8
```

**NFR-4 の落ちる実証(mutation probe)** — `verifyPhaseCheckArtifact` の先頭に `return;` を注入して再実行:

```
$ bun test tests/unit/t-phase-check-gate-seam.test.ts
 14 pass
 10 fail
(fail) ... approve at the ideation→inception boundary (#2143) > refuses the approve when phase-check-ideation.md is absent
(fail) ... approve at the construction→operation boundary (#2143) > refuses the approve when phase-check-construction.md is absent
(fail) ... boundary detection follows the effective in-scope stage (#2143 FR-3c) > the guard fires on the effective final in-scope inception stage
(既存 #886 の 6 ケースも同時に赤化)
```

新規の境界テストは全て変異で赤くなり、**負の対照(非境界 approve)だけは緑のまま**だった。ガードが無条件に発火しているのではないことがこれで裏取りできている。注入は probe 後に復元済み。

### S3 — FR-4 autonomy `full` × phase boundary

**初回実行**

```
$ bun test tests/integration/t-autonomy-phase-boundary-artifact.integration.test.ts
 2 pass  0 fail
```

ガード自体は C-1 で不変なので、この交差は「実装の追加で緑になる」形の Red を持たない。代わりに mutation probe で落ちることを実測した:

```
# verifyPhaseCheckArtifact を no-op 化して再実行
 1 pass
 1 fail
(fail) autonomy full × phase boundary ... > an auto-approved boundary is refused when the phase-check artifact is absent
```

このテストは `AMADEUS_SKIP_ARTIFACT_GUARD` を明示的に env から削除し、`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD=0`(= presence guard 有効。`amadeus-lib.ts:4900` は `"1"` のみを off-switch として扱う)で走らせている。したがって2件目の approve が成功しているという事実そのものが、**承認権限が test carve-out ではなく実在の `full` Intent grant から来ている**ことの証拠になっている。

### S4 — FR-5 `record` サブコマンド

**Red**

```
$ bun test tests/integration/t-advisory-choice-record.test.ts
 0 pass
 1 fail
 1 error
SyntaxError: Export named 'recordAdvisoryChoiceDecision' not found in module
  '.../packages/framework/core/tools/amadeus-advisory-choice.ts'
```

**Green**

```
$ bun test tests/integration/t-advisory-choice-record.test.ts
 15 pass  0 fail
```

**既存経路の非退行(FR-5c)**

```
$ bun test tests/integration/t-advisory-human-choice-boundaries.test.ts \
           tests/integration/t-advisory-human-choice-domain.test.ts \
           tests/unit/t203-mint-presence-classify.test.ts tests/unit/t113.test.ts
 102 pass  0 fail
```

### S5 — FR-5e conductor 手順

S1 の3本目のアサーションが Red のまま残っていたものを、skill-bearing 6面の `await-advisory-choice` 記述改訂で緑にした(上記 S1 最終 Green)。

---

## 2. FR-6 既存テスト契約の改訂表

| 対象 | 改訂前 assert | 改訂後 assert | 理由 |
|------|--------------|--------------|------|
| `tests/unit/t-phase-check-gate-seam.test.ts` の既存16ケース | — | **変更なし** | ガードは C-1 で不変。追加は新規 describe 4本(8ケース)と `seedProduces` ヘルパのみ。既存 assert に手を入れていない |
| `tests/integration/t-advisory-human-choice-boundaries.test.ts` / `-domain.test.ts` | — | **変更なし** | `record` は既存 `recordProtectedAdvisoryChoice` / `hasMatchingAdvisoryPresentation` / `choiceFromExactPrompt` を一切書き換えずに並置した別経路。102件が無改訂で green |
| `tests/integration/t-coverage-mechanism-ratchet.test.ts` | `EXPECTED_NONE_TO_CLI` に `integration/t-advisory-choice-record.test.ts` を含まない | 同エントリを追加 | 新規テストが CLI を spawn するため。この配列はファイル自身が「新しい spawn テストは人手の編集なしに cli 面を変えられない」ための意図的な ratchet であり、追記が正規の手順 |
| `tests/.coverage-registry.json` | `amadeus-state approve` の `coveredBy` に FR-4 テスト無し | `bun tests/gen-coverage-registry.ts` で再生成(4行追加) | 生成物。手編集していない |
| `packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide}/skills/amadeus/SKILL.md` の `await-advisory-choice` 行 | 「The protected presentation binds only the next real human turn; after a detour, re-run `next` and present again.」「On the answer turn, re-run `next`; the trusted hook owns the receipt.」 | 「On the answer turn ... run `... record --advisory-instance ... --choice ...` once per answered instance, then re-run `next`.」+ 冪等・fail-loud の説明 | **これが #2232 の中核の契約変更**。隣接順序(detour で提示が失効する)という前提そのものが無音破棄の原因なので、それを指示する文を残したままにはできない。hook 経路は後方互換として動き続けるが、conductor に対する正典の手順は `record` になる |

---

## 3. 実装の要点

### FR-5 `record`(`packages/framework/core/tools/amadeus-advisory-choice.ts`)

- 追加した公開 API: `recordAdvisoryChoiceDecision(projectDir, advisoryInstance, choice, now?)` と型 `AdvisoryChoiceRecordResult`。
- 内部ヘルパ 4 本: `hasRecordedAdvisoryPresentation`(隣接要求を「提示が記録済みであること」へ緩和)、`latestHumanTurn`、`activeReceiptFor`、`freshRecordRefusal`、`resolveRecordTarget`。
- 維持した provenance 保証: shard 一致 / `isGroundedHumanTurn` / 同一 HUMAN_TURN の二重消費拒否 / `acceptsFreshChoice`。**落としたのは隣接順序だけ**で、それは detour で壊れるくせに他の4条件が守っていないものを何も守っていない。
- 裁定 D-1 の冪等: 同一 choice の再実行は保存済み receipt を返して store に追記しない。異なる choice は `already recorded with a different choice` で拒否。
- CLI: `record` と既存 `correct-misattributed` を1つの `import.meta.main` ブロックで分岐。成功は1行 JSON + exit 0、拒否は理由付き stderr + exit 1。

### FR-1 / FR-4 の文言

- 5ハーネスの SKILL.md に `**Phase boundary (\`directive.phase_boundary\`).**` 段落を `**Per-unit iteration**` の直前へ挿入。codex / kimi にはさらに「これは annex の直接 report 契約の**前提条件**であって置き換えではない」の一文を付した(C-2 / 順序循環の回避)。
- pi は順序段落を既に持つため、追加したのは `await-advisory-choice` の bullet のみ。
- `stage-protocol.md` の HARD STOP RULE 節に、`autonomy_auto_approve` + `phase_boundary` の交差で artifact を先に書く旨を追記。

---

## 4. 検証結果一覧(exit code)

| コマンド | exit |
|---------|------|
| `bun run build`(`dist` + `promote:self`) | 0 |
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run distribution:check` | 0 |
| `bun run source-only:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0(`complexity gate: OK — 0 new violations, 0 regressions`) |
| `bun tests/run-tests.ts --ci` | 0(**Test files 821 / Failed files 0 / Total assertions 10800 / Failed assertions 0**) |
| `bun tests/no-silent-drop-gate.ts check --base-revision <origin/main>` | **2 — 未解決(下記)** |

TLA model map は不変(`amadeus-state.ts` および election 系に触れていない)。`dist/` / `.claude/` は git 管理外の生成物で、`bun run build` により再生成済み(C-3)。

### 途中で解消したゲート4件(いずれも新規テストファイル追加に伴う台帳更新)

1. `t-test-size-drift` — 新規 FR-2 テストが `node:fs` を触るため測定サイズ medium となり、unit 層の上限 small に抵触した。**NFR-3 は FR-2 の検査を unit 層に置くと述べていたが、リポジトリのサイズ分類がそれを許さない**ため、同種の文言契約ガードである `t368-phase-check-name-contract` の前例に倣い `tests/integration/` へ移設し `// size: medium` を宣言した。この差異は意図的な逸脱として記録する。
2. `t134-mechanism-honesty` / `gen-coverage-registry` — `bun tests/gen-coverage-registry.ts` で再生成。
3. `t-coverage-mechanism-ratchet` — 上表のとおり `EXPECTED_NONE_TO_CLI` に1行追記。

---

## 5. 未解決事項

- **no-silent-drop ledger の rebind が必要(本変更とは無関係)**。`bun tests/no-silent-drop-gate.ts check --base-revision <sha>` が `BASELINE_INVALID: current baseline previousDigest does not bind the trusted base bytes` を返す。base commit `b938898f3` を**素の detached worktree に checkout して同じコマンドを走らせても同一エラーが再現する**ため、本 Bolt の変更が原因ではなく、base 側で既に台帳が base bytes へ束縛できていない状態にある。rebind は台帳へ証跡を刻む意図的な操作なので、本 Bolt では実行せず conductor の判断に委ねる。
- **pi の `await-advisory-choice` 欠落は元々の欠陥**だった(directive 8種しか記述がなく、9種目を conductor が知らない状態)。FR-5e の範囲として bullet を新設したが、pi の directive 一覧が engine の emit 種別と機械的に照合されていないこと自体は残る(FR-2 のテストは `await-advisory-choice` の存在は見るが、9種全部の網羅は見ていない)。follow-up 候補。
- `t-harness-approval-order-contract` の unit → integration 移設は NFR-3 の記述からの逸脱(§4 に理由を記載)。

---

## 6. 触ったファイル(最終)

正本:
- `packages/framework/core/tools/amadeus-advisory-choice.ts`
- `packages/framework/core/amadeus-common/protocols/stage-protocol.md`
- `packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide,pi}/skills/amadeus/SKILL.md`

テスト:
- 新規 `tests/integration/t-harness-approval-order-contract.test.ts`
- 新規 `tests/integration/t-advisory-choice-record.test.ts`
- 新規 `tests/integration/t-autonomy-phase-boundary-artifact.integration.test.ts`
- 新規 `tests/fixtures/state-ideation-boundary.md`, `tests/fixtures/state-construction-boundary.md`
- 追記 `tests/unit/t-phase-check-gate-seam.test.ts`
- 台帳 `tests/integration/t-coverage-mechanism-ratchet.test.ts`, `tests/.coverage-registry.json`
