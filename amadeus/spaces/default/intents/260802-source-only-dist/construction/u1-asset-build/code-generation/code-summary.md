# Code Summary — u1-asset-build

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `scripts/release-dist.ts` | 決定的 ustar+gzip builder、manifest/SHA256SUMS、実 tar 再読取 self-check、資源 guard、CLI を新設 |
| `scripts/package.ts` | canonical な `discoverHarnessNames` を builder から再利用できるよう export |
| `.github/workflows/release.yml` | `build-dist`、artifact upload/download、GitHub Release の files 3点を配線 |
| `tests/unit/t-release-dist.test.ts` | version/schema/archive/digest/fail-closed/capacity の unit tests |
| `tests/integration/t-release-dist-cli.integration.test.ts` | CLI 境界と3 asset生成の integration tests |
| `tests/e2e/t-release-dist.e2e.test.ts` | 隔離2回の byte-identical と3点 round-trip の E2E test |
| `tests/integration/t223-release-bot-bypass.integration.test.ts` | release job DAG、dry-run、App token、asset files 契約を更新 |
| `code-generation-plan.md` | Step/要件 traceability、Comprehensive test strategy、test configuration を記録 |

## 主要判断

1. 生成順序を `tar → tar SHA-256 → manifest → manifest SHA-256 → SHA256SUMS` に固定した。manifest は BR-U1-3 の7フィールドだけを出力し、NFR Review の旧順序・旧拡張フィールドは採用していない。
2. tar は自前の薄い ustar writer で生成し、辞書順、mtime 0、uid/gid 0、空 uname/gname、file 0644、directory 0755、PAXなしを byte 上で固定した。gzip は Bun 1.3.13 の `createGzip({ level: 9 })` を streaming 利用し、header mtime/filename が0である実装を対象テストで byte 比較した。
3. `manifest.harnesses` は `discoverHarnessNames()` と実在する `plugins` root から導出した。ハードコードしたハーネス列挙は production code に置いていない。
4. self-check は生成時の内部カウンタを信用せず、gzip を再展開して ustar header checksum、wrapper、トップ root 集合、fileCount を再導出し、manifest/SHA256SUMS/実 file digest と cross-check する。
5. release workflow は固定 SHA の dist を一度生成してフルテストし、`package.ts --check` の隔離 build を比較対象 B として再現性を検査した後、検証済み dist から asset を生成する。公開権限を持つ GitHub App token は既存 `github-release` job にだけ残した。
6. dry-run は `build-dist` の build/test/upload と `github-release` の download/release を明示スキップする。既存 npm dry-run は変更していない。

## テスト結果

| 区分 | コマンド | Exit / 結果 |
|---|---|---|
| TDD RED | `bun test ./tests/unit/t-release-dist.test.ts ./tests/integration/t-release-dist-cli.integration.test.ts ./tests/e2e/t-release-dist.e2e.test.ts ./tests/integration/t223-release-bot-bypass.integration.test.ts` | exit 1。builder module 不在3件、`build-dist` job 不在1件を実測 |
| Targeted GREEN | 同上 | exit 0。11 pass / 0 fail / 95 expect |
| 故意の失敗注入 | 実 `dist/` から bundle 生成後に tar へ `tamper` を追記して `verifyDistAssets` | exit 1。`release-dist: self-check FAILED — manifest tar digest mismatch` |
| 失敗注入復旧 | 未改変の実 `dist/` bundle を再生成・`verifyDistAssets` | exit 0。`{"kind":"ok"}` |
| TypeScript | `bun run typecheck` | exit 0 |
| Changed-file lint | `bunx @biomejs/biome check scripts/release-dist.ts ...` | exit 0。診断0 |
| Full lint | `bun run lint` | exit 0。既存コード由来 warning 386 / info 23、変更ファイルの新規診断なし |
| Distribution drift | `bun scripts/package.ts --check` | exit 0。7 harness + plugins projection が同期 |

cold timeout は発生せず、`--timeout 120000` による再実行は不要だった。

## 計画逸脱

- 機能・設計上の逸脱なし。計画どおり非循環 digest DAG と BR-U1-3 schema を実装した。
- `apply_patch` の初回実行でツール既定 cwd が割当外 worktree を指すことを検出した。自分が追加した変更だけを直ちに除去し、以降は割当 worktree を `workdir` に固定した `apply_patch` 実行へ切り替えた。割当外で git 操作は行っておらず、最終成果への混入はない。
- GitHub draft Release を使う外部 E2E は、外部状態変更と人間の `workflow_dispatch` 承認を要するため delegated Unit では実行していない。これは plan に事前記載した境界どおりで、u2 と統合する Bolt 1 の出荷判定へ引き渡す。

## 残課題

- u2-installer-asset で、本 Unit の wrapper layout、SHA256SUMS 2行、manifest schema を消費し、draft/prerelease の実 asset から1ハーネスをインストールする Bolt 1 E2E を実施する。
- GitHub hosted Ubuntu runner 上の `build-dist` 実行時間と disk headroom は初回 workflow run で実測する。20分 timeout は停止 guard であり SLO ではない。
