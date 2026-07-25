# Unit of Work: Solo Standing Grant

## 入力と分解原則

本分解は Application Design の `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md` と Requirements Analysis の `requirements.md` を入力とする。user-stories 成果物は本 scope では生成されていないため、FR/NFR を検証可能な delivery scenario として扱う。

境界はファイルやレイヤーではなく、独立に説明・検証できる機能能力で切る。Standing grant は監査イベントから導出し、新しい設定・database・state field・専用serviceを作らない。3 Unit はすべて既存 TypeScript CLI/core に埋め込まれ、単一リポジトリとして配備される。

## U1: grant-authorization-domain

### 目的

solo standing grant の発行・取消・探索・gate eligibility・route receipt 検証に必要な、監査由来の純粋な認可ドメインを提供する。

### 境界と責務

- `GRANT_ISSUED` / `GRANT_REVOKED` を正本とし、active intent にbindingされた solo grant を導出する。
- operating mode を `solo | team` に正規化し、未知値をfail-closedにする。
- solo candidate を失効時刻降順、発行監査時刻降順、Grant Id辞書順昇順で決定する。
- phase-boundary、walking-skeleton、stage scope を含む既存gate policyに対し、grantが認可できるかを評価する。
- `amadeus-feature`をgreenfield-shaped scopeとして扱うshared walking-skeleton classifierの実装修正を単独で所有する。
- route receipt を exact Route Id で一意に解決し、Stage/Grant Id/carrierとの一致を検証する。
- team mode の既存探索順・leader/delegation契約は変更しない。

### 所有する成果

- audit-derived query と pure eligibility predicate。
- soloでの現行grant lifecycle契約。
- operating mode、tie-break、intent binding、provenance、policy matrix のunit tests。
- protected `GATE_AUTHORIZATION_SELECTED` event のschema/mint guard。

### 配備・複雑度

- 配備モデル: 既存coreへ埋め込み。
- 相対複雑度: M。
- 制約: clockとaudit shard入力を注入可能にし、sleepや「最新receipt」推測に依存しない。

## U2: solo-gate-transaction

### 目的

routeで選択したGrant Idをcommitまで明示的に保持し、lock内再検証の成功時だけgateを承認し、失効等では副作用なしにhuman gateへ戻す縦のtransactionを提供する。

### 境界と責務

- `gate` の真偽を変えず、solo grant carrierのoptional all-or-none pairをdirectiveへ付与する。
- route時に `GATE_AUTHORIZATION_SELECTED` receiptをaudit-firstで記録した後だけcarrierを返す。
- reportからstate approveへGrant Id/Route Idを明示的に引き回す。
- grant-backed approveだけにstrict JSON wireを適用し、`approved` と `await-approval` をtyped outcomeとして区別する。
- state lock内で同じreceiptと同じgrantをmutation前に再検証する。
- expected invalidityでは `GATE_APPROVED`、`STAGE_COMPLETED`、`ERROR_LOGGED`、state advanceを0件に保つ。
- fallback後はstage body、reviewer、sensor、learningsを再実行せず、既存human approvalだけを提示する。
- grant carrierをreject、Request Changes、halt-and-askへ渡しても自動認可せず、既存human controlを維持する。
- grant-backed routeでも初回のstage body、reviewer、sensor、§13 learningsを正確に1回ずつ実行する。

### 所有する成果

- directive schema/validator、route carrier、report strict parser、state approval lockの実装。
- success、expiry、revoke、substitution、cross-intent、duplicate receipt、malformed wire、human fallbackの統合テスト。
- per-unit all-covered最終gateだけを認可対象にするroute/commit契約。

### 配備・複雑度

- 配備モデル: 既存orchestrator/state CLIへ埋め込み。
- 相対複雑度: L。
- 制約: stderr文字列判定、standing-grant専用gate値、best-candidate再探索、疑似consumed stateを導入しない。

## U3: harness-contract-and-regression

### 目的

canonical coreの同一意味論を全6 harnessへ投影し、team mode、gate policy、per-unit Construction、generated artifactsの非回帰を保証する。

### 境界と責務

- canonical conductor手順にgrant-backed auto-commitとtyped `await-approval` fallbackを記述する。
- Claude、Codex、Cursor、Kiro、Kiro IDE、OpenCodeへ同一のroute→report→fallback意味論を生成する。
- U1が所有するshared walking-skeleton classifierについて、`amadeus-feature`を含むgreenfield-shaped scopeの投影・回帰fixtureを所有する。classifier実装は変更しない。
- team leader/delegation、phase-boundary、walking-skeleton、per-unit最終gateの回帰fixtureを固定する。
- type check、関連test、全test、`dist:check`、`promote:self:check`の収束条件を満たす。

### 所有する成果

- canonical skill/protocol/reference/helpの必要最小限の更新と全harness生成物。doctorについては新verb・field・eventを公開検査対象にする必要性を明示的に判定し、必要ならcanonical checkを更新し、不要なら既存doctorが矛盾しないfixtureを残す。
- team/solo directive、state transition、audit契約のcross-harness integration tests。
- drift 0と全回帰suite greenの検証証跡。

### 配備・複雑度

- 配備モデル: canonical sourceから生成されるharness同梱物。
- 相対複雑度: M。
- 制約: generated artifactsを直接編集せず、team modeの既存stdout/stderrとdelegation pathを変更しない。

## 完全性と非目標

- U1は認可判断、U2はgate transaction、U3は配布・互換性を所有し、責務の重複を避ける。
- 新しいgrant scope、無期限grant、reject/Request Changes/halt-and-askの自動化はどのUnitにも含めない。
- frozen [PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) は設計参考に限り、merge/cherry-pickや実装形状への依存を行わない。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T06:07:27Z
- **Iteration:** 1
- **Scope decision:** none

DAGはacyclicだが、FR-11、FR-09、FR-26の実行可能なscenarioとwalking-skeleton classifierの単一ownerが不足している。

### Findings

- MAJOR: FR-11にreject、Request Changes、halt-and-askをgrantが認可しない実行可能なscenarioがない。
- MAJOR: FR-09のstage body、reviewer、sensor、§13 learningsを初回に実行するcount/invocation fixtureがない。
- MAJOR: FR-26のdoctor更新要否を確認するscenarioがない。
- MAJOR: U1とU3のwalking-skeleton classifier所有が曖昧で、依存循環を招き得る。
- 確認済み: YAML DAGはacyclicで、経済的な推奨順序やcritical pathを先取りしていない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T06:09:33Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の4指摘はすべて解消され、FR/NFRのscenario、classifierの単一owner、DAG方向、Application Design整合がConstructionへ引き渡せる水準になった。

### Findings

- FR-11: reject、Request Changes、halt-and-askのhuman control fixtureが定義された。
- FR-09: 初回body、reviewer、sensor、§13 learnings各1回のcount契約が追加された。
- FR-26: help/doctor/reference整合とdoctor更新要否fixtureがU3に割り当てられた。
- shared walking-skeleton classifierの実装修正はU1だけが所有し、U3は投影と回帰検証に限定された。
- YAML DAGは自己依存、参照切れ、循環がなく、統合契約と一致する。
- FR-01–26とNFR-01–08は具体的scenario、owner、完了条件へ追跡可能である。
- topologyとUnit内契約構築順だけを記述し、推奨Bolt順やcritical pathを先取りしていない。
