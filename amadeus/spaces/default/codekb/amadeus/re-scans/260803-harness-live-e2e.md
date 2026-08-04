# リバースエンジニアリング再スキャン — ハーネス横断live E2E

## 実行メタデータ

- 実施日時: `2026-08-03T10:20:14Z`
- Intent: `260803-harness-live-e2e`
- リポジトリ: `amadeus`（単一repo）
- スコープ: `self-feature`
- プロジェクト種別: Brownfield
- 基点commit: `a8e1ce025a918310ab7d803270bb6fc6b649c598`
- 観測commit: `52a082af7d13c537fad65b1204c9760e28b73f61`
- 距離: `46 commits`
- 差分規模: `1,593 files changed, 174,787 insertions(+), 6,561 deletions(-)`
- 焦点: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717) のlive E2E共通policy/lifecycleとharness×transport adapterの段階展開。共通gate、構造化skip、scratch/cleanup、failure taxonomy、credential境界、既存surface移行、Cursor/OpenCodeのcapability spikeを対象とした。
- 基点選択: 本Intentに過去recordがないため、`re-scans/260802-plugin-projection-parity.md`のobservedを最新の記録済み祖先として採用した。共有`reverse-engineering-timestamp.md`はbase選択に使用していない。

## Git断面

- `git merge-base --is-ancestor a8e1ce025a918310ab7d803270bb6fc6b649c598 52a082af7d13c537fad65b1204c9760e28b73f61`はexit 0で、baseはobservedの祖先である。
- preflightでローカルHEADが`origin/main`より3コミット後方と判明したためfast-forwardし、検証中に追加された1コミットも再度fast-forwardした。最終observedは`origin/main`と一致する。追加4コミットはlive E2E焦点面を変更していない。
- Issue #1717の焦点となる既存drive helper 6本は区間内変更0。区間内の焦点変更は`tests/run-tests.ts`とCursor/OpenCode manifest/plugin周辺である。したがってlive契約の非対称は46コミット区間の回帰ではなく、base以前からの未統合契約である。

## Developerコードスキャン実測

### リポジトリとビルド

- Bun `1.3.13`、strict TypeScript、ESM、bundler resolutionのmonorepoである。長寿命service、HTTP server、databaseはない。
- framework正本は`packages/framework/core/`と`packages/framework/harness/`にあり、7 harnessへ投影される。
- TypeScriptはcore 216ファイル、harness固有source 32ファイル。`*.test.ts`は869本。
- `scripts/package.ts`と`scripts/promote-self.ts`が生成・self-install投影を担い、`dist:check`、`promote:self:check`、`distribution:check`がdriftを検査する。

### テスト結果

- Codex policy/helper、Kimi driver、Cursor adapterの選択4ファイルを最終observedで再実行: **58 pass / 132 assertions / 0 fail**。
- `GITHUB_ACTIONS=true`、全live flag未設定の代表5 surface: **0 pass / 7 skip / 0 fail**。
- CodexはGHAを理由にskipし、Kimi/Kiro ACP/TUI/IDEはopt-in未設定を理由にskipした。GHA hard denyの横断precedenceが存在しないことを再確認した。
- typecheckはコードエラーではなく、このworktreeに`tsc` executableがないためexit 127で未実施。成功・失敗のコード品質証拠へ丸めない。

## 実行面の棚卸し

| Surface | Live gate | Credential/config isolation | Result / failure | 判定 |
| --- | --- | --- | --- | --- |
| Codex exec | 明示flag、GHA hard deny | scratch homeへauth copy、source pointer削除 | journey固有の`rc/out` | 共通化の局所先例 |
| Claude SDK | 共通flagなし、`t19`はsuite skip | user/local settings除外、ambient env継承 | AbortController、partial result | policy/secret境界が不足 |
| Claude TUI | 主に`AMADEUS_TUI_LIVE` | project setting source、private tmux | exit 0/1/2 | retain/failureが固有 |
| Kimi print | 明示flag | scratch config、real credential dirsをsymlink | `rc/timedOut/error` | GHA denyとsecret境界が不足 |
| Kiro ACP | 明示flag | `whoami`、ambient AWS profile | cancel後throw | transport制約をadapterへ閉じる必要 |
| Kiro TUI | 明示flag | ambient profile | driver exit code | outcome正規化が必要 |
| Kiro IDE | 明示flag | generated profile、machine auth | CDP timeout/exception | artifact/credential保持分離が必要 |
| Cursor | なし | deterministic fixtureのみ | adapter mappingのassert | live transport/journey未実装 |
| OpenCode | なし | plugin fixtureのみ | presence mintのassert | live transport/journey未実装 |

## アーキテクト統合判断

### 観測した境界

共通`LivePolicy`、構造化skip reason、scratch lifecycle、timeout/failure taxonomyはobserved HEADに存在しない。各driverがpolicy、credential、spawn、cleanup、resultの一部または全部を個別所有している。journeyは構造化tool/state/auditを読む強い例とexit code/例外を直接解釈する例が混在する。

### 合成した依存方向

1. 共通policy/lifecycleは明示opt-in、GHA hard deny、gate precedence、構造化skip、scratch状態遷移、timeout/failure class、credential declarationと漏洩検査を所有する。
2. harness×transport adapterはbinary/version/auth preflight、環境allow-list、credential strategy、scratch注入、spawn/cancel/cleanup、raw result正規化を所有する。
3. journey/assertionはpromptと期待するtool/state/audit/resultを所有し、adapter固有exit codeやambient credentialへ依存しない。
4. runner/reportingはtier、並列、構造化skip/failureの集約とsanitized live run ledgerを所有する。

credential strategyはadapter所有とする。Codex auth file、Kimi credential directory、Kiro AWS/machine auth、Claude settingsは同じ仕組みとして扱えない。一方、共通層はcredentialの種類、scratch配置、retain禁止、cleanup receiptの宣言と、pointer/material双方の漏洩検査を所有する。この分離によりtransport差を保持しつつ横断的な秘密情報安全性を検証できる。

### 段階展開

1. 共通policy/lifecycleのwalking skeletonを、既存Codex precedenceとcleanup先例を使って構築する。
2. 既存live surfaceを一つずつadapter契約へ移し、各移行で既存journeyをtyped outcomeへ切り替える。
3. runnerへ構造化skip reasonとsanitized run ledgerを接続する。
4. Cursor/OpenCodeはcapability spikeで実runtimeの起動、hook観測、停止、credential隔離を証明する。
5. spikeが成立したsurfaceだけadapterと最小journeyを同じ変更単位で追加する。成立しない能力はunsupported/conditionalとして記録し、実測結果・阻害要因・推奨seam・受け入れ条件を持つ後続Issueへ接続する。dormant adapterは先行登録しない。

## 影響とリスク

- 主な変更候補は`tests/harness/`、live journey、`tests/run-tests.ts`、必要なdocs/CI receiptである。production engineの巨大moduleへlive test契約を混入させない。
- 最大のセキュリティリスクはambient credential継承、debug artifactへの秘密残留、GHAでの誤起動。probe前deny、adapter env allow-list、資格情報強制削除、共通漏洩検査で閉じる。
- 最大の設計リスクはCLI/SDK/TUI/ACP/CDPを単一汎用spawn wrapperへ押し込み、共通層を条件分岐の集積にすること。共通化はpolicy/lifecycle/result vocabularyに限定する。
- 最大の検証空白はClaude headless live journey、Cursor/OpenCode runtime journey、live green SHA/run ledger、runnerのskip reason fieldである。

## 更新した共有成果物

- `business-overview.md`: 利用者価値、共通契約、段階展開、成功境界。
- `architecture.md`: 現行非対称、共通policy/lifecycle→transport adapter→journey/assertion、credential責務、Interaction Diagrams。
- `code-structure.md`: 6 driver、journey、runner、Cursor/OpenCode、CI/docsの配置と挿入点。
- `api-documentation.md`: 現行driver APIと未実装の共通契約。
- `component-inventory.md`: surface別health、missing共通層、live ledger。
- `technology-stack.md`: 7 harness、869 tests、外部transport substrate、新規依存不要。
- `dependencies.md`: 共通層、adapter、credential、journey、runnerの依存方向。
- `code-quality-assessment.md`: 58 pass、7 skip、typecheck制約、品質リスクと検証空白。
- `reverse-engineering-timestamp.md`: observed/date/focus/per-intent linkだけを持つ共有freshness pointer。

8本文の旧`260802-registry-drift-guard`現在節は内容を変更せず履歴へ降格した。過去のfile:lineや断面判断は当時のobservedを指すため更新していない。
