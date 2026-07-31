# Decisions (ADR) — formal-verif-value-chain

上流入力(consumes 全数): requirements, architecture, component-inventory

requirements.md「設計段への委譲」4件+advisories 形状の計5件を ADR として確定する。既存機構の実測引用は architecture.md / component-inventory.md の 260731 節(HEAD 16486d3c)に依拠。

## ADR-1: manifest スキーマは `tools` フィールド新設

- **Context**: compose の host 書込は stage/seam/fragment のみ(amadeus-plugin-compose.ts:330-334 / :1021-1037 実測)。plugin tools を配布する語彙がない(FR-A3)。
- **Decision**: manifest に `tools: ["tools/<file>.ts", ...]` フィールドを新設する。compose は宣言された tools を verbatim コピーし(prose 変換なし — projection の「.json/.ts are verbatim」流儀と整合)、`ownedPaths` へ含めて drop で対称に削除する。
- **Consequences**: 宣言駆動を維持(compose の既存原則)。tools 追加時は manifest 更新が必要。~~coverage-patch-allowlist の trusted path 制約(:35-36)の tools 拡張~~ — **FD u4 reviewer の実測(2026-07-31)により不適用と確定し撤回**: 当該制約の実体(trustedPluginStageFile — orchestrate:1204-1225 / graph:1997-2030)は stageIndex 検証専用で tools パスの呼出しが存在しない。将来 tools の実行時信頼検査が必要になれば実在の呼出し元を特定して導入する(FD u4 I2 の訂正記録参照)。
- **Alternatives Rejected**: (a) projection 同様の全ファイル走査 — compose の宣言駆動原則を崩し、意図しないファイル(README 等)の host 汚染を招く。(b) `stages` の一般化(kind 属性付き)— 既存 manifest 全消費側の改修を要し surgical でない。

## ADR-2: canonical.ts の外部依存は同伴複製+drift guard

- **Context**: 分類 A の `canonical.ts:5` が core の `amadeus-formal-verif-model-map.ts` を相対 import する(唯一の外部依存)。core sensor(amadeus-sensor-model-completeness.ts)も同モジュールを使う。移設後、repo 内実行(CI)と配布先 host 実行(.claude/plugins/...)で相対深度が異なり、単一の相対 import では両立しない(.ts は verbatim コピーでパス書換なし)。
- **Decision**: `plugins/formal-model-check/tools/` に model-map モジュールの複製を同伴し、plugin tools 内の import は同ディレクトリ相対へ統一する。core 側を正本とし、複製の byte 同期を drift check(既存 dist:check 流儀の1検査として)で機械強制する。
- **Consequences**: どの実行面(repo CI / 配布先 host)でも import が解決する。二重保持は発生するが、機械 drift guard があるため「NEVER 埋め込み fallback の二重保持」(project.md Reliability)の禁じる無防備な二重化には当たらない — 正本1+生成物1+drift 検出の既習構造(dist と同型)。
- **Alternatives Rejected**: (a) core 残置参照のまま — 配布先で import 不能(FR-A3 の自立性が崩れる)。(b) 逆向き移設(core から plugin へ)— core sensor が plugin(opt-in)へ依存する方向逆転で、plugin 不在ホストの sensor が壊れる。

## ADR-3: mirror モデルの有限化定数

- **Context**: 実装の receipts は可変長 Record(MAX_RECEIPTS=1000、reducer:42)。TLC 完全探索には小さな有限ドメインが要る(FR-C3)。
- **Decision**: FormalElection の既習縮約(GoA 8値→5クラス、時刻→3点、投票者3体)に倣い、`MaxReceipts = 3`・boundary 列は {intent-initialized, intent-capture-approved, phase-verified, workflow-completed} の4種に縮約(parked/manual は初版スコープ外として明記)・operation 3値・receipt status 7値・effect 3値は全数保持する。縮約で消える性質(1000 件スケールの挙動、parked/manual 経路)は成果物に明記する(finite-exploration-not-detected-proof 準拠)。
- **Consequences**: 状態空間は TLC で完全探索可能な規模に収まる見込み(receipt 3 × status 7 × effect 3 の直積が支配項)。#1838 の重複 create は intent-initialized→intent-capture-approved の2境界だけで再現可能なため縮約後も検出力を保つ。
- **Alternatives Rejected**: (a) MaxReceipts=1(境界列で受領が1つ — 重複 create の表現に受領2つが要るため不足)。(b) 全 boundary 6種の初版導入 — manual の null 写像と parked の再入が状態空間を膨らませ、検査したい2 invariant に寄与しない。

## ADR-4: mirror model-map エントリの正準 impl 集合は3ファイル

- **Context**: model-map エントリはモデルと実装の対応をピンし、SOURCE_DRIFT 追従検出の監視面を定義する(FR-C1)。RE は reducer+types を第一候補とした。
- **Decision**: `amadeus-mirror-state-reducer.ts`(遷移・ガード・不変条件)+`amadeus-mirror-types.ts`(有限ドメイン語彙)+`amadeus-mirror-coordinator.ts`(boundary→operation 写像 — NoDuplicateCreate invariant の患部 :235 `if (context.boundary.kind === "intent-capture-approved") return "create";`(issueNumber を見ない無条件 create)を含む。対照: :243 `return state.issueNumber === null ? "create" : "sync";` は他境界の正しい状態依存写像)の3ファイル。
- **Consequences**: モデルが検査する意味論の全所在が監視面に入る。coordinator は 1004 行と大きいがモデル化対象は operationForBoundary 系に限る — モデル化範囲と監視面の差は .tla コメントに明記。
- **Alternatives Rejected**: (a) reducer+types の2ファイル — #1838 の患部(coordinator の固定写像)が監視面から漏れ、写像変更がドリフト検出されない。(b) mirror 25 ファイル全部 — presentation 等モデル外の変更で SOURCE_DRIFT が頻発し、--impl-only 運用の負荷だけ増える。

## ADR-5: advisories フィールドの形状とラッチ

- **Context**: FR-B2/B3。stdout directive JSON への追加は後方互換(未知フィールド無視)だが、形状は将来の複数 plugin を見込む必要がある。
- **Decision**: `advisories: [{ plugin: string, code: "changed" | "never-run", message: string, stage: string }]`(空時はフィールド省略)。発火点3点は発火点集合定数で表現し、run 単位ラッチは「同一 (plugin, code) の advisory は同一 run で1回」— ラッチ実体は gitignored の machine-local runtime(hooks-health 系と同じ置き場)に置き、record を汚さない。
- **Consequences**: conductor は配列を機械消費できる。code 語彙は activation 判定3値のうち発火2値と1:1(current は沈黙のため載らない)。
- **Alternatives Rejected**: (a) 文字列配列 — plugin/コード種の機械判別ができず提示規範が曖昧化。(b) ラッチを record 配下に置く — record が machine-local 状態で汚れ、コミット面に混入する。

## テスト採番予約

t374-376 は 260731-open-bug-batch-4 が予約済み(codekb re-scans 実測)。本 intent は **t377**(plugin 境界ガード)、**t378**(advisories フィールド)、**t379**(一括 compose)、**t380**(--impl-only)、**t381**(発火点+ラッチ)を予約する。formal-verif 系の named テスト(t-formal-verif-*)は既存命名流儀を維持する。

## 設計注記(ADR 外)

- model-map.json は現行スキーマが単一 model/cfg 前提(exactObject ["cfg","entries","model","schemaVersion"] — amadeus-formal-verif-model-map.ts:186 実測)。複数モデル対応のスキーマ改訂(v2: models[] 化)が FR-C3 に必要 — 具体形は functional-design で確定する。
- 発火点 CP1/CP2 のステージ slug は degrade スコープ(fix 等で requirements-analysis SKIP)では到達しない — その場合は最終安全網(build-and-test 前)が唯一の発火点として機能する(fail-safe 設計、機能低下であって欠落ではない)。
