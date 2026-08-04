# Code Generation Summary — evidence-revision-rebind

## 実装結果

承認済み `requirements.md` の FR-1〜FR-8、NFR-1〜NFR-4、AC-1〜AC-12 に基づき、no-silent-drop adoption evidence の pure rebind と main-push reconciliation を実装した。`self-fix` scope により user stories、application design、units generation、各 Construction design artifact は生成されていないため、承認済み要件と Reverse Engineering の実測を直接の入力とした。欠落 artifact の内容は補完していない。

実装・検証が完了したのは `code-generation-plan.md` の Step 1〜8 である。Step 9 の現行 bundle 更新は、実装とテストを commit して clean HEAD を確定した後にだけ実行できるため、親セッションへ引き継ぐ。

## 作成・変更ファイル

| ファイル | 変更内容 |
| --- | --- |
| `tests/no-silent-drop/repository-adoption-evidence.ts` | receipt digest の正準計算を `evidenceDigestForEntry()` として共有し、既存 validator と rebind の定義差を除去した。 |
| `tests/no-silent-drop/evidence-rebind.ts` | 3層 bundle の決定的変換、正準 validator を用いた隔離候補検証、件数集計、原子的置換と rollback、共通 JSON envelope、secret redaction を実装した。 |
| `scripts/no-silent-drop-evidence-adapter.ts` | Git trust 境界、関連 PR の全 page 解決、2段階 tree 証明、3 path allowlist、focused validation、commit、remote-tip guard、fast-forward push を実装した。 |
| `scripts/no-silent-drop-evidence.ts` | `rebind`／`reconcile` CLI、安定した status／code、stdout 1行 JSON+LF、rollback と staged index 復旧を実装した。 |
| `.github/workflows/no-silent-drop-evidence-reconcile.yml` | `main` push 専用で CI 成功条件から独立した reconciliation workflow を追加した。既存 GitHub App credential、有限 timeout、安定 concurrency を使用する。 |
| `tests/unit/t427-no-silent-drop-evidence-rebind.test.ts` | 24／24／25 revision、25 artifact、23 receipt、正準不動点、冪等性、tamper、schema／I/O、transaction、4 status envelope を検証した。 |
| `tests/integration/t427-no-silent-drop-evidence-reconcile.integration.test.ts` | 実 Git repository で pure trust 境界、squash identity proof、全 negative tree 差分、rollback、commit／push／credential／stale 競合を検証した。 |
| `tests/integration/t427-no-silent-drop-evidence-workflow.integration.test.ts` | workflow の main-only、最小権限、CI 非依存、有限 timeout、直列化、CLI 境界を構造検証した。 |
| `code-generation-plan.md` | Step 1〜8 を完了へ更新し、clean HEAD が必要な Step 9 を未完了のまま維持した。 |

## 主要な実装判断

1. rebind の candidate はメモリで生成した後、一時 repository root に3層と参照 artifact を配置し、既存 `validateEvidenceRegistry()` で完全検証してから正本へ適用する。digest 定義と validator を複製しない。
2. pure rebind は local branch にattachedな `target === clean HEAD`、reconcile はdetached checkoutも許容する `event === clean HEAD` とし、trust 境界を分離した。
3. reconcile は現行 binding が event に対して到達可能・整合済みなら revision 不一致でも no-op とする。到達不能時だけ、関連 merged PR の一意解決、binding→PR head の派生3 path除外 recursive tree 一致、PR head→landing の root tree 一致を順に要求する。
4. bundle の適用と rollback は同じ一時ファイル／backup／rename transaction を用いる。commit 前の失敗では working tree に加えて staged index も復旧する。
5. push は remote `main` tip を commit 前と push 前に再確認し、stale run は force／retryせず `superseded` とする。
6. workflow shell は3層計算を持たず、CLI の1行 envelope を job summary に転送し、CLI の exit codeを維持する。

## 要求駆動の negative coverage

| 要求境界 | 検証した拒否ケース |
| --- | --- |
| pure rebind | abbreviated／未解決 SHA、ancestor target、detached HEAD、dirty index、dirty working tree |
| 3層完全性 | revision-only、artifact bytes、manifest digest、receipt digest、malformed schema、missing artifact、途中書込み失敗 |
| 関連 PR 解決 | 0件、複数、pagination shape不正、base不一致、merge SHA不一致、credential／transport失敗、PR ref取得不能 |
| 2段階 tree 証明 | binding非祖先、非派生 add／rename／mode／object type／1 byte差分、landing base drift |
| 収束と書込み | focused validation失敗、commit失敗時のindex／worktree復旧、stale remote tip、push失敗時のremote不変、rebind commit pushのno-op、CLI前のcredential／checkout／preflight失敗summary |
| JSON契約 | 4 statusの同一 field集合と型、UTF-8、単一行+LF、exit code、secret非露出、実CLIの成功／入力エラーstdout境界 |

要件に列挙された未実装 negative はない。追加の任意ケースへ範囲を広げる必要はなく、コード実装に関する BLOCKER はない。

## 検証結果

- focused test: `26 pass / 0 fail / 203 expect`。
- typecheck: `bun run typecheck` は exit 0。
- 対象7 TypeScriptファイルの Biome: warning／errorなし。
- repository lint: `bun run lint` は exit 0。表示された `403 warnings / 12 infos` は既存ベースラインであり、対象限定検査には現れていない。
- 3つの現行 evidence ledger に本ステージで差分がないことを確認した。

既存 no-silent-drop repository adoption と `t413` の先行実行は `36 pass / 3 fail` だった。2件は gate が exit 2、1件は現行 binding revision が現在の HEAD の祖先でない失敗であり、いずれも Step 9 前の stale bundle による既知状態である。実装コードの focused test、typecheck、lint の失敗ではない。

## 計画との差分と引継ぎ

- test runner／TypeScript 設定は既存の自動検出で足りるため、`package.json`、`tests/run-tests.ts`、`tsconfig*.json` は変更していない。
- API、database、frontend、IaC、`dist/`、self-install surface は本 Unit の対象外であり変更していない。
- Step 9 は未実行である。親セッションは実装・テスト・記録を先に commitして clean HEAD を確定し、その実測 SHA を `rebind --target-revision` へ渡す。その後、差分が3 ledgerだけであることを確認して evidence-only commit とし、`t413` 10 pass、gate、全回帰、coverage、着地後 workflow を検証する。
