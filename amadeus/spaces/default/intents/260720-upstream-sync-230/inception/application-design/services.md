# Services — upstream-sync-230

> 上流入力(consumes 全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。`stories.md` は本 scope で SKIP 済み。

## サービス構成

新規の常駐・network・AWS service は追加しない。既存 Bun CLI process 内の application service と filesystem/Git artifactを維持する。user-facing UIもないため、design-agent観点は CLI の明示的error、dry inspection、回復可能性へ反映する。

| 論理service | 実体 | 責務 | lifecycle/scaling |
|---|---|---|---|
| Stage Contract Service | C1 pure functions | schema/Unit kind/graphの正規化 | request-local、stateless、水平scale不要 |
| Workflow Runtime Service | C2 CLI modules | next/gate/recovery/swarm/state | invocation-local、intent lockで直列化 |
| Workspace Inspection Service | C3 pure scan | nested/submodule観測 | read-only、on-demand |
| Plugin Composition Service | C4 CLI + transaction | inspect/compose/doctor/drop | invocation-local、workspace単位atomic |
| Distribution Projection Service | C5 scripts | 6面package/4面self-install | build-time batch、決定的再実行 |
| Harness Adapter Service | C6 hooks/prose assets | host payloadとcore contractの変換 | hook invocation-local |
| Verification Service | C7 tests/docs/ledger | evidence集約と完了判定 | CI/local batch、ledger writeは最終のみ |

## オーケストレーション

中央 orchestration を採用する。choreography/event bus は導入しない。package/build と host compose は別workflowであり、同一transactionとして直列化しない。

### Package/build workflow

1. authoring: plugin source、C6 harness source、core contractを各正本へ置く。
2. validate: C1がplugin/stage schemaを検証する。
3. project: C5がplugin sourceを6 harnessと`dist/plugins/`へ決定的に投影する。
4. promote: 該当する既存4 harnessだけをself-installへ投影する。
5. verify: C7がbyte/orphan/unreferenced driftとplugin 0件のbaselineを検証する。

### Host compose/drop workflow

1. inspect: C3がhost workspaceをread-only観測し、C4がC5生成済みplugin bundleとhost snapshotを検証する。
2. plan: C4がno-clobber compositionまたはrecord所有pathだけのdrop planを生成する。
3. stage: C4がplanをtemp host treeへ適用する。
4. verify: C1/C2 compile、sensor、doctor、targeted testsをtemp treeで実行する。
5. commit: 成功したplanだけをatomicに反映し、composition record/auditを一度発行する。失敗時はhost bytes、record、auditを不変にする。

両workflowの証拠をC7が24 item traceへ集約し、full CI後だけledger transitionを許可する。

## 通信・データ契約

- 同期: TypeScript関数呼出しとCLI stdout JSON/exit code。async queue、REST、gRPC、event brokerはない。
- 永続化: source Markdown/TypeScript/JSON、intent state/audit、plugin composition record、generated dist。database/object storeはない。
- 排他: 既存 workspace/intent lockを利用し、validation完了前にcanonical treeへ部分書込しない。
- エラー: typed resultをCLI境界でloud errorへ写像する。advisoryはnested候補/submodule状態などread-only観測に限定する。
- observability: 既存 audit、doctor、sensor artifact、ledgerを使う。secret、credential、telemetry、network送信面は追加しない。

## AWS・UI評価

- AWS: deployment、runtime hosting、managed storage、IAM変更はいずれもscope外。AWS service mappingは N/A。
- UI: browser/native UIなし。CLI利用者には no-clobber理由、deferred field、stale marker、複数nested候補を具体的に表示し、黙ったfallbackを禁止する。
