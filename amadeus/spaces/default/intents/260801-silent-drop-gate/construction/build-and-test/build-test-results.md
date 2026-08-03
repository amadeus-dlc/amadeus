# Build Test Results — silent-drop-gate

## 上流成果物と実行対象

4 Unitの `code-generation-plan.md` と `code-summary.md`、および本directoryのbuild／test instructionsを実行証拠の正本とした。full regression、aggregate coverage、focused failure matrix、性能、生成投影を同一実装revision系列で検証した。

## Revisionと証跡

| 項目 | 値 |
|---|---|
| Evidence commit | `4b63c300156e81dd9c42c2979ab88bc2032dfee3` |
| Evidence tree | `119dbdb9a6619530159a9418dd5051c446bb6436` |
| Tested implementation | `d77e0a8fe96fb847d0999c43edf765990ccafbb0`（HEADの祖先） |
| Tested implementation tree | `97068f1bce226bdd09cb575143d23d2be9954963` |
| Manifest SHA-256 | `0fcb3535a7d0b71d4dda8d507ce18532627b10cf541963483b7a8d7826216efc` |
| Registry SHA-256 | `bcfc229d9279a96964b4a7160b6e11ddc3f086f3f45195dd092215a8bc65f3cc` |
| Run artifact SHA-256 | `e80233ddcd7d77349c95a563f446365ec011503cfa65a8440d1634ef5ebb66c9` |
| Bootstrap provenance SHA-256 | `05a318e8f3b4606311edca3e4c8478ab6cd83d582a8298641687d1ad620511d3` |

23 canonical receiptはtested implementation revision、artifact bytes、manifest digestへ再結合し、registry validationを通過した。

## Build結果

| Command | Exit | 結果 |
|---|---:|---|
| `bun run typecheck` | 0 | 本体／test TypeScript pass |
| `bun run lint` | 0 | 380 warnings／23 infos（既存baseline、error 0） |
| `bun run distribution:check` | 0 | 412 payloads、4 docs、416 public files |
| `bun scripts/package.ts --check` | 0 | 7 harness trees in sync |
| `bun run promote:self:check` | 0 | 5 self-install harnesses in sync |
| `git diff --check` | 0 | whitespace error 0 |

## Test結果

| Command群 | Passed | Failed | Evidence |
|---|---:|---:|---|
| Focused unit（6 files） | 129 | 0 | 357 expects |
| Semantic gate／repository adoption／CI structure | 77 | 0 | 283 expects |
| Stop-hook／worktree focused regression | 80 | 0 | 242 expects |
| Final evidence binding | 36 | 0 | 134 expects |
| Performance（2 files） | 4 | 0 | 52 expects |
| Full normal | 10,179 assertions | 0 | 750 files |
| Coverage normal | 10,179 assertions | 0 | 750 files |

Full normalとcoverage normalはいずれもtimeout／failed file 0である。AWS live SDKは期限切れcredential、Claude live substrateは利用不能のため自己skipしたが、repository-local smoke／unit／integrationと派生journeyは成功した。

## Coverage

| Gate | Actual | Status |
|---|---|---|
| Project line coverage | 59,577／65,784 = 90.5646% | PASS |
| Patch (`origin/main...tested implementation`) | measured 2,515、covered 2,509、justified allowlisted 6、uncovered 0 | PASS |
| Allowlist lifecycle | stale 0 | PASS |

6行はBunが親process LCOVへ帰属しないspawn-only adapterまたはruntime-erased行であり、各calleeはin-process、process boundaryはintegration testで検証済みである。未到達7行を検出した初回patch gate後、例外系test追加、実行計測可能な同値整形、期限切れallowlist削除を1回実施し、再計測で閉じた。

## NFR actual

| NFR群 | Actual | Status |
|---|---|---|
| PERF-SG／PERF-RA | cold 5＋warm 5が全15秒未満、suite wall 8.65秒 | PASS |
| SCALE-RA | R0／R2／R4 shrink-only capacity fixture | PASS |
| PERF-TM-05／SCALE-TM | L8 256 stage／256 target、10測定、最大55.193ms、RSS増分20.27 MiB | PASS |
| PERF-MPP／REL-MPP／SEC-MPP | transition、retry、audit、outbox境界をfocused failure injectionで検証 | PASS |
| SEC-SG／SEC-RA／SEC-TM | SAST、symlink、SHA、tampering、malformed／missing targetを検証 | PASS |

## Failure detailsと残存risk

- 解消済み: 初回patch gateの未到達7行。修正ループ1回でuncovered 0、stale 0へ収束した。
- 解消済み: text mutation L8性能証跡の欠落。専用testを追加し、閾値内を実測した。
- 環境差: local hostはmacOS／Apple M4 Maxで、GitHub Actions `ubuntu-latest` と同一ではない。portable failure fixtures、CI event fixtures、full SHA検証はrepository内で成功している。
- Live skip: 外部credential／Claude substrateを必要とするlive testsは未実行。今回の変更対象はrepository-local deterministic coreであり、blocking gateには含めない。
