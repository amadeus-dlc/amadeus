# Components — formal-verif-value-chain

上流入力(consumes 全数): requirements, architecture, component-inventory

requirements.md の FR-A〜FR-E を実現する変更コンポーネントを列挙する。既存配置の実測は architecture.md(機構 A〜E 節)と component-inventory.md(対象コンポーネント 14 件)の 260731 節に依拠する(測定 ref: HEAD 16486d3c)。

## C1: プラグイン所有 tools ツリー(FR-A1)

`plugins/formal-model-check/tools/` — `scripts/formal-verif/` から分類 A(16)+B(7)+C(1)= 24 ファイルを移設。ディレクトリ内相対 import は移設で不変(閉包が自立しているため)。外部依存1本(model-map モジュール)は ADR-2 により同伴複製へ切替。推定規模: 移設 24 ファイル(実質 diff は import 1 行×数ファイル+パス参照)+複製1ファイル。

## C2: manifest スキーマ拡張+compose tools 配布(FR-A3)

`packages/framework/core/tools/amadeus-plugin-compose.ts` — manifest に `tools: [<相対パス>]` フィールドを新設(ADR-1)。`parseManifest`(:330-334 系)に `parseTools` を追加し、`composeWriteSet`(:1021-1037)の書込集合へ toolsCopies を加える。`ownedPaths`(:557)へ tools パスを含め、drop の削除面も対称に拡張(symmetric-pair-review: compose⇔drop)。推定規模: +120〜180 行。

## C3: 一括 compose verb(FR-B1)

`packages/framework/core/tools/amadeus-plugin.ts` — `compose-all`(名称は実装時に既存 verb 命名流儀へ整合)を追加。検出は既存のハーネスツリー検出流儀(KNOWN_HARNESS_DIRS 系)を再利用し、現存ツリーへ順次 compose。個別 compose は不変。staging(`.amadeus-plugin-src`)不在のツリーは install 起点から staging を先行配置する。推定規模: +80〜120 行。

## C4: advisories 構造化フィールド(FR-B2)

`packages/framework/core/tools/amadeus-orchestrate.ts` — directive JSON へ `advisories: [{plugin, code, message, stage}]` を追加(ADR-5)。`activationAdvisoryForHost`(amadeus-plugin-activation.ts:272)の戻りを構造化形へ拡張(stderr 1行併用維持)。stage-protocol.md へ「advisories をユーザーへ提示する」規範を追記。既存 directive 消費側の parse 棚卸し(FR-B2 AC)を実装前に実施。推定規模: +60〜100 行+protocol 文書。

## C5: チェックポイント発火+run 単位ラッチ(FR-B3)

`amadeus-orchestrate.ts` — `ACTIVATION_ADVISORY_STAGE`(:1293)の単一定数を発火点集合 `{requirements-analysis, functional-design, build-and-test}` へ拡張し、run 単位ラッチ(同一 advisory line の重複発火抑止 — 機械実体は runtime の hooks-health 系 scratch に置く既存流儀)を導入。推定規模: +40〜80 行。

## C6: plugin 境界ガード(FR-A6)

新規テスト `tests/integration/t377-plugin-boundary-guard.integration.test.ts`(採番予約: t374-376 は 260731-open-bug-batch-4 が予約済みのため t377 — swarm-test-number-reservation 準拠)。検査対象: FR-A2 AC の4面すべて — `plugins/` 正本+`dist/plugins/` 全変種+`.claude/plugins/`(compose 済みコピー)+`.claude/.amadeus-plugin-src/`(staging)— の全ファイルに repo-only パス(`scripts/`)参照が 0 件。既存 t258 の SCAN_ROOTS(tests/lib/boundary-guard.ts:53-66 — `plugins/`・`dist/plugins/` を含まない実測)に依存せず、t377 単独で AC 全面を保証する。t258-boundary-guard の既習様式に倣う(citation-semantics-check: t258 は許容リスト方式 — 本ガードも同形の許容リストを持てるが初期は空)。落ちる実証+corpus sweep 必須(NFR-5)。

## C7: updateModelMap --impl-only(FR-D1/D2)

`packages/framework/core/tools/amadeus-sensor-model-completeness.ts` — `updateModelMap` に `--impl-only` フラグを追加。model/cfg identity 不変かつ impl エントリのみ drift の場合に、宣言フラグ必須で entries[].sha256 を更新し監査行(AUDIT 既存イベント語彙の範囲)を出す。MODEL_UNCHANGED 分岐(:650-659)は「--impl-only なし」時の既存挙動を維持しつつ、detail 文面に正規手順を明記(FR-D2)。センサー manifest 文書(.claude/sensors/amadeus-model-completeness.md:37-41)も同期更新。推定規模: +80〜120 行+テスト。

## C8: mirror lifecycle TLA+ モデル(FR-C3)

`specs/tla/MirrorLifecycle.tla` + `MirrorLifecycle.cfg` + model-map エントリ。有限ドメインは RE 実測(receipt status 7・終端4 / operation 3 / boundary 6 / effect 3)を ADR-3 の定数で縮約。invariant: (i) NoCloseWithoutLandedSync(close-after-landing、#1816/#1607)(ii) NoDuplicateCreate(issueNumber 記録済み状態で create 遷移が enable されない、#1838)。model-map 正準 impl 集合は ADR-4(reducer+types+coordinator の3ファイル)。model-map.json は複数モデル対応が必要な場合スキーマ従来形の範囲で拡張(設計注記参照)。

## C9: モデル工程文書(FR-C1/C2)

モデル追従工程(SOURCE_DRIFT → --impl-only / モデル改訂の分岐フロー)と新規プロトコル供給工程(題材選定→縮約→invariant 導出→model-map 登録→TLC 完走→落ちる実証→人間ゲート)を `docs/` 配下(既存 formal-verif 文書の並び)へ英語で記述し、plugin README から参照する。

## C10: CI 付け替え(FR-A4)+残骸削除(FR-A5)

`.github/workflows/ci.yml`(:584/:600)のパスを `plugins/formal-model-check/tools/run-model-check-ci.ts` へ変更。分類 D 30 ファイル+参照テスト群の削除、台帳2面(complexity-baseline / coverage-patch-allowlist)の整理と機械 remap(requirements FR-A5 のとおり)。

## 規模の正当化と再利用棚卸し

- 新規機構は C2(tools 配布)・C4/C5(advisories/発火点)・C7(--impl-only)・C8(モデル)のみ。C1/C10 は移設・削除、C3 は既存検出流儀の再利用、C6 は t258 既習様式の再利用。
- 数値見積り: 新規実装 約 400〜600 行+モデル(.tla/.cfg 約 150〜250 行)+テスト。移設 24 ファイル・削除 30 ファイル+テスト群は行数大だが機械的変更。
- 既存インフラ再利用: ハーネス検出(KNOWN_HARNESS_DIRS 系)・t258 ガード様式・FormalElection 縮約パターン・dist 再生成パイプライン(scripts/package.ts)・既存 CI ジョブ(新設ジョブなし)。
- adapter の先行着地なし: C2 の tools 配布は C1 の実体と同一 intent で配線される。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T10:20:59Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 NOT-READY(Major 1: ownedContentDigests 対称拡張欠落 / Minor 2)→ 是正2件反映+Minor 1(coordinator :235 引用)は reviewer 再実測で conductor 却下を追認。iteration 2 READY(GoA 1-2)、残存指摘なし。UTC 2026-07-31T10:19:45Z

### Findings

- iteration1 Major: C2 digest 面の対称拡張欠落(planPluginDrop の drift 拒否機序)— 是正済み・反映実測確認
- iteration1 Minor: coordinator 引用 :235→:243 指摘 — 却下(:235 が #1838 患部と両者実測で確定、verbatim 併記で明確化)
- iteration1 Minor: C6 検査対象と FR-A2 AC の不整合 — 是正済み(AC 4面の全数検査を明記)
