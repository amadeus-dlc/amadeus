# Code Summary — fix-1953-swarm-generation

上流入力(consumes 全数): requirements.md（FR-5）, code-generation-plan.md

- Bolt branch: `bolt-fix-1953-swarm-generation` → PR [#2360](https://github.com/amadeus-dlc/amadeus/pull/2360)（**MERGED**）
- 主要コミット:
  - `fix(swarm): bind SWARM evidence to the compiled plan generation`（初回実装、batch 番号軸）
  - `fix(swarm): re-ground the plan-generation binding on the Unit-name axis`（#2355 着地後の再接地）
  - `chore(nsd): rebind ledger previousDigest ...`（base 追従ごとの ledger rebind）
- 実装: コンパイル済み Bolt DAG の batch 構造 digest を計画世代とし、`SWARM_STARTED` / `SWARM_UNIT_CONVERGED` /
  `SWARM_COMPLETED` / `SWARM_DEGRADED` の 4 行が刻印。approve 側は 3 収集地点（完了 batch 番号・fan-out unit 集合・
  収束 unit 集合）で現行世代の行のみを数え、別世代・無世代は受理しない。拒否文は別世代行の存在と再突合手順を明示。

## Files created/modified（マージ済み #2360 の実測、10ファイル）

| ファイル | 変更 |
|---|---|
| `packages/framework/core/tools/amadeus-lib.ts` | 世代の純関数 `boltDagGenerationOf`、復元 `readBoltDagGeneration`、`SwarmEvidence` に `sawStaleGeneration` |
| `packages/framework/core/tools/amadeus-swarm.ts` | `withPlanGeneration` と 4 emitter の刻印 |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | 3 収集地点の世代フィルタ（`rowIsCurrentGeneration`）、拒否文の別世代注記 |
| `packages/framework/core/otel/event-registry.ts` | 4 イベントへ optional 属性 `Plan generation` |
| `packages/framework/core/knowledge/amadeus-shared/audit-format.md` | 同 4 行の属性欄を同期 |
| `tests/integration/t402-approve-reconciliation.integration.test.ts` | 新規 m/n/o、fixture の世代自動刻印、既存 b/c/k/l の改訂 |
| `tests/integration/t379-swarm-canonical-emit.test.ts` | emitter→registry→保存行の経路テスト |
| `tests/.coverage-registry.json` | 新規 export に伴う再生成 |
| `tests/no-silent-drop/baseline.json` / `exemptions.json` | base 追従ごとの ledger rebind |

衝突解決で main 側を全面採用した 3 ファイルは `amadeus-lib.ts` / `amadeus-orchestrate.ts` /
`t402-approve-reconciliation.integration.test.ts`（#2355 の Unit 名軸をそのまま採用し、その上へ FR-5 を再適用）。

## 上流入力の欠落（degraded input の開示）

本 unit の consumes のうち `unit-of-work.md` は**設計上不在**（scope `self-fix` が units-generation を SKIP）。
directive の `consumes_absent` も `expected: true` で返っており、stage 本文の fallback に従い requirements.md（FR-5）
のみを上流入力として実施した。欠落成果物の内容は捏造していない。

## 検証（各コマンド自身の exit code）

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0（warning はベースライン 433 件） |
| `bun run source-only:check` | 0 |
| `bun run no-silent-drop` | 0（`NO_SILENT_DROP_OK`） |
| `bun tests/gen-coverage-registry.ts --check` | 0 |
| t402 ×3 + t379（再接地後） | 0（64 pass / 0 fail） |
| PR #2360 の CI 全チェック | **13 pass / 0 fail**（マージ済み） |
| `bun run build` 後の `git status`（tracked 不変） | 差分なし（NFR-3） |

FR-5d の測定粒度: 受け入れ基準は「stale 実績注入の approve が非0 exit で拒否」。本 unit が測定したのは
**approve 経路の in-process 実行**（`handleReport` 直呼びで `kind: "error"` の directive を確認、t402 `m`/`n`）であり、
CLI プロセスの exit code そのものは測っていない。engine の error directive は CLI で非0 exit に写る契約だが、
その写像は本 unit の測定範囲外である（`cid:build-and-test:verify-on-the-named-path` に照らした自己申告）。

## TDD（対角実測 — 新テスト × 未修正実装 = RED を実装前に測定）

初回実装時: 13 pass / **2 fail**（`m` 旧世代実績の拒否、`n` 世代欠落行の拒否）。
`o`（現行世代は通過）は未修正実装でも緑＝正の対照。

## 落ちる実証（注入 → 赤 → 復元 → 残渣ゼロ）

1. **世代フィルタの撤去**: 初回実装では `collectBatchNumbers` の判定を除去 → t402 `m`/`n` 赤（13 pass / 2 fail）→ 復元で緑。
   再接地後は `rowIsCurrentGeneration` を常時 true 化 → 同2件が赤（16 pass / 2 fail）→ 復元で緑。
2. **event registry 登録の剥がし**（初回軸の実装時点＝登録3件の断面で実施）: `Plan generation` の登録を
   **その時点の3件すべて**除去 → t379 の emitter 経路テストが赤 → 復元で緑。
   1件だけの除去では緑のままだった（allow-list が全 event 横断の union のため）。
   この観測が「レジストリ登録が load-bearing」であることの直接証拠であり、剥がす件数によって赤/緑が変わる事実自体を記録する。
   **最終形は刻印・登録とも 4 イベントで一致**（`SWARM_STARTED` / `SWARM_UNIT_CONVERGED` / `SWARM_COMPLETED` /
   `SWARM_DEGRADED`）。再接地で `SWARM_UNIT_CONVERGED` を追加した際に登録も同時に追加しており、
   本実証は3件断面の記録であって最終形の登録数ではない。マージ済み main での実測: registry 側 4 件、
   emitter 側 `withPlanGeneration(` 5 hit（定義1 + 呼出4）。

## テスト契約の改訂 vs 新規

- **新規**: t402 `m` / `n` / `o`（世代拒否・legacy 拒否・現行通過）、t379 の emitter→registry→保存行の経路テスト。
- **改訂**: t402 `b` / `c` / `k` / `l` — いずれも「世代無し実績を有効」と暗黙固定していたもの。FR-5b の宣言済み契約変更として
  現行世代を刻む形へ改訂（各テストにコメントで明示）。再接地後は fixture `seedSwarmRows` を
  **既定で現行世代を自動刻印**する形に拡張したため、`b`/`c`/`l` の改訂は fixture 側へ集約され、
  手組み JSON の `k` のみ個別改訂として残る。

## FR-5 受け入れ基準の充足（項目別）

| 項目 | 実施 |
|---|---|
| FR-5a 3 emitter + 世代一致突合 | 実施（最終は 4 emitter — #2355 が `SWARM_UNIT_CONVERGED` を証拠に格上げしたため拡張） |
| FR-5b legacy 行の fail-closed + loud 案内 | 実施（t402 `n` で固定、拒否文に再突合手順） |
| FR-5c 要件の紐づけ訂正（FR-4 → FR-2） | 実施（Issue #1953 コメント 5201098588、根拠は plan Step 7） |
| FR-5d stale 注入で拒否 / 現行は通過 | 実施（t402 `m` / `o`。測定粒度の限界は下表の注記参照） |
| FR-5e SR-1 は別起票 | 本 unit のスコープ外。別 Issue 起票は未実施＝**申し送り**（下記） |

## 逸脱・申し送り

- **停止した逸脱**: なし。
- **上流設計変更との衝突**: 実装完了・CI 緑・PR 発行後に #2355 が着地し突合軸が変わったため、ユーザー裁定 A のもと
  再接地した（詳細は plan の該当節）。衝突解決は 3 ファイルとも main 側を全面採用してから FR-5 を再適用する形を取り、
  #2355 の成果を一切上書きしていない。
- **本 unit は builder 未着手のまま park されていた**ため、conductor が worktree 隔離で直接実装した。
  他 5 unit（builder ディスパッチ）と実装形態が異なる点をゲートで開示する。
- **FR-5e の SR-1（carrier approve が swarm ガードを迂回する経路）は未起票**。requirements が「スコープ外・別起票」と
  規定した項目であり、本 unit では実施していない。intent 完了前に起票するか、明示的に次 intent へ送るかの裁定が要る。
- ledger の `previousDigest` は base 追従のたびに rebind が必要（本セッションで 3 回実施）。
  1本マージするたび残り PR が `BASELINE_INVALID` になる直列制約は実測済み。
