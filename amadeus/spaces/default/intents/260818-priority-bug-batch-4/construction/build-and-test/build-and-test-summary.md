# Build and Test Summary — 260818-priority-bug-batch-4

depth = Minimal / Test Strategy = Comprehensive。上流入力は 2 unit の `code-generation-plan.md`(step 一覧)と `code-summary.md`(実装申告と Red / Green 証跡)。

## ステータス

| 面 | 状態 | 根拠(実測) |
|---|---|---|
| ビルド | build-ready | `bun run build` exit 0、追跡ファイル不変(`git status --porcelain` 0 行 → 0 行)、`bun run source-only:check` = `source-only boundary: clean` |
| 型・lint | green | `bun run typecheck` exit 0(両 tsconfig)、`bun run lint` exit 0(既存 warning 474 / info 21、error 0) |
| テスト instruction | 5 種生成(unit / integration / performance / security / build) | performance・security は「適用可能な NFR 不在」の判定を根拠と反証条件つきで明記(実体は作らない) |
| Unit 1 `issue-2837-invoke-swarm-context` (#3202) | test-ready | run 32135817142 conclusion `success`、`Failed files: 0 / Failed assertions: 0`(1055 files / 14039 assertions)、Patch gate `PASS` 30/30、Project gate `OK 93.4131%`、rollup SUCCESS 17 / FAILURE 0 |
| Unit 2 `issue-3106-per-unit-outcome` (#3203) | test-ready | run 32137269066 conclusion `success`、`Failed files: 0 / Failed assertions: 0`(1055 files / 14039 assertions)、Patch gate `PASS` 59/59、Project gate `OK 93.4141%`、rollup SUCCESS 17 / FAILURE 0 |
| 台帳 | resync 済み | model-map 実装ハッシュピン(code-generation で実施)、`bun tests/gen-coverage-registry.ts --check` = `OK (fresh, guards green, ratchet held)`(両 worktree) |
| レビュー面 | 未解決 0 件 | 両 PR とも `reviewThreads.totalCount = 0`、`Check unresolved comments` SUCCESS |

**readiness: 両 unit とも build-ready かつ test-ready。** blocking の正本である `ci-success` 集約ジョブが両 PR で green、mergeStateStatus はいずれも `CLEAN`。deployment-ready の判定は本 intent のスコープ外(operation フェーズは SKIP)。

## 本ステージで閉じた赤と残件

開始時点で両 PR の必須 CI が赤だった。3 クラスに切り分け、すべて閉じた。

1. **t425 台帳の陳腐化(自変更由来)** — 7 ハーネス面の prose が `--batch <n>` → `--batch <directive.batch>` へ移行したのに、その文言を pin する `t425` が旧形のまま残り、同一リテラルの不在を主張する `t181` と正面から矛盾していた。7 面 × 9 リテラルの census で新形 7/7・旧形 0/7 を実測し、誤りは台帳側と判定して t425 を resync(コミット `7924e1914`、テストのみ)
2. **t433 の flake** — 同一 run・同一 head の Coverage ジョブでは同テストが pass、ローカルでも 14 pass / 0 fail。ローカル再現や ablation の前に**同一 run の別ジョブとの突合**で帰属を確定。再 push 後の run では再発せず
3. **patch coverage の未カバー 4 行(自変更由来)** — `settledOutcomeHistory` の supersession 読み口が、サブプロセス経由の既存テストではプロセス境界を跨いで親 LCOV から見えていなかった。`handleNext` シームで同じ列を in-process 実行し、読み取りが決める内容(リビジョン番号の採番・無変更時の無追記)を主張するテストを追加(コミット `980cb6b06`、テストのみ)。注入 → 赤(新規テストのみ 1 fail)→ revert 残渣ゼロの 1 セットで落ちる実証を完了

**残件はない。** 実装コード(`amadeus-orchestrate.ts` ほか)は本ステージで一切変更していない — 修正はいずれもテスト側の台帳 resync とカバレッジ経路の追加のみで、承認済み設計からの逸脱は発生していない。

## 詳細

実測の全量(コマンド・exit code・pass/fail 数・ログ逐語の転記)は `build-test-results.md` を参照。ビルド手順は `build-instructions.md`、テスト設計は `unit-test-instructions.md` / `integration-test-instructions.md`、性能・セキュリティの不適用判定は `performance-test-instructions.md` / `security-test-instructions.md` に置いた。
