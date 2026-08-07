# Code Summary — fix-2352-projectdir-marker

上流入力(consumes 全数): requirements（`inception/requirements-analysis/requirements.md` — 本 unit の唯一の設計正本。FR-1/FR-2/FR-3、AC-1a〜1f、NFR-1〜4 をここから直接スコープした。self-fix scope は units-generation / functional-design 系を SKIP するため unit-of-work.md は不在 = consumes_absent expected:true）

- Unit: fix-2352-projectdir-marker（degrade 単一 unit — Issue #2352）
- Test Strategy: Comprehensive
- トレーサビリティ: 全変更は captured intent（#2352）と requirements.md FR-1 / FR-2 / FR-3 へ遡る。user stories は scope SKIP のため intent 直結。

## 裁定系譜（段順の改訂）

1. **E-PWF-CGDEV**（2-0、案 C）— TDD の Red 実測で「ケース B は in-process 直 import では構造的に Red にならない」ことが判明したため、AC-1a へ検証面の注記を追加。in-process 検証はケース B を祖先形で読み、**逐語形の回帰 pin は FR-2b の t144 更新が担う**。
2. **E-PWF-CGDEV2**（2-0）— marker 段を **env の下**へ移す段順改訂。当初の「env より上」実装が、`CLAUDE_PROJECT_DIR=<temp fixture>` + `cwd=repo` で spawn する既存テスト群の隔離 seam を破り、実 record・memory 層への書込インシデントを起こしたため（conductor が修復済み）。あわせて「hook は marker が env に勝つ」という当初前提が誤りであることも確定（hook で env より上にあるのは payload cwd :317 のみ、hook 自身の `process.cwd()` marker 段 :329-330 は env の下）。本段順は非対称の導入ではなく hook 段2-5 とのパリティ回復。

確定した段順: `explicit → env → cwd-marker → script-path → cwd-harness`

## 変更ファイル

| ファイル | 変更 |
|---|---|
| `packages/framework/core/tools/amadeus-lib.ts` | `resolveProjectDir()` :230-244 — env 段（rung 2）の直後・script-path 段の上へ workspace-marker 段（rung 3）を追加。述語は既存 canonical `findWorkspaceMarkerAncestor(process.cwd())` を再利用（重複定義なし）。説明コメントは新段順に整合させて記述（旧段順の説明は残していない）。**FR-1** |
| 同上 :6683 | stale comment を `AMADEUS_PROJECT_DIR` → `CLAUDE_PROJECT_DIR` へ reword。**FR-3** |
| `tests/integration/t481-resolve-project-dir-worktree-marker.test.ts`（新規） | in-process 直 import の7ケース。**FR-2a** |
| `tests/integration/t144-harness-seam.cli.test.ts` | 段順 doc の更新、test 5 の retitle（cwd harness-dir probe であって workspace marker ではない旨）、**test 5b 新規**（逐語形ケース B の pin）、test 7b の cwd 明示。**FR-2b** |
| `tests/.coverage-registry.json` | 新規テストファイル追加に伴う再生成（`bun tests/gen-coverage-registry.ts`）。 |

`bun run build` で dist / self-install を再生成。tracked ファイルの差分は上記4件のみ（NFR-4 充足）。

## 逐語形ケース B の回帰 pin — t144 が担う（E-PWF-CGDEV 留保 (a)(b)）

AC-1a の逐語形（cwd = marker 保有 worktree × **main 側絶対パスからの lib 読込** × env UNSET → worktree root）は、正本が `packages/framework/core/tools/` にあり親セグメント `core` が `isHarnessDirName`（先頭ドット必須）を満たさないため、in-process 直 import では script-path 段が構造的に到達不能で再現できない。したがって:

- **t481（in-process）** はケース B を**祖先形**で読む（test 2: marker-less な子 dir → worktree root）。
- **t144 test 5b（dist 読み subprocess）** が**逐語形**を pin する — main 側 `<harness>/tools` へ lib を materialize し、cwd を marker 保有 worktree に置いて `resolveProjectDir()` が worktree を返すことを固定。

留保 (b) の指摘どおり、既存 t144 test 4 は cwd=tmp が marker 非保有のため逐語形を pin していなかった。test 5b がそのギャップを埋める。**実証**: テストが読む面（dist）へ marker 段の無効化を一時注入したところ test 5b は `Expected: .../agent-fixture` / `Received: .../main` で赤になり、逐語形の欠陥を実際に捕捉することを確認した（注入は同一セットで即復元、残渣 grep 0 件）。

## C+env は env 勝ちを pin する（AC-1b 改訂）

t481 test 3 と t144 test 5b が、cwd = marker 保有 worktree・`CLAUDE_PROJECT_DIR`=main のとき **main を返す**ことを明示的に pin する。これは意図された現行契約の保存であり:

- **スコープ外**: C+env で worktree を選ばせる経路は本 intent の射程外。
- **受け皿**: `--project-dir` 明示引数（18 ツールで実装済み、梯子の最上位）。
- **恒久解**: #1287（解決順の再設計）へ委譲。
- **loud ガードを入れない根拠**: env 契約への既存依存が広範であるため。実測で、`CLAUDE_PROJECT_DIR=<temp project>` を設定しつつ cwd をリポジトリルート（workspace marker 保有）のままにする idiom がテストコーパス 33 ファイルで使われている。ここに警告や拒否を挟むと、正当な既存利用を大量に壊す。
- なお C+env が開いている境界は現行 hook 梯子（env が cwd-marker 段より上）でも同一であり、本 intent が新設する退行ではない。

## Red / Green 実測

**Red（実装前、t481）** — `bun test tests/integration/t481-...` = 5 pass / 2 fail, exit 1

- test 2（祖先形ケース B）: `Expected: ".../main/.claude/worktrees/agent-fixture"` / `Received: ".../agent-fixture/packages/nested"`
- test 3（当時は C+env で worktree を期待）: `Expected: ".../agent-fixture"` / `Received: ".../main"` — この期待値は E-PWF-CGDEV2 で env 勝ちへ改訂済み。
- test 1（逐語形ケース B、cwd = worktree root）は実装前も PASS。理由は上節のとおり構造的なもの。

**Green（実装後）**

| 検証 | 結果 |
|---|---|
| `bun test tests/integration/t481-resolve-project-dir-worktree-marker.test.ts` | 7 pass / 0 fail, exit 0 |
| `bun test tests/integration/t144-harness-seam.cli.test.ts`（build 後） | 11 pass / 0 fail, exit 0 |
| `bun test tests/unit/t202-... tests/integration/t296-... tests/integration/t230-...` | 19 pass / 0 fail, exit 0（AC-1e: hook 側 無改変 green） |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0 |
| `grep -n "AMADEUS_PROJECT_DIR" packages/framework/core/tools/amadeus-lib.ts` | 0 件（exit 1）— FR-3 |
| `bun run build` 後の `git status` | tracked 差分は上表4ファイルのみ — NFR-4 |

## 汚染ベクタ消滅の閉包実証

段順改訂で隔離 seam が回復したことを、汚染を起こしたクラスのテスト（`tests/integration/t408-practices-promote-latch-gate.test.ts` — `PRACTICES_AFFIRMED` を emit する）1ファイルで実測した。

- テスト結果: **4 pass / 0 fail**（env より上の実装では赤だったファイル）。
- 書込先: 出力 JSON の `team_md` が `/private/var/folders/.../amadeus-test-JRGX2m/amadeus/spaces/default/memory/team.md` — temp fixture 内へ戻っている（実 memory 層ではない）。
- 監査シャード `amadeus/spaces/default/intents/260807-projectdir-worktree-fix/audit/j5ik2o-mac-studio-lan-d13e4f0ca2c0.jsonl`: 実行前後とも **295 行で不変**（rogue イベント 0 件）。
- 併せて `amadeus/spaces/default/memory/team.md` / `project.md` / 本 intent の `amadeus-state.md` の md5 が実行前後で全て不変であることを確認。

## 既知の残課題

- 本 unit の検証は裁定で指定されたテスト集合に限定して実行した（t481 / t144 / t202・t296・t230 / t408）。フルスイート（`bash tests/run-tests.sh --ci`）は段順改訂後には未実行であり、build-and-test 段と PR CI が担う。
- `tests/.coverage-registry.json` の再生成は新規テストファイル追加に伴う定型同期（`cid:code-generation:integration-registry-regen`）。
