# Design Decisions(ADR)— amadeus-mirror ツール

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## ADR-1 単一ファイル CLI

- Context: 実装約360行の小規模 CLI。既習様式(scripts/metrics-timeseries.ts)は単一ファイル。
- Decision: `scripts/amadeus-mirror.ts` 単一ファイル+関数 export で内部6コンポーネント分割。
- Consequences: ファイル分割の管理コストゼロ。lcov/patch 計測が単純化。将来 framework 昇格時に分割再設計の余地。
- Alternatives Rejected: (a) scripts/amadeus-mirror/ ディレクトリ分割 — 規模に対し過剰、既習様式から逸脱 (b) packages/ 新設 — 配布物ではない(Q1 裁定違反)。
- Reversibility: 容易(ファイル分割への移行は関数境界が既に引かれており機械的)
- Security/Compliance: 影響なし(ローカル CLI、秘密は扱わない)。

## ADR-2 gh spawn 様式(要件 O-R2 の確定)

- Context: repo 初の gh 呼び出し。bun-spawn-env-snapshot(spawn は env: process.env 明示)ノルムあり。
- Decision: `Bun.spawnSync({ cmd: ["gh", ...args], env: process.env, stdout: "pipe", stderr: "pipe" })` — 引数配列形(シェル文字列非経由)、env 明示継承、exit code は自身の exitCode を読む(no-exit-capture-through-pipe)。
- Consequences: シェルインジェクション面なし。テストは GhRunner port の fake で gh 非依存。
- Alternatives Rejected: (a) node:child_process execFile — Bun ネイティブで足り、二重様式を避ける (b) シェル文字列(`sh -c "gh ..."`)— 引用符事故とインジェクション面を作る。
- Reversibility: 容易(GhRunner port の背後なので実装差し替えは1関数)
- Security/Compliance: トークン非保持(keyring 委譲)。stderr 透過はトークンを含まない(gh は秘密を stderr に出さない設計だが、透過前のマスキングは不要と判断 — 出力は人間のターミナルのみ)。

## ADR-3 状態行フォーマット(要件 O-R1 の確定)

- Context: FR-5.1 の `## 状態` は1行で最新位置を伝える。素材は summary --json(.stages 集計)+ state.md(phase/stage/Parked)。
- Decision: `**<STATUS>** — <PHASE>/<stage>(approved <n>/<total>)、更新 <ISO日時>`。STATUS は parked 時 `parked @ <stage>`、workflowStatus=Completed 時 `complete`、それ以外 `in-flight`。例: `**parked @ reverse-engineering** — INCEPTION/reverse-engineering(approved 7/18)、更新 2026-07-17T13:23:34Z`
- Consequences: かんばんカードの一覧性(1行・冒頭に太字状態)。sync 冪等性は決定的素材のみで担保(FR-3.2)。
- Alternatives Rejected: (a) 全フェーズ集計表 — 定型3要素の「行」を超えて肥大 (b) 絵文字バッジ形 — 検索性・機械可読性が落ちる。
- Reversibility: 容易(C3 renderStatusLine のみの変更。sync 再実行で全ミラーに伝播)
- Security/Compliance: 影響なし。

## ADR-4 テスト seam = 関数 export + GhRunner 注入

- Context: bun-coverage-spawn-blindspot(spawn 先は計測不能)、local-lcov-pre-push、テストダブル分岐を本番に置かない構築ガードレール。
- Decision: 全コンポーネント関数を export し in-process で駆動。gh 境界は GhRunner port の注入。CLI 直叩きテストは smoke 最小限。
- Consequences: patch カバレッジを in-process で確保。fake は tests/ 側ヘルパーに置く。
- Alternatives Rejected: (a) CLI spawn テストのみ — カバレッジ盲点(既知ノルム違反) (b) 環境変数での fixture モード — 検証劇場 Forbidden 同族(テスト専用分岐の本番混入)。
- Reversibility: 中(export 面はテストが依存するため縮小はテスト改修を伴う)
- Security/Compliance: 影響なし。

## ADR-3a 集計源の修正(実装時裁定 2026-07-17、ユーザー承認)

- Context: 実装時の再列挙で、summary --json がアクティブ intent の runtime-graph(gitignore・マシンローカル)しか読めず、--intent 指定・別 clone で不整合になる欠陥を検出(enumeration-reverify-at-implementation)。
- Decision: 状態行の approved/total は対象 intent の amadeus-state.md「## Stage Progress」チェックボックス集計([x]=approved、[S] は分母から除外)へ変更。summary --json への依存を除去。
- Consequences: --intent 指定・別 clone で正確、spawn 不要。C2 の MirrorSnapshot 組み立ては state.md+intents.json の2ソースに簡素化。
- Alternatives Rejected: (a) 設計どおり summary --json — 上記不整合 (b) runtime-graph 直読 — gitignore 対象への依存。
- Reversibility: 容易(集計関数1つの差し替え)。
- Security/Compliance: 影響なし。

## ADR-5 状態読み取りは amadeus-lib の import 再利用

- Context: readIntentRegistry(:1615)/ getField(:3588)は canonical に実在。自前再実装は語彙乖離(#1001 型)の芽。
- Decision: `packages/framework/core/tools/amadeus-lib.ts` から必要シンボルを import(モジュールレベル副作用なしを実測確認)。実装確定の実測値は7シンボル: activeIntent / getField / intentsDir / readIntentRegistry / recordDirMatches / setOrInsertField / IntentRegistryEntry 型(当初見積り「2関数+1型」から拡大 — FR-1.2 の cursor 解決と FR-2.3 のフィールド書き込みに lib の既存関数を再実装せず使うため。PR #1169 レビューの留保を吸収して 2026-07-18 同期)。
- Consequences: 様式変更に型レベルで追随(D2 リスク低減)。scripts → core の import 依存が生まれる(repo 内・型検査対象内なので許容)。
- Alternatives Rejected: (a) getField 相当の最小自前実装 — 正規表現の複製は drift の芽、reuse inventory 原則に反する (b) `.claude/tools/` 配布コピーからの import — 生成物への依存は dist 再生成と衝突(正本は packages/framework/core)。
- Reversibility: 中(自前実装への切替は可能だが、lib 様式変更への自動追随を失う)
- Security/Compliance: 影響なし。
