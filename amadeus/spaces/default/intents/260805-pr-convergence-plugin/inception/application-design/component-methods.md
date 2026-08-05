# Component Methods: PR 収束 opt-in プラグイン

上流入力(consumes 全数): requirements、architecture、component-inventory

測定 ref: observed = origin/main `8409c2039c52`。スタイルは project.md DECIDED の functional-domain-modeling-ts(type+コンパニオン、判別 union Result、parse-don't-validate)に従う。

## C1: frontmatter seam bridge

- `parseStageFrontmatterSeams(bytes: Buffer): Result<HostStageSeams, SeamParseError>` — 実ステージ Markdown の frontmatter(`---` 区切り)から SEAM_NAMES 4配列を抽出。frontmatter 不在・YAML 不整合は fail-closed の typed error(無音 null にしない — 既存 `parseHostStageSeams` の null 返しから受理拡張する際、実ステージで parse 失敗した場合は loud)
- `serializeStageFrontmatterSeams(original: Buffer, seams: StageSeams): Result<Buffer, SeamSerializeError>` — 対象4配列のみ書換え、その他バイト保存。**不変条件: parse→serialize の往復 byte-identity(seam 無変更時)**
- 既存 `serializeStageSeams`(合成バイト形)は台帳の canonical byte form として温存(変更しない — t301 が固定済み)

## C3: pr-convergence-predicate.ts

- `type ThreadClass = "resolved" | "outdated" | "replied-unresolved" | "ignored"`(判別 union)
- `classifyThread(thread: ReviewThread): ThreadClass` — FR-3a の4区分。純関数(unit テスト対象)
- `type ConvergenceVerdict = { converged: boolean; violating: { repliedUnresolved: number; ignored: number }; mergeState: "CLEAN" | ... ; mergeableResolution: "resolved" | "unknown-exhausted" }`
- `evaluateConvergence(ledger: ThreadLedger, pr: PrState): ConvergenceVerdict` — FR-3b の単一定義。`mergeStateStatus` 未知値は throw(fail-closed、ADR-2)
- `MERGEABLE_UNKNOWN_RETRY_MAX = 5` / `MERGEABLE_UNKNOWN_RETRY_INTERVAL_MS = 10_000`(ADR-4。retry 駆動は C5 が interval 注入シームで所有)

## C6: pr-convergence-gh-runner.ts(ADR-6 — plugin 内の独立ファイル。C4 が import する)

- `type GhRunner = (argv: string[]) => Promise<Result<string, GhError>>` — plugin 内定義の型(gateway 型を import しない)
- `createGhRunner(): Result<GhRunner, GhReadinessError>` — 生成時に readiness 検査(`gh --version` runnable+`gh auth status --hostname github.com`)。4契約(readiness / argv 配列 / token 非保持 / loud fail)は functional-design で assertion 化しテスト固定(E-PCP-ADDEV 留保の転記)

## C4: pr-convergence-ledger.ts

- `fetchAllReviewThreads(gh: GhRunner, pr: PrRef): Promise<Result<ReviewThread[], GhError>>` — GraphQL `reviewThreads` を `pageInfo.hasNextPage` で全数ページング(FR-4a)。gh 不達・非0 exit は typed error で loud fail(FR-4b、空台帳を返さない)。`GhRunner` は C6 の plugin 内定義型
- `isBotAuthor(author: { __typename: string }): boolean` — `__typename === "Bot"`(静的列挙禁止)
- `buildThreadLedger(threads: ReviewThread[]): ThreadLedger` — severity 転記(FR-3d)・終端処理状態(却下返信+resolve+対応 PR/commit 記載の有無)を機械抽出(FR-4c)。手書き禁止はレポート生成経路が本関数のみを通ることで構造化
- 外部 seam 語彙(reviewThreads / isResolved / comments.author.__typename / mergeStateStatus)は実装前に実 PR で実測確定(A-1)— 実測結果を fixture 化して契約テストに固定

## C5: pr-convergence-cli.ts(verb: status / report / override)

- `status --pr <n>`: 台帳+述語を実行し ConvergenceVerdict を stdout JSON で返す(read-only)
- `report --pr <n> --unit <unit>`: 収束成立時のみ `<record>/construction/<unit>/code-generation/pr-convergence-report.md` を機械生成(FR-2b のパス形)。不成立時は exit 非0+理由(レポートを書かない — fail-closed)
- `override --pr <n> --unit <unit> --reason <text>`: 最新実 HUMAN_TURN への束縛を検証してから `converged: false, override: {...}` 様式のレポートを生成し、audit へ override 事実を emit(ADR-3)。HUMAN_TURN 不在は拒否
- UI-less 出力契約(rough-mockups 代替 — cid:requirements-analysis:ui-less-mockups-as-output-contract): verdict 別の出力文言+exit code(0 = converged / 1 = not-converged(区分件数付き)/ 2 = gh 障害)を本ファイルの機能設計で確定し、テスト文言の導出元とする

## C7: ステージ本文断片

- 工程 (0)〜(5) の手順+トリアージ基準表(2軸判定・3処分・境界規則)+Guardrail(失敗優先・flat comments 禁止・リモート書込み前の承認境界・flake の扱い)を self-contained に記載(FR-5c、出典クレジット: j5ik2o-gh-pr-converge-loop)
- フラグメントの結線様式(fragments seam か stage 追記か)は functional-design で確定

## C9: plugin.json

- `name: "pr-convergence"`、`stages` / `seams`(produces overlay 宣言: target=code-generation, seam=produces, entry=pr-convergence-report)/ `fragments` / `tools`(C3/C4/C5/C6 の4ファイル+import 閉包の全数 — NFR-4)
