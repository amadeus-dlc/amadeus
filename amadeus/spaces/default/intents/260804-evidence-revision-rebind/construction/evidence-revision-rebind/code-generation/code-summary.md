# Code Generation Summary — evidence-revision-rebind

## 実装結果

承認済み `requirements.md` の FR-1〜FR-8、NFR-1〜NFR-4、AC-1〜AC-12 に基づき、no-silent-drop adoption evidence のpure rebindとmain-push reconciliationを実装した。`self-fix` scopeによりuser stories、application design、units generation、各Construction design artifactは生成されていないため、承認済み要件とReverse Engineeringの実測を直接の入力とした。欠落artifactの内容は補完していない。

`origin/main` の `12bf94ea6d7e13a03e124036258a683af3cc8e7e` へrebaseした後、実装・異常系coverage・監査をclean HEAD `bef16a27fb1d2ae4c025816b7565ed88a637ec1e` まで確定し、そのSHAへ3層bundleをpure rebindした。evidence-only commitは `41835d4dcc9e0ad5a0979ff248eaada0bdb626bf` であり、同commitをevent revisionとしたreconcileは `REBIND_NOOP`、`targetRevision=null`、validation `ok=true` で閉じた。

## 作成・変更ファイル

| ファイル | 変更内容 |
| --- | --- |
| `tests/no-silent-drop/repository-adoption-evidence.ts` | receipt digestの正準計算を `evidenceDigestForEntry()` として共有し、既存validatorとrebindの定義差を除去した。 |
| `tests/no-silent-drop/evidence-rebind.ts` | 3層bundleの決定的変換、正準validatorを用いた隔離候補検証、件数集計、原子的置換とrollback、共通JSON envelope、secret redactionを実装した。未使用だった `receiptIdsFromRegistry()` はcoverage closure時に削除した。 |
| `scripts/no-silent-drop-evidence-adapter.ts` | Git trust境界、関連PRの全page解決、2段階tree証明、3 path allowlist、focused validation、commit、remote-tip guard、fast-forward pushを実装した。 |
| `scripts/no-silent-drop-evidence.ts` | `rebind`／`reconcile` CLI、安定したstatus／code、stdout 1行JSON+LF、rollbackとstaged index復旧を実装した。 |
| `.github/workflows/no-silent-drop-evidence-reconcile.yml` | `main` push専用でCI成功条件から独立したreconciliation workflowを追加した。既存GitHub App credential、有限timeout、安定concurrencyを使用する。 |
| `tests/integration/t427-no-silent-drop-evidence-rebind.integration.test.ts` | 24／24／25 revision、25 artifact、23 receipt、正準不動点、冪等性、tamper、schema／I/O、transaction、4 status envelope、CLI入力異常系を検証した。 |
| `tests/integration/t427-no-silent-drop-evidence-reconcile.integration.test.ts` | 実Git repositoryと決定的command portでpure trust境界、squash identity proof、全negative tree差分、rollback失敗、binding競合、commit後／push時競合を検証した。 |
| `tests/integration/t427-no-silent-drop-evidence-workflow.integration.test.ts` | workflowのmain-only、最小権限、CI非依存、有限timeout、直列化、CLI境界を構造検証した。 |
| `tests/no-silent-drop/adoption-evidence.json`、`adoption-evidence-manifest.json`、`evidence/adoption-runs.json` | clean HEAD `bef16a27…` へ決定的に再bindした3つの派生証跡。個別手編集は行っていない。 |

## 主要な実装判断

1. rebind候補はメモリで生成した後、一時repository rootに3層と参照artifactを配置し、既存 `validateEvidenceRegistry()` で完全検証してから正本へ適用する。digest定義とvalidatorを複製しない。
2. pure rebindはlocal branchにattachedな `target === clean HEAD`、reconcileはdetached checkoutも許容する `event === clean HEAD` とし、trust境界を分離した。
3. reconcileは現行bindingがeventに対して到達可能・整合済みならrevision不一致でもno-opとする。到達不能時だけ、関連merged PRの一意解決、binding→PR headの派生3 path除外recursive tree一致、PR head→landingのroot tree一致を順に要求する。
4. bundleの適用とrollbackは同じ一時ファイル／backup／rename transactionを用いる。commit前の失敗ではworking treeに加えてstaged indexも復旧し、rollback自体の失敗は `REBIND_ROLLBACK_FAILED` として元エラーより優先して報告する。
5. pushはremote `main` tipをcommit前とpush前に再確認し、stale runはforce／retryせず `superseded` とする。
6. workflow shellは3層計算を持たず、CLIの1行envelopeをjob summaryへ転送し、CLIのexit codeを維持する。

## 要求駆動のnegative coverage

| 要求境界 | 検証した拒否ケース |
| --- | --- |
| pure rebind | abbreviated／未解決SHA、ancestor target、detached HEAD、dirty index、dirty working tree、重複／欠落option |
| 3層完全性 | revision-only、artifact bytes、manifest digest、receipt digest、malformed schema、missing artifact、途中書込み失敗、file／index rollback失敗 |
| 関連PR解決 | 0件、複数、pagination shape不正、base不一致、merge SHA不一致、credential／transport失敗、PR ref取得不能 |
| 2段階tree証明 | binding非祖先、非派生add／rename／mode／object type／1 byte差分、landing base drift、reconcile中のbinding変更 |
| 収束と書込み | focused validation失敗、commit失敗時のindex／worktree復旧、commit前／commit後／push時のstale remote tip、push失敗時のremote不変、rebind commit pushのno-op |
| JSON契約 | 4 statusの同一field集合と型、UTF-8、単一行+LF、exit code、secret非露出、exported mainのin-process境界 |

要件に列挙された未実装negativeはない。追加の任意ケースへ範囲を広げず、production codeへtest専用分岐を追加していない。

## 検証結果

- pure rebind: revision field `24 / 24 / 25`、artifact digest `25`、receipt digest `23`、変更pathは派生3ファイルだけ。
- focused test: `83 pass / 0 fail / 331 expect`。`t413` は `10 pass / 0 fail`。
- no-silent-drop gate: trusted base `12bf94ea6d7e13a03e124036258a683af3cc8e7e` に対して `NO_SILENT_DROP_OK`。
- `bun run typecheck`: exit 0。
- `bun run lint`: exit 0。repository既存の `407 warnings / 12 infos` のみで、変更3 TypeScriptファイルの限定Biomeはwarning／errorなし。
- `bun run distribution:check`: 412 payload、4 docs／44 topics、416 public projectionがすべてPASS。
- `bun run test:ci`: rebase後の実装時点で796 files／10,713 assertions／0 fail。coverage closure後の最終HEADは同じCI集合を `bun run coverage:ci` で796 files／10,718 assertions／0 fail。
- project coverage gate: `91.4352%`（baseline `40.9395%`、`+50.4957pp`）。
- patch coverage gate: added lines `812 / 812` covered、allowlist `0`、uncovered `0`。
- reconcile: event `41835d4d…`、binding `bef16a27…`、`REBIND_NOOP`、validation `ok=true`。

## 計画との差分と残作業

- test runner／TypeScript設定は既存の自動検出で足りるため、`package.json`、`tests/run-tests.ts`、`tsconfig*.json` は変更していない。
- API、database、frontend、IaC、`dist/`、self-install surfaceは本Unitの対象外であり変更していない。
- `tests/unit/t427-no-silent-drop-evidence-rebind.test.ts` の新設案は、実際のfilesystem／CLI境界を扱うため既存のintegration命名規則へ合わせ、`tests/integration/t427-no-silent-drop-evidence-rebind.integration.test.ts` として実装した。
- AC-6のPR内fixture／workflow contractは完了している。最新main tip上の実 `CI Success` とbot rebind commitの観測は、main着地後にのみ可能な最終受入確認として残る。
