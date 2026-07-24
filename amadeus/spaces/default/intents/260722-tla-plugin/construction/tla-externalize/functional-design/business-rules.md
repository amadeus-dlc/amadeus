# Business Rules — U1 tla-externalize

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements(FR-3.1/3.2)、components、component-methods、services

## ルール一覧

- BR-U1-1(バイト同値): 外部化直後の specs/tla/FormalElection.{tla,cfg} は旧埋め込み定数とバイト同値であること。同値は identity tag(module.v1 / cfg.v1)の一致テストで固定する
- BR-U1-2(単一ソース): 埋め込み定数(MODEL_SOURCE / CFG_SOURCE)は削除し、外部ファイルを唯一の正とする。二重保持・フォールバック読込を禁止(org Forbidden)
- BR-U1-3(fail-closed 読込): productionの`scripts/formal-verif/tla-model-loader.ts`は引数なしloaderだけを公開し、internal pipelineはモデル/cfg/mapの不在・空・読取不能をResultエラーとして返す。呼び出し元でloud failし、無言の既定値・スキップを持たない
- BR-U1-4(シグネチャ安定): generateFrozenTlaModel / createFrozenTlaModelReceipt の公開シグネチャは不変。実験資産(run-skeleton-ci.ts、arm-s系)は無改変で green を維持(intent Q2 裁定)
- BR-U1-5(登録簿初期化): model-map.json は「実装ファイルパス→sha256」の配列で初期化し、対象実装ファイルは glob 実測で確定(記憶ベースの列挙禁止)。map の様式は U5 sensor の述語と同一定義から導出(canonical 1定義)
- BR-U1-6(検証委譲): 既知欠陥(D4)注入での検出連続性の実測は build-and-test で実施(application-design で明示委譲済み)。注: U3 BR-U3-7 も同じ D4 フィクスチャを使うが目的別個(U1=外部化後のモデル同一性・検出連続性 / U3=CLI/planner 配線の exit 1 実証)— フィクスチャ共有・重複実施ではない

## テスト観点(Comprehensive)

- unit/integration: 引数なしproduction loaderのexport面と、internal/test-only filesystem seamによる正常系・不在・空・読取不能・race・drift系(ENOENT等を注入 — ポータブル)
- integration(実FS): 外部化ファイルの identity 同値、model-map.json の様式 parse、既存 t 系スイートの green 維持
