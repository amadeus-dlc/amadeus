# Business Logic Model — u3-lifecycle-integration

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

U3 は unit-of-work の定義どおり、U1/U2 の同期機構を **lifecycle の全 boundary へ配線**し、story-map ジャーニー3(「フェーズが進むたびにボードの列が動き、完了時だけ Done で閉じ、park では動かない」)を成立させる。requirements FR-3c/3d・FR-4・FR-8・FR-10a を components の lifecycle/executor 割付へ落とす。外部境界の挙動は services に従う。

## boundary 別の同期挙動(既存5種 boundary への配線)

| boundary(既存 — 新設なし) | Project 同期の挙動 |
|---|---|
| intent-capture-approved(create) | U1 の直線経路(追加+現在フェーズ Status = 典型 `Ideation`) |
| phase-verified(sync) | **遷移後の現在フェーズ**の期待 Status へ同期(FR-3d — `Lifecycle Phase` フィールドを読む。boundary の `phase` 引数は前フェーズなので使わない) |
| parked(sync) | Status mutation を発行しない(`expectedProjectStatus` が `keep` — FR-4a)。Issue 本文の同期は従来どおり |
| workflow-completed(final sync → close) | final sync で全同期対象を `Done` へ(FR-3c)。**close は completionProjectGate が ready の場合のみ**(下記) |
| manual(create/sync/close) | 明示操作。park 中の manual sync も registryStatus=parked により `keep`(FR-4b) |

## completion ゲート(FR-8)— 台帳と operation receipt の層分離

**層分離の規約(Critical 是正 — 既存状態機械との整合)**: `safety-blocked` は operation receipt に書くと既存 policy の terminal-block 分類(実装直読: amadeus-mirror-policy.ts:61-65 `TERMINAL_BLOCK_STATUSES = [skipped-for-event, safety-blocked, abandoned]`、:219 `if (sync === "terminal-block") return null`)により **completion boundary が恒久停止**し、FR-7b の reconcile 委譲(Issue の「次の eligible boundary…で冪等に reconcile」)と矛盾する。そこで:

- **Project 台帳(projectSync — U2)**: 3状態(synced / pending / safety-blocked)の真実を保持。診断・警告・repair status(U4)は台帳の safety-blocked を表示する — FR-6b の「sync を safety-blocked にする」はこの per-Project 面で成立(FR-6b の受入基準自体が per-Project の safety-blocked+診断をテスト対象としている)。
- **operation receipt(sync 操作)**: Project 同期が未完(pending / safety-blocked を問わず)の間は **`pending`(IN_PROGRESS 分類)** に留める。`nextCompletionOperation` は "sync" を返し続け(実装直読: policy.ts:218 `if (sync === "in-progress") return "sync"`)、次の boundary / manual sync で再試行される。operation receipt に safety-blocked を書かない。

手順:

1. final sync 実行後、台帳(U2 完全形)を読み `completionProjectGate(state)` を評価: 全同期対象 Project の entry が `synced` かつ lastAppliedStatus が `done` 名 → ready。
2. ready でない場合、**close 操作へ進まない**(FR-8b — 受入条件10 の close 阻止面)。sync の operation receipt は `pending` に留め(上記層分離)、blocking の内訳(safety-blocked の Project 列)は警告と台帳で可視化。次の boundary / manual sync で U2 の reconcile が再評価する。
3. ready の場合のみ既存の close 経路(closeIssue)へ進む — `final sync → close` の順序は既存 nextCompletionOperation の1操作ずつ前進(components の「coordinator 無変更」)をそのまま使う。

<!-- Text fallback: workflow-completed では sync(Done 化)→ gate 評価 → ready のときのみ close。ready でなければ sync receipt は pending のまま(operation 面に safety-blocked を書かず恒久停止を回避)、blocking 内訳は台帳・警告で可視化し、次回 boundary の reconcile へ委ねる。 -->

## prompt モード ask 文言(FR-10a)

- prompt モードの操作 ask(既存の操作単位 binding)に Project 面の要約1行(**同期対象 Project 数**(手動追加分を含む所属実態 — FR-3f)と適用予定 Status。create 時は追加予定の対象 Project も明示)を内包する。**新しい ask 種別は作らない**(同意境界 = create/sync の bounded な一部、Q1 裁定)。文言はテストで固定(ui-less-mockups-as-output-contract の verdict 別出力様式)。

## 検証面

- 各 boundary 種別×同期挙動の表を integration テストで全行固定(lifecycle runtime 注入の既習様式 — services のプロセス境界内)。
- close 阻止: Done 未達 Project を1件残した completion で close mutation 0 回を assert。全 Done 後の再実行で close 実行。
- parked: parked boundary と park 中 manual sync の両経路で Status mutation 0 回(FR-4 受入基準)。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T08:06:25Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Critical(terminal-block 衝突)は BR-U3-9 の層分離で閉じたが、閉包根拠の実装引用の行範囲誤り(:55-64 → 実際は :61-65)と、domain-entities.md の completionProjectGate 型が component-methods.md:72 の canonical シグネチャ(blocking 常時必須のフラット型)と無申告で矛盾する Major 2件。

### Findings

- [Major] business-rules.md:16 / business-logic-model.md:19 の amadeus-mirror-policy.ts:55-64 引用は行範囲誤り — 実測では :55-59 が IN_PROGRESS_STATUSES、TERMINAL_BLOCK_STATUSES の宣言は :61-65。引用値3値は正だが行ポインタが別配列を指す(mechanism-cite-verify-at-draft / verbatim-quote-with-cite 違反)
- [Major] domain-entities.md:18-19 の completionProjectGate 戻り値(判別ユニオン、ready:true で blocking 欠落)が上流 component-methods.md:72 の { ready: boolean; blocking: readonly string[] }(blocking 常時必須)と構造的に矛盾し逸脱申告なし(cross-unit-type-verbatim-check)
