# Build and Test Results — 260821-fmc-retirement

上流入力: `build-instructions.md` / `unit-test-instructions.md` / `integration-test-instructions.md`、`../fmc-retirement/code-generation/code-generation-plan.md`(検証対象の実装計画)、`../fmc-retirement/code-generation/code-summary.md`(builder 報告 §6 の転記元)。検証順序は remote-first(team.md — blocking 検証はリモート CI 正本)。

## Build

| 検証 | 結果 | 測定 ref |
|---|---|---|
| `bun run build` | **exit 0**(promote-self 更新) | conductor tree(merge 20197b425 直後)+ bolt worktree 091e910c8 |
| `bun run typecheck` | **exit 0** | bolt worktree 091e910c8 |
| `bun run lint` | **exit 0** | 同上 |
| `bun run source-only:check` | clean | 同上(builder 報告 §6) |
| `amadeus-graph.ts compile --check` | OK (i)-(v)。slug 33 件中 `tla-authoring`/`formal-model-check` **0 hits** | 同上(conductor 再実測) |
| `amadeus-runner-gen.ts check` | in sync(**30 runners**) | 同上(conductor 再実測) |
| `distribution:check` | OK(458 payloads / 4 docs / 462 files) | builder 報告 §6 |
| `gen-coverage-registry.ts --check` | OK(fresh, guards green, ratchet held) | conductor 再実測 |

## Tests(ローカル実測)

| スイート | 結果 | 測定 ref |
|---|---|---|
| フル `bun run test:ci -- -P 4` | **exit 0 / 1009 files / 0 failed / 13,579 assertions** | bolt worktree、rebase 直前断面(builder 報告 §6、scratchpad testci3.log) |
| coverage-gate 系 targeted 12 ファイル | 184 pass / 0 fail | 同上 |
| 退役系 targeted 8 ファイル | 46 pass / 0 fail | 同上 |
| 新規・変更 6 ファイル(回復テスト 4 + gate unit + t113) | **195 pass / 0 fail** | conductor 再実測(091e910c8) |
| t3028 docs-sync | **12 pass / 0 fail** | bolt worktree(FR-DOC-1 名指し) |

## Coverage(ADR-7 retained basis)

- ローカル再実測: `retained basis delta +0.0978pp` / **exit 0**(current 93.2260% / merge-base retained 93.1283%、CI base artifact 9437939921 = 38289ad1d 断面 100150/106895 と lcov 整合を実読確認)
- 落ちる実証 3 点(code-summary.md 追補 1): 旧赤(−0.5461pp)/新緑(+0.0141pp)の ablated A/B、残存劣化注入(LH+60)で新判定 −0.0481pp 赤 → revert 残渣ゼロ(sha256 4/4 OK)、unit 54 pass

## Remote CI(正本)

| 面 | 結果 |
|---|---|
| PR #3401 round 4(head 091e910c8、run 32459246291) | **全必須 check green**(Patch gate 含む — 行 522 は describeBasis 集約で解消) |
| merge queue(merge group CI) | green(queue 通過の構造的前提) |
| **着地**: squash `596602519daddea1551d65b0b8868eb2cc3cc23d`(2026-08-21T08:09:28Z) | `git merge-base --is-ancestor` で origin/main 祖先を実測 |
| 着地後 main: No Silent Drop Evidence Reconcile / pages | success(main run list 実測)。main push CI は本記録時点で実行中 — 完了確認は summary の申し送りに従う |
| 着地面の実読 | origin/main の `plugins/` に formal-model-check 不在、`specs/` は rfc のみ(ls-tree 実測) |

## 失敗と帰属(発生順)

1. round 1: Patch gate 5 行 = 未使用ヘルパ `recordFixtureVerdict` → 削除(367f54878)
2. round 2: Project gate 相対 −0.6955pp = 高被覆削除の混合効果 → ユーザー裁定 A(ADR-7 ゲート拡張)
3. 新判定でも −0.1741pp = 退役テストが駆動していたコア 182 行の被覆喪失 → 回復テスト 4 本+fixture で回復(091e910c8)
4. round 3: Patch gate 1 行(coverage-project-gate.ts:522)= CLI 専用 ternary 継続行 → describeBasis 集約 + 両分岐 unit 被覆
5. t112 赤 = 自変更由来(scratch runner の import closure 欠落)→ fixture 追補で修正。t435 = 並行 flake(2 回再現せず、cross-job 帰属)
6. 工程上の混入事象(コード外): conductor tree での record commit 時に lefthook `related-unit-tests` のテスト漏出(t209)が共有 git config(`core.bare=true`・`user=t@t`)と worktree HEAD を汚染 → config 復旧・HEAD 復元・汚染著者コミットを tree 同一で再構成(c06cea640)。record/audit/cursor は無傷を実測。恒久対処は Issue 起票候補(申し送り)
