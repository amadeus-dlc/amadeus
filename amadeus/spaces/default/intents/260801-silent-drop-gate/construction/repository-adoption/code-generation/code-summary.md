# Code Summary — repository-adoption

## 実装結果

- tested implementation は `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f`、tree は `9e94ea5a28959995342806724a2dd9a28e82709e`。
- immediate evidence-only commit は `ef0f203e3f0eb3267c3d48d548d87aa2151bfa1f`、tree は `1aca2f98bd9a36253e454061c9b3d6aa275d45f6`。その親は tested implementation と一致する。
- current branch への統合 commit は `9ba568205`。tested implementation と evidence-only commit はいずれも `HEAD` の祖先であり、current branch の tree も evidence tree `1aca2f98bd9a36253e454061c9b3d6aa275d45f6` と一致する。
- `tests/run-tests.ts` に独立した `--test-timeout-ms` を追加した。既定値は30,000ms、有効範囲は1〜300,000msで、欠落、非整数、0以下、上限超過は usage error／exit 2 になる。
- full／coverage の normal receipt は exit 0／`pass` だけを受理し、`known-timeout` による成功昇格を廃止した。named isolated は同じ4ファイルと120,000msを使い、normal とともに exit 0 を必須とする。
- filesystem／Git を使う no-silent-drop test 2件を unit から integration へ移し、test-size allowlistを増やさず構造契約へ整合させた。
- missing checkbox mutation は byte不変の fail-loud 契約へ整合し、CI workflow の sanctioned edit baseline を再固定した。
- 既存の evidence binding、symlink拒否、semantic scanner、bootstrap、test contract の全追補commitは tested implementation の祖先である。

## 作成・変更・削除パス

`0f4bccde6` から evidence-only commit までの Unit 差分は次の51パスである。`tests/unit/no-silent-drop-gate.test.ts` は integration への移動により削除された。

```text
.claude/tools/amadeus-mirror-executor.ts
.codex/tools/amadeus-mirror-executor.ts
.cursor/tools/amadeus-mirror-executor.ts
.github/workflows/ci.yml
.kimi-code/tools/amadeus-mirror-executor.ts
.opencode/tools/amadeus-mirror-executor.ts
dist/claude/.claude/tools/amadeus-mirror-executor.ts
dist/codex/.codex/tools/amadeus-mirror-executor.ts
dist/cursor/.cursor/tools/amadeus-mirror-executor.ts
dist/kimi/.kimi-code/tools/amadeus-mirror-executor.ts
dist/kiro-ide/.kiro/tools/amadeus-mirror-executor.ts
dist/kiro/.kiro/tools/amadeus-mirror-executor.ts
dist/opencode/.opencode/tools/amadeus-mirror-executor.ts
packages/framework/core/tools/amadeus-mirror-executor.ts
tests/.coverage-patch-allowlist.json
tests/fixtures/formal-verif-ci-baseline.sha256
tests/integration/no-silent-drop-gate.test.ts
tests/integration/no-silent-drop-repository-adoption.test.ts
tests/integration/t-formal-verif-ci-workflow.integration.test.ts
tests/integration/t233-set-status-retreat-guard.integration.test.ts
tests/integration/t413-no-silent-drop-ci-adoption.test.ts
tests/lib/run-tests-args.ts
tests/no-silent-drop-gate.ts
tests/no-silent-drop/adoption-evidence-manifest.json
tests/no-silent-drop/adoption-evidence.json
tests/no-silent-drop/approval.json
tests/no-silent-drop/ast-scan.ts
tests/no-silent-drop/ast-shape-fixture.ts.txt
tests/no-silent-drop/baseline.json
tests/no-silent-drop/bootstrap-provenance.json
tests/no-silent-drop/bootstrap.ts
tests/no-silent-drop/bootstrap/human-review.json
tests/no-silent-drop/bootstrap/post-approval.json
tests/no-silent-drop/bootstrap/post-approved-evidence.json
tests/no-silent-drop/bootstrap/post-classification.json
tests/no-silent-drop/bootstrap/post-raw.json
tests/no-silent-drop/bootstrap/pre-approval.json
tests/no-silent-drop/bootstrap/pre-approved-evidence.json
tests/no-silent-drop/bootstrap/pre-classification.json
tests/no-silent-drop/bootstrap/pre-raw.json
tests/no-silent-drop/engine.ts
tests/no-silent-drop/evidence/adoption-runs.json
tests/no-silent-drop/exemptions.json
tests/no-silent-drop/ledger.ts
tests/no-silent-drop/model.ts
tests/no-silent-drop/repository-adoption-evidence.ts
tests/no-silent-drop/repository-adoption.ts
tests/perf/no-silent-drop-adoption.perf.test.ts
tests/run-tests.ts
tests/unit/no-silent-drop-gate.test.ts
tests/unit/t-run-tests-perf-tier.test.ts
```

## Canonical evidence と revision binding

| 項目 | 値 |
|---|---|
| Tested revision | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| Tested tree | `9e94ea5a28959995342806724a2dd9a28e82709e` |
| Evidence commit | `ef0f203e3f0eb3267c3d48d548d87aa2151bfa1f` |
| Evidence tree／current tree | `1aca2f98bd9a36253e454061c9b3d6aa275d45f6` |
| Manifest path／SHA-256 | `tests/no-silent-drop/adoption-evidence-manifest.json`／`6085f8efc16589209b7dbeb116f0d61511767a8d2d8df49b60f6af1ed5f9a6c4` |
| Registry path／SHA-256 | `tests/no-silent-drop/adoption-evidence.json`／`9124faf7cbf75ff7732bf600f5f354c0965443b07537faedd6bc0f2b9b591d24` |
| Immutable run artifact path／SHA-256 | `tests/no-silent-drop/evidence/adoption-runs.json`／`2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` |
| Bootstrap provenance path／SHA-256 | `tests/no-silent-drop/bootstrap-provenance.json`／`05a318e8f3b4606311edca3e4c8478ab6cd83d582a8298641687d1ad620511d3` |
| Pre source manifest | `tests/no-silent-drop/bootstrap/pre-raw.json`／`2e2d3e11117b17edb687064290f49b55edfdebfff4b56f29e6919fcc313e1e50` |
| Post source manifest | `tests/no-silent-drop/bootstrap/post-raw.json`／`e1248961236a0e73e7af6c16a66bbc4231240ab429f59e9d242673cf4e750a1b` |
| Census | `227 → 223`、removed 4、added 0 |

Bootstrap の追加literal pathは `tests/no-silent-drop/bootstrap/pre-classification.json`、`pre-approval.json`、`pre-approved-evidence.json`、`post-classification.json`、`post-approval.json`、`post-approved-evidence.json`、`human-review.json` である。各digestは `tests/no-silent-drop/bootstrap-provenance.json` に閉じている。

## 23 receipt ID 対応表

全receiptは artifact の実bytesを再計算して検証される。表の tested revision は同一だが、各行に明示して ID から revision／record／path／digest まで一意に追跡できるようにした。

| Receipt ID | Run／record ID | Binding digest | Immutable artifact path | Artifact SHA-256 | Tested revision |
|---|---|---|---|---|---|
| `shape-fixtures` | primary / shape-fixtures:primary | `c7ef763bbacf64297e33c65bca7a734efe68f7ddee542100c89db9325e564857` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `census-pre` | primary / census-pre:primary | `9bb38e40af323d2a5719dfbb1ff10575ba49d53f1102f74188aa49551c900187` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `census-post` | primary / census-post:primary | `5c2b9f3f72328af39c85a2d88647a0471a993c1fbc5d6a1b876486350a5f6f57` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `classification-precision` | primary / classification-precision:primary | `8a90e63cf839cd4c866c02c9c229442a4057b6641c9da6574e2c80461a003e23` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `baseline-proof` | primary / baseline-proof:primary | `488cddcd6090cdf29dc3ed347effdcd46111d4cba50b70477ece615c8e1a6140` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `failure-matrix` | primary / failure-matrix:primary | `65e195cdd68d970053211d997e68b28ef65b25def9de158a622b63d670b04d5c` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `u2-u3-regressions` | primary / u2-u3-regressions:primary | `adaa074d7c961bfabda7a686ba8e48bf3166350d2b8e407541880a8e56c844be` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `full-test` | normal / full-test:normal<br>isolated-known-timeouts / full-test:isolated-known-timeouts | `068f392001a9d46ac7410197885d588ccfec9d85a1aade00dd7a52f233d39448` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `lint` | primary / lint:primary | `374853dcbff7b452ab93df9aa3a75f15741d855198e07764152d34582b899329` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `typecheck` | primary / typecheck:primary | `ab11cc3b1123b5b17e5f4233a0cbd94b953a576d711f26059a28603bd26bdda8` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `coverage` | normal / coverage:normal<br>isolated-known-timeouts / coverage:isolated-known-timeouts | `a166dcc363dc8b252bfe94f71b0efaa67976c008299cfc9bc95df8892d3f5950` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `cold-warm-5x2` | primary / cold-warm-5x2:primary | `2022d51b5ff46f74b6dd8011a23b17a24bd341d0944abd4b2fb49e5e97228ee3` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `capacity-r0-r2-r4` | primary / capacity-r0-r2-r4:primary | `fe380ac1707f27350d4be96902fc5f4772c12474db7d32d60da3958c8b60c897` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `u1-complexity` | primary / u1-complexity:primary | `6d0b961f3106df8648e9b0ff297633e7333eae9ddf414af2580994bc0d5a3950` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `package-apply` | primary / package-apply:primary | `8ce8c3520455e14e9f002a0a4067f6eca33b4e11cbed79ee598cd7852163912a` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `promotion-apply` | primary / promotion-apply:primary | `ae8249ae15bc9213747f8eb25823995b8e0aa285e1bd79a006a93c368a537fe4` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `package-check` | primary / package-check:primary | `251b3a55d5d519eba7a55ae3afd113b25dd901bb54b579a510874911312d218d` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `promotion-check` | primary / promotion-check:primary | `d033664538e2c309c2c25d529a8085d4085f119f83be99ef586d378bc78e207c` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `event-pr-base` | primary / event-pr-base:primary | `f9a5caed8d4c103ec1590b29028de2f694d54d1448b12f0d0485e9c746e28946` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `event-fork-base` | primary / event-fork-base:primary | `32b1660d11b9b702baf71b89a43b0a4d559e6d63ea302da4dab256e29d4e1cf2` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `event-push-before` | primary / event-push-before:primary | `129dc863646d26a2223637a19508dbd647bb1807ded84fdf873577d25aeb5303` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `hang-deadline` | primary / hang-deadline:primary | `545170af866d403ede46f8271b5262f0ee2fd8cb30f292c065648fcf5575a33e` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |
| `workflow-structure` | primary / workflow-structure:primary | `d82120a1ba649a61841c5f38a2b832975ae24bbc7201ec3abb36fb360ce3439b` | `tests/no-silent-drop/evidence/adoption-runs.json` | `2c663226196e6973d1cfc8110ff954170352cba9330395b247a6dfcfa3e92e8e` | `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f` |

23 ID に対して25 runになる理由は、21 IDが `primary` を1件ずつ持ち、`full-test` と `coverage` がそれぞれ `normal` と `isolated-known-timeouts` の2件を持つためである。`21 + 2 + 2 = 25` で、extra／missing／duplicate runはない。

## Composite gate 実測

| Receipt／run | 実コマンド | C: tested implementation | D: final evidence HEAD |
|---|---|---:|---:|
| full／normal | `bun tests/run-tests.ts --test-timeout-ms 120000 --ci` | exit 0 | exit 0 |
| full／isolated | `bun test --timeout 120000 tests/integration/t227-codex-migration-walking-skeleton.test.ts tests/integration/t-codex-hooks-ownership.test.ts tests/integration/t-codex-hooks-migration.test.ts tests/integration/t-team-up-codex-resume.serial.test.ts` | exit 0 | exit 0 |
| coverage／normal | `bun tests/run-tests.ts --test-timeout-ms 120000 --ci --coverage --coverage-dir coverage` | exit 0 | exit 0 |
| coverage／isolated | `bun test --coverage --timeout 120000 tests/integration/t227-codex-migration-walking-skeleton.test.ts tests/integration/t-codex-hooks-ownership.test.ts tests/integration/t-codex-hooks-migration.test.ts tests/integration/t-team-up-codex-resume.serial.test.ts` | exit 0 | exit 0 |

normal はrunner既定並列度4、isolated は同一4ファイルを同一120,000msで実行した。Cで canonical bundle を一度だけ固定し、4実行が全てexit 0の場合だけ evidence-only commitを作成した。Dはその最終evidence HEADで同じ4実行とregistry validatorを読み取り専用で再実行し、canonical 9ファイルのbytesが前後で不変であることを確認した。

## その他の検証結果

- Registry validator: 23／23 valid。
- Root focused: 101 pass／0 fail／260 expects。
- patch coverage: 138／138 covered、allowlisted 0、uncovered 0。
- project coverage: 89.6262%（56,417／62,947、baseline 40.9395%）。
- cold 5回＋warm 5回: 全sample 15秒未満。
- package apply／promotion apply／package check／promotion check: exit 0。
- `bun run check`: exit 0。typecheck、distribution checks はgreen。lintは既存373 warnings／22 infosで閾値変更なし。
- `bun scripts/package.ts --check`、`bun run promote:self:check`、`git diff --check`: 成功。
- bootstrap census: pre 227、post 223、removed 4、added 0。removedは #1874／#1878 の承認済みidentityだけである。

## 計画との差分と reviewer 指摘の解消

- reviewer iteration 2 の Critical findingに対し、coverage normalを十分な120,000msで再実行してexit 0を取得した。`known-timeout` の成功昇格は型・validator・canonical evidenceから削除した。
- tested revision、tree、evidence commit、その親子関係、current branchへのancestry、pre／post source manifest digestを記録し、最終treeに対するclosed registry検証を追跡可能にした。
- 51変更パス、canonical literal path、23 receipt ID、record ID、binding digest、artifact digest、tested revisionを列挙し、25 runとの差分理由を閉じた。
- Code Generation Plan の各StepへFR／SC／NFR IDを付与し、FR-12 と独立したtest configuration stepを明記した。
