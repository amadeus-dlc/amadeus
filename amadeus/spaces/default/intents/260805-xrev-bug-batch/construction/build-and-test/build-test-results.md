# Build and Test Results — 260805-xrev-bug-batch

測定断面: 本 intent の **6 unit がすべて main へ着地した後**の main（記録 worktree を `origin/main` へ rebase して測定）。
実行日: 2026-08-06。Bun 1.3.13。

## 実行したコマンドと exit code（各コマンド自身の値）

| コマンド | exit | 備考 |
|---|---|---|
| `bun install --frozen-lockfile` | 0 | |
| `bun run build` | 0 | 後続の `git status` に追跡ファイル drift なし |
| `bun run typecheck` | 0 | 2 tsconfig（本体 + tests） |
| `bun run lint` | 0 | warning 433 はベースライン（error 0） |
| `bun run source-only:check` | 0 | 生成物が Git 境界を越えていない |
| `bun run distribution:check` | 0 | mirror 配布契約 |
| `bun tests/gen-coverage-registry.ts --check` | 0 | registry fresh / ratchet 保持 |
| `bun tests/unchecked-cast-guard.ts --check` | 0 | 0 new casts, 35 remaining（shrink-only） |
| **`bun run test:ci -- -P 4`** | **0** | **874 files / 11,651 assertions / Failed 0 / `RESULT: PASS`** |
| `bun run no-silent-drop` | 2 | 下記「既知の非合格」参照 |

## 既知の非合格（1件）: no-silent-drop の `BASELINE_INVALID`

記録ブランチの ledger `previousDigest` が、main の前進に対して stale。**コードの欠陥ではない**:
このゲートは「base のバイト列への束縛」を検査するもので、base が動くたび再束縛が要る設計である。

- 出荷されたコード自体は、6 unit の各 PR の CI で `NO_SILENT_DROP_OK` を確認済み（全 PR 緑でマージ）
- 記録ブランチを PR 化する時点で再束縛すれば解消する
- 本セッション中に同じ toll を 3 回実測した（1本マージするたび残り PR が `BASELINE_INVALID` になる直列制約）

## 受け入れ基準の実測（FR 別）

| 要件 | 実測 |
|---|---|
| FR-1 #2147 | `t245` 36 pass / 0 fail。捏造 invocation・空 transcript 再利用・iteration 束縛・再発行2分岐すべて fail-closed |
| FR-2 #1946 | `t451-election-receipt-stamp` 緑。PR #2275 の CI 13 pass |
| FR-3 #2251 | `t453` 6 pass。未コミット窓で `await-completion`、ERROR_LOGGED 増分 0、壊れた state / 壊れた Goal 成果物は error 経路 |
| FR-4 #2145 | 文書修正。PR #2272 マージ済み |
| FR-5 #1953 | `t402`(unit/integration/corpus) + `t379` = 64 pass。旧世代・無世代の実績は証拠に数えない |
| FR-6 #2112 | `t420` 緑。cast guard の連鎖規則と綴り検出 |
| FR-7 Issue 運用 | 元 issue 6 件すべて CLOSED、`in-progress` ラベル除去済み |

## FR-5d「非0 exit」の名指し経路での実測（前ステージからの申し送り回収）

code-generation の §12a reviewer が FOLLOW-UP として残した「directive → CLI exit の写像未確認」を測定した。

```
$ bun .claude/tools/amadeus-orchestrate.ts report --stage no-such-stage --result approved
exit_code=0
{"kind":"error","message":"Internal: reported stage \"no-such-stage\" is not in the compiled graph …"}

$ bun .claude/tools/amadeus-state.ts approve code-generation
exit=1
{"error":"Stage code-generation is in state 'completed' but command requires one of: awaiting-approval"}
```

**結論**: 拒否の exit code は経路で割れている。state tool は非0、engine の `report` は **exit 0 + error directive**。
FR-5 のガード（SWARM 実績突合）は `report` 経路にあるため、FR-5d の文言「非0 exit」は**そのままでは満たされない**。
満たされているのは「approve が拒否され、状態を一切コミットしない」ことであり、これは実測済み
（`report` 前後で `amadeus-state.md` がバイト一致）。

この食い違いは engine 側の可視性の問題として **[#2376](https://github.com/amadeus-dlc/amadeus/issues/2376)** に起票した
（非対話の呼び出し側が exit code で拒否を検出できない）。要件の文言は state tool 経路の挙動を前提に書かれていた。
