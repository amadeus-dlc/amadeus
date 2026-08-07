# Business Rules — landed-report(functional-design)

上流入力(consumes 全数): `requirements`(FR/AC — 規則の合否面)、`unit-of-work` / `unit-of-work-story-map`(適用単位)、`components` / `component-methods`(契約)、`services`(境界)。制御フローと型は姉妹成果物(`business-logic-model.md` / `domain-entities.md`)を正本とする。

## BR 一覧

- **BR-1(fail-closed 保存)**: `PrLifecycleState.parse` は `OPEN | CLOSED | MERGED` 以外を throw する。GraphQL enum の将来値追加時は無音通過せず boundary エラー(exit 2 経路)になる。既存 `MergeStateStatus`/`Mergeable` の parse は無改変。
- **BR-2(landed の排他)**: landed 経路は MERGED でのみ発火し、OPEN/CLOSED では resolveMergeable 以降の既存経路が byte 同一の挙動を保つ(AC-2c: t446/t448 無改変 green + 負方向テスト)。
- **BR-3(機械導出)**: landed report の全フィールドは GhSpawn 応答と `seams.now()` から機械導出する。手入力値・環境変数・ハードコード値を含めない(cli.ts:86-88 原則)。MERGED なのに mergedAt/mergeCommitOid が null の応答は LandedFacts.parse が throw(不完全な事実を landed として記録しない)。
- **BR-4(裁定非含有)**: landed は人間裁定を含まない — HUMAN_TURN を読まず(AC-3b)、audit の emitDecision 経路を使わない。override(裁定記録)との意味論分離を report の kind と stage 文書の両面で明示する。
- **BR-5(informational の非昇格)**: `checkRollupState` は記録するが、landed の成立条件・センサーの必須検査のいずれにもしない(Q3=A、predicate :176-178 の設計意図保存)。
- **BR-6(exit 契約)**: status の exit は landed=0 / converged=0 / not=1 / fault=2。判別は JSON `verdict` フィールドが担う(exit の意味論「呼び出し元に残作業があるか」を保存 — RA Q1=A)。
- **BR-7(語彙3面同期)**: `landed` 語彙は (i) cli の kind union (ii) sensor の閉集合+専用規則 (iii) stage 文書、の3面を同一 PR で同期する(RE 注意1)。t450 が (i)⇔(ii) のドリフトを fixture で固定する。
- **BR-8(スコープ外の防衛)**: override 経路・evaluateConvergence 本体・resolveMergeable(predicate.ts:249-269)のシグネチャとリトライ意味論・engine 本体は変更しない。evaluateConvergence(predicate.ts:180-192)は**バイト不変**とし、verdict 判別子は EvaluatedVerdict ラッパ(domain-entities 参照)が cli 側の組み立て点で付与する。primed ラッパは evaluate 内の局所純関数とし、resolveMergeable への依存注入契約(fetchRawPrState/sleep)を変えない。

## 受け入れ基準との対応

BR-1→AC-1b / BR-2→AC-2a,2c / BR-3→AC-1a(観測源 = 拡張クエリの fixture 実測),AC-3a / BR-4→AC-3b / BR-5→AC-4a(検査しない側)/ BR-6→AC-2b / BR-7→AC-3c(render 出力のセンサー PASS),AC-4a,4b / BR-8→AC-2c + Constraint(静的契約 — 検証手段: t448 追補で override 経路の無変更を既存テスト無改変 green として機械確認、resolveMergeable 契約は t446 既存テスト無改変 green で確認 — `cid:functional-design:c6` の検証手段バインディング)。
