# Code Summary — Unit issue-evidence-upstream(Bolt 1、#3181)

実装ブランチ: `bolt-issue-evidence-upstream`(base = origin/main `23d4ae767`、6 commits: `530ea8f50`〜`b44fadce3`)。conductor tree へ FF merge 済み・`bun run build` exit 0。builder の一次報告は worktree の `.amadeus-builder-summary.md`(untracked)、本 summary はその conductor 検証済み転記。

## 変更ファイルと規模(git diff --numstat origin/main...HEAD からの転記)

| 区分 | ファイル | +/- |
|---|---|---|
| C1 | `packages/framework/core/tools/amadeus-github-gateway.ts` | +183/−33(readiness の共通化 probeReadiness を含む) |
| C2 | `packages/framework/core/tools/amadeus-utility.ts` | +331/−1(`issue-evidence fetch` verb、renderer、marker parser、deps seam) |
| C3 | `packages/framework/core/tools/amadeus-lib.ts` | +24/−0(`issueEvidencePath` / `relativeIssueEvidencePath`) |
| C6 | `stages/ideation/intent-capture.md` | +30/−0(optional_produces、Step 5 記載、効果測定節 = FR-MEAS baseline 47分の固定) |
| C4 | `stages/inception/requirements-analysis.md` | +7/−1(consumes、Step 2、再導出禁止文、Sensors 列挙同期) |
| C5(U1面) | `stages/inception/reverse-engineering.md` | +13/−2 → 是正後 frontmatter consumes なし・本文 Focus 導出のみ(裁定 `auto-decision-81cb5ecf...`) |
| tests | t3181 系 6 ファイル | +1,065 |
| 台帳・pin | coverage-registry / ratchet / designer-export fixture / t66 / t212 | census 事実として更新(t66: 122→123) |
| docs | `docs/reference/04-stages/{ideation,inception}{,.ja}.md` | 対訳同期 |

合計 +1,733 / −53(21 ファイル)。unit-of-work の枠(〜700 tests 込み)を超過 — 超過はテスト層(エラーパス・落ちる実証の第一級化)と C2 の renderer/atomic write に集中し、機能追加ではない(LOC 較正学習と同型の必須要素超過)。

## TDD・落ちる実証(builder 実測、Red はいずれも実装前に exit 1 を記録)

- 7 slice すべて Red→Green の コマンド+exit code 記録あり(builder summary §2 の表)
- FR-EVD-7/8 の落ちる実証は不可分1セットで実施: 実 dispatcher(`amadeus-sensor.ts fire upstream-coverage`)+出荷 manifest に対し、consumes エントリ除去の注入 → 赤(2 fail)実測 → revert → 残渣ゼロ(`git status --porcelain -- packages/framework/core/` 空)→ 緑(4 pass)
- 是正 commit も TDD: 「frontmatter に宣言しない」regression pin を先に追加し Red(8 pass/1 fail)→ 編集後 Green

## 検証(最終断面、実測 exit code)

| 検査 | 結果 |
|---|---|
| `bun run typecheck` / `bun run lint` | 0 / 0(新規診断なし) |
| targeted テスト(新規6+回帰7ファイル) | 356 pass / 0 fail(是正後再実行 251 pass 含む) |
| `bun run build` + tracked 不変 | 0(投影は untracked) |
| `bun tests/gen-coverage-registry.ts --check` | 0 |
| `bun dist/claude/.claude/tools/amadeus-graph.ts export --check` | 0 |
| complexity-gate ローカル | MEASUREMENT_FAILED(lizard の環境欠損 — ゲート判定不能、CI 正。Biome の複雑度は新規関数に指摘なし) |
| フルスイート・coverage | 未実行(push-first — リモート CI 正) |

## Walking-skeleton demo(即時適用 — conductor 実測)

取込後の conductor tree(self-install 更新済み)から本 intent 自身へライブ実行:

```
bun .claude/tools/amadeus-utility.ts issue-evidence fetch --issues 3181,2415
→ exit 0、amadeus/spaces/default/intents/260817-inception-cost-batch/ideation/intent-capture/issue-evidence.md(105,272 B、2 issue)
```

生成物の実測: メタデータ(fetched-at 2026-08-18T01:34:06Z / repo / tool)、per-issue 節(state・labels 未取得明示・url・target-sha・review-run-id・独立レビュアー2名)、本文 verbatim、`issue-cross-review` marker 9 箇所保持。**取り込み経路の全層(gateway → verb → path resolver → record artifact)が本番データで貫通** — bolt-plan の confidence hypothesis を実証。

## 未検証面(申し送り)

- リモート CI の blocking 集合(フルスイート・coverage gates・complexity・再現性検査)は PR 作成後に実測する — 起動の成立を配送の成立へ昇格させない
- RA/RE が本 artifact を consume する実走(次 intent 以降の実運用面)は効果測定(N=5)の観測対象
