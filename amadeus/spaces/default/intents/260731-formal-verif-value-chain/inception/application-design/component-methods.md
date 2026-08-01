# Component Methods — formal-verif-value-chain

上流入力(consumes 全数): requirements, architecture, component-inventory

components.md の C1〜C10 のうち、公開 seam が変わる箇所のメソッド面契約。既存シグネチャの実測は architecture.md / component-inventory.md の 260731 節に依拠。

## C2: amadeus-plugin-compose.ts

- `parseTools(manifest): string[]` — `tools` フィールドの検証(相対パス・`plugins/<name>/tools/` 配下限定・`expectRelPath`(amadeus-plugin-compose.ts:1470-1478)拒否の既存流儀を再利用。旧記載 isUnsafeRelativePath は scripts/plugin-projection.ts:192 の projection 時安全検査(別文脈のシンボル)で本文脈不適用 — FD u4 reviewer 実測により訂正 2026-07-31)。欠落時は `[]`(後方互換 — tools なし plugin は従来どおり)。
- `PluginManifest` 型へ `tools: readonly string[]` を追加。
- `composeWriteSet(plan)` — `plan.toolsCopies` を hostWrites へ合流。`ownedPaths` に tools パスを含める(drop の削除対称)。
- **digest 面の対称拡張(必須)**: `ownedStageDigests`(amadeus-plugin-compose.ts:584-586 — 現状 `plugin.manifest.stages` のみ走査)を stages+tools を走査する形へ拡張(例: `ownedRecordDigests`)し、`ownedContentDigests`(:558)の算出元とする。これを欠くと `planPluginDrop`(:703-718)が tools パスを `expectedDigest === undefined` の「trust grant からの drift」として rejections に積み、drop で tools が削除されない — 書込集合(ownedPaths)と digest 集合(ownedContentDigests)は対で拡張する(symmetric-pair-review)。

## C3: amadeus-plugin.ts

- 一括 compose verb(名称は既存 verb 命名に整合、例 `compose --all-harnesses` か `compose-all` — functional-design で確定): 検出した現存ハーネスツリー集合に対し、各 hostRoot で staging 確認→compose を直列実行し、ツリーごとの成否を集計して報告する。1ツリーの失敗で全体を中断せず、失敗を loud に列挙して exit 非0(fail-closed 集計)。

## C4/C5: amadeus-orchestrate.ts / amadeus-plugin-activation.ts

- `activationAdvisoryForHost(hostRoot): string | null` → `activationAdvisoriesForHost(hostRoot): Advisory[]` へ拡張(旧1行文字列は Advisory.message から合成し stderr 併用維持)。`Advisory = { plugin, code: "changed" | "never-run", message, stage }`。
- 発火点: `ACTIVATION_ADVISORY_STAGES: ReadonlySet<string> = {"requirements-analysis", "functional-design", "build-and-test"}`(:1293 の単一定数を置換)。emit 経路のガード(:1306)は集合 membership 判定へ。
- ラッチ: `advisoryAlreadyEmitted(runtimeDir, plugin, code): boolean` / `markAdvisoryEmitted(...)` — machine-local runtime 配下(ADR-5)。
- directive 出力: `advisories` 非空時のみフィールドを載せる(stdout JSON のバイト純度契約は「JSON として валid な追加フィールド」で維持 — stdout-directive-stderr-advisory の改訂を stage-protocol 追記に含める)。

## C7: amadeus-sensor-model-completeness.ts

- CLI: `updateModelMap --impl-only` — 分岐条件: model/cfg identity 不変 AND impl findings に reason=changed が存在。効果: entries[].sha256 を実測値へ更新し publish、監査行(SENSOR 系既存語彙の範囲で機械記録)を出す。model/cfg が変わっている場合は `--impl-only` を拒否(誤用ガード — 従来経路を案内)。
- `UpdateModelMapResult` の code union へ `IMPL_ONLY_UPDATED` 系の成功コードを追加(検証劇場回避: 成功コードは実 publish の戻りから導出)。
- MODEL_UNCHANGED の detail 文面へ正規手順(`--impl-only`)を追記(FR-D2)。

## C8: MirrorLifecycle.tla(モデルの操作面)

- 変数: `receipts`(≤ MaxReceipts)、`issueNumber`(null | 定数)、`boundaryQueue`(ADR-3 の4種列)。
- 遷移: prepare / mark-attempted / claim-create-attempt / complete / mark-pending / mark-safety-blocked / retry 系 — reducer 実装(reduceReceiptTransition :746 系)のガード述語4本を TLA ガードへ翻訳。
- invariant: `NoCloseWithoutLandedSync`(出典: #1816/#1607、cid:deployment-execution 系 close-after-landing)/ `NoDuplicateCreate`(出典: #1838、coordinator:235 `if (context.boundary.kind === "intent-capture-approved") return "create";` — issueNumber 非参照の無条件 create)— 各 invariant に出典コメント焼き込み(FR-C2)。

## C10: ci.yml

- `:584` `bun plugins/formal-model-check/tools/run-model-check-ci.ts run --root "${EVIDENCE_ROOT}"` / `:600` 同 verify — パスのみ変更、検証意味論不変。
