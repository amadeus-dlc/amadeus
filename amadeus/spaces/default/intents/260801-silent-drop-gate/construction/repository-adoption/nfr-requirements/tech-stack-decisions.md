# Tech Stack Decisions — repository-adoption

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とし、no-silent-dropを既存repository、CI、distributionへ採用する技術判断を固定する。

## 決定一覧

| ID | 決定 | 理由 |
| --- | --- | --- |
| TS-RA-01 | RuntimeはBun 1.3.13、U1のroot `bun run no-silent-drop`を唯一のgate entrypointとする | localとCIのalgorithm／exit contractを一つに保つ |
| TS-RA-02 | CIは既存 `.github/workflows/ci.yml` のlint jobへ独立blocking stepを1件追加する | 新規jobやrequired-check変更を作らず既存CI Successへ接続する |
| TS-RA-03 | checkoutはfull history、base SHAはGitHub event payloadのfull SHAを使う | `git show`のtrusted previous objectを決定的にmaterializeする |
| TS-RA-04 | outer deadlineはUbuntu runner標準GNU `timeout --signal=TERM --kill-after=5s 30s`、no-silent-drop stepだけの `timeout-minutes` は1分 | hangを124／137のblocking failureへ閉じ、既存lint job全体のtimeoutと15秒性能合否を変更しない |
| TS-RA-05 | evidence／ledger schema、GitReadPort、ratchet、bootstrap validatorはU1実装を再利用する | U4でschemaやpolicy algorithmを複製しない |
| TS-RA-06 | hashはBun／Node標準crypto SHA-256、AST engineはexact `@ast-grep/cli` 0.45.0、Git操作はshellなしliteral argv | frozen installを再現可能にし、command injection面を増やさない |
| TS-RA-07 | distributionは既存 `scripts/package.ts` と `scripts/promote-self.ts` を正本とする | canonical sourceから全harness projectionを再現する |
| TS-RA-08 | 対話的な開発端末はHerdrを利用でき、tmuxをgate／CI／受入試験の依存にしない | ユーザーの運用環境と非対話CIを分離し、multiplexer差で合否を変えない |

## CI wiring

| Event | Base source | 実行契約 |
| --- | --- | --- |
| `pull_request` | `github.event.pull_request.base.sha` | 40 hex／nonzero／commit objectを検証し、base repository objectだけを使用 |
| `push` | `github.event.before` | 40 hex／nonzero／commit objectを検証 |
| その他 | なし | gateを成功扱いせず明示的blocking failure |

checkout後に `git cat-file -e <sha>^{commit}` 相当をliteral argvで実行する。object欠落時だけ `git fetch --no-tags --depth=1 origin <sha>` 相当を一回実行し、同じobject検査を再実行する。失敗時にHEAD、branch名、merge-baseへfallbackしない。

gate invocationは検証済みbase SHAを一つのargvとして、`timeout --signal=TERM --kill-after=5s 30s bun run no-silent-drop -- --base-revision <sha>` 相当で一回だけ実行する。このstepにだけ `timeout-minutes: 1` を設定し、lint job全体の既存timeoutは変更しない。workflowはexitだけを消費し、stdout unionやfindingを再実装しない。

## 実行端末の境界

- contributorがHerdr paneからcommandを起動しても、gateのargv、cwd、environment contract、exit、evidence schemaは通常shellと同一である。
- tmuxは本Unitのruntime、CI、capacity fixture、approval provenanceの依存ではない。repository内に残るtmux記述は別スコープの既存TUI E2E backendを指し、本Unitの実行要件として解釈しない。
- Herdr自体もCI依存にはせず、pane／workspace IDやHerdr session状態をevidence identityへ含めない。

## Artifactとmodule境界

| 境界 | Owner |
| --- | --- |
| scanner／Result／ledger parser／ratchet／bootstrap validation | U1 `static-gate-engine` canonical source |
| raw／classification／approval／approved evidence／candidate command | U1 command、U4 corpus固有artifactと人間review |
| canonical baseline／exemption値 | U4のreview済みrepository change |
| trusted base objectとblocking step | U4 `.github/workflows/ci.yml` |
| #1874／#1878 runtime fixes | U2／U3 canonical runtime source |
| projection generation／drift | U4が `bun scripts/package.ts`、`bun scripts/package.ts --check`、`bun run promote:self:check` を実行 |

U4は `package.json`／`bun.lock`、U1 schema／algorithm、U2／U3内部resultを再実装しない。U1がexact dependencyを追加した後のlockfileをfrozen installで消費する。

## 採用しない選択肢

- CI workflow内でast-grep rule、JSON schema、baseline diffを再実装する構成: local／CI driftを作るため不採用。
- shallow checkoutのままHEADやmerge-baseへfallbackする構成: trusted previousを攻撃者制御current treeへ近づけるため不採用。
- `continue-on-error`、warning-only、advisory job、新規optional job: blocking要件を満たさないため不採用。
- runtime `bunx`／npm latest解決: frozen supply-chain契約を破るため不採用。
- evidence、classification、approval、baselineの単一可変ledger: provenanceと人間承認境界を失うため不採用。
- generated treeの直接修正: canonical sourceとのbyte parityを失うため不採用。

## Build・Test・Distribution

- `bun run lint`、`bun run typecheck`、`bun run test:ci`、既存coverage gateを実行する。
- PR base／fork PR base／push beforeのevent fixtureでobject materializationと実 `git show` を検証する。
- zero／partial／tool／rule／ledger／base object／timeout failureがblockingになるintegration testを追加する。
- canonical変更後に `bun scripts/package.ts` を実行し、`bun scripts/package.ts --check` と `bun run promote:self:check` を通す。
- final evidence reportはraw outputを複製せず、immutable artifactのpathとSHA-256 digestを参照する。

## 再検討条件

- GitHub以外のCI event source、別remote、artifact storeを追加する。
- authored root、language、rule catalog、ledger schemaを変更する。
- 15秒性能、FP=0 promotion、shrink-only、fail-closedを満たせない。
- new harness projectionまたはpackager contractが追加される。
- credential、write permission、remote serviceが必要になる。
