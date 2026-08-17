# Unit of Work — intent 260816-priority-bug-batch-3

requirements.md の FR-1〜FR-5 を 1 Issue = 1 Unit で 5 unit に分解する(境界戦略の裁定は units-generation-questions.md)。unit 境界は application-design の `components.md`(C1〜C5 の所在・責務)を、各 unit の公開面・メソッド水準の変更方針は `component-methods.md` を、実行単位とデプロイモデルは `services.md`(常駐サービスなし・CLI 契約不変)をそれぞれ正本として引き継ぐ。全 unit の方式は decisions.md ADR-1〜5 の実装契約に拘束される。規模見積りは cid:code-generation:c4-loc-calibration に従い、FD 必須要素(監査証跡・エラー処理・テスト)込みで較正した数値(過去実績 2.1〜2.6 倍の補正込み)。

## Unit 定義

### U1: prc-finalization(FR-3 / #3149、kind: library)

- **境界**: `plugins/github-pr-convergence/tools/`(pr-convergence-cli.ts の merged arm、amadeus-sensor-pr-convergence-report-format.ts の束縛選択、pr-convergence-git-runner.ts の消費点追加)+ 対応テスト(t450 / t481 / t3062 / t3110 系の拡張)
- **責務**: ADR-3(attestation ベース束縛 + in-place finalisation)と ADR-4(human-presence 付き override)の実装。クラスA/B の落ちる実証
- **デプロイ**: 埋込(plugin 投影)。**自己適用注意**: 本 intent の PR 配送が同機構を使う(components.md C3)
- **規模**: L — 実装 ~350 行(finalisation ~120 + 束縛置換 ~80 + override ~150)+ テスト ~450 行
- **制約**: transitionAllowed 無改変。センサー無ネットワーク維持。kind 分岐の grep 全列挙後に着手(ADR-3 契約3)。クラスB 3件の現存性再実測が第一作業(ADR-4 契約4)

### U2: election-append(FR-5 / #3046、kind: library)

- **境界**: `packages/framework/core/tools/amadeus-election-store.ts`(appendPending / readAllPending / 比較関数)+ 対応テスト(t549 / t235 / t373 の拡張 + 並行 repro の integration test + property)
- **責務**: ADR-5(voter スコープ採番、複合一意、辞書式順序)の実装。実プロセス並行の落ちる実証
- **デプロイ**: 埋込(core tool)
- **規模**: M — 実装 ~120 行 + テスト ~300 行(並行 driver + property 含む)
- **制約**: 互換シム禁止。D-09 コメント書換を同一変更に含む(ADR-5 契約3)。medium test は integration に置く(c2-doctor-seam)

### U3: autonomy-refusal-idem(FR-2 / #3152、kind: library)

- **境界**: `packages/framework/core/tools/amadeus-intent-autonomy-production.ts`(emit 除去・純粋読取化・鍵生成関数)、`amadeus-state.ts` gate-start(emit 移設先)、audit-format.md + event-registry 同期 + 対応テスト(t435 / t482 系)
- **責務**: ADR-2(発火点分離 + 冪等鍵)の実装。2条件別々の落ちる実証
- **デプロイ**: 埋込(core tool)
- **規模**: M — 実装 ~150 行 + テスト ~250 行 + 文書同期 ~30 行
- **制約**: `amadeus-orchestrate.ts:2822` を触る場合は model-map ピン + allowlist セレクタ resync(NFR-3)。occurrence 境界の定義(reject 後再提示の計数意味論)を成果物に明記(ADR-2 契約5)

### U4: milestone-presence(FR-1 / #3153、kind: library)

- **境界**: `packages/framework/core/tools/amadeus-lib.ts`(scanPresenceLedger / resolveGatePresence の PresenceSlot 追加)、`amadeus-state.ts` assertHumanPresentForGateResolution(結線)、GATE_APPROVED フィールド追加 + event-registry / audit-format 同期 + 対応テスト(t188 / t208 / t112 系)
- **責務**: ADR-1(milestone 限定 presence 境界)の実装。3点 pin の落ちる実証
- **デプロイ**: 埋込(core tool)
- **規模**: L — 実装 ~250 行 + テスト ~350 行 + 文書同期 ~40 行
- **制約**: 一般 stage-gate の境界 byte-for-byte 非退行。interactionKind の1定義供給は **U3 が純粋読取化した ProductionAutonomyContext を前提とする**(依存)。approve-batch 射程外の #1647 申し送りを含む(ADR-1 契約5)

### U5: source-work-probe(FR-4 / #3156、kind: library)

- **境界**: `packages/framework/core/tools/amadeus-state.ts` :2491-2691(第4プローブ追加)+ 対応テスト(t206 / t185 の拡張)
- **責務**: マージ済み Bolt PR のコードコミット包含検出。両側テスト(受理/拒否)と落ちる実証(注入→赤→revert)
- **デプロイ**: 埋込(core tool)
- **規模**: M — 実装 ~100 行 + テスト ~250 行
- **制約**: t206 は dist 経由 import — `bun run build` 前提(c1-mirror-and-rebuild-before-review / c5-regen-needs-build)。sibling 誤帰属防止の attribution 原則維持

## 再利用棚卸し(reuse inventory)

新規の機構・CI ジョブ・ツールは導入しない。全 unit が既存インフラを再利用する:

- テストランナー(tests/run-tests.sh 4層)・coverage/patch/complexity/drift の既存 blocking gates(NFR-2)
- U1: verifyMergedEpochAncestry(測定は無改変)、verifyLandedPrerequisites(緩和様式)、既存 presence 機構(override の人間承認)
- U2: writeStoreFile(tmp+rename)、readPendingVoter(採番読取の閉じ先)、fast-check(property)
- U3: createInteractionOccurrence(鍵の正本)、UNIT_POOL の replay 様式(dedup)、operationWithLock(emit 移設先)
- U4: scanPresenceLedger / resolveGatePresence / humanActOutstanding の同秒タイ規則、humanTurnIsFresh の境界セマンティクス(1定義共有)
- U5: 既存3プローブの走査基盤(git log / merge-base)、t206 のテスト seam

## 規模バジェット

合計見積り: 実装 ~970 行 + テスト ~1600 行 + 文書同期 ~70 行(いずれも較正済み数値)。intent に明示の規模バジェットは与えられていない。adapter・外部契約の先行着地なし(全 unit が実装+配線+テストを同一 unit 内に持つ)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-17T02:08:25Z
- **Iteration:** 1
- **Scope decision:** none

3成果物はステージ契約・inception規則(数値LOC見積り・reuse inventory・adapter先行禁止)・上流ADR/FR/1Issue=1Unitと整合しBLOCKERなし。上流3成果物の未引用と行域非重複主張の出典不足を含む4件をFOLLOW-UPとして指摘。

### Findings

- FOLLOW-UP | upstream-coverage 未充足の懸念: consumes に required:true で列挙される components / component-methods / services の3成果物が、unit-of-work.md・unit-of-work-dependency.md・unit-of-work-story-map.md のいずれの本文にも一度も明示的に引用されない(全文照合で0件、decisions.md/requirements.md/component-dependency.mdのみ引用あり)。unit境界の記述内容(関数名・ファイルパス・行域)はcomponents.md/component-methods.mdのC1〜C5表と実質的に一致しているが、ステージ自身が宣言するupstream-coverageセンサーの失敗モード記述(『missing upstream references... this stage consumes components, component-methods, services...』)に照らすと形式上の引用が欠落している。sensorはこのプロジェクトでは advisory 分類のためBLOCKERとはしないが、各unit定義の冒頭かreuse inventory節にcomponents.md/component-methods.md/services.mdへの明示参照を追加することを推奨
- FOLLOW-UP | unit-of-work-dependency.mdの『共有ファイル』記述『amadeus-state.tsをU3(gate-start emit移設)/U4(presence結線)/U5(プローブ追加)が触る — 行域は非重複(component-dependency.mdのファイル交差表)』は出典の射程を超えている。component-dependency.mdのファイル交差表が明示的に非重複を確認しているのはFR-1(U4, :3721-3772)とFR-4(U5, :2491-2691)の組のみであり、FR-2(U3)の行はamadeus-intent-autonomy-production.tsと(q2裁定次第で)amadeus-orchestrate.ts:2822のみを挙げ、amadeus-state.tsへの言及がそもそも存在しない。decisions.md ADR-2(tie→ユーザー裁定Aで確定)によりU3の担当範囲へ新たにamadeus-state.ts『gate-start』emit移設が追加されたが、その正確な行域はcomponents.md/component-methods.md/component-dependency.mdのいずれにも記載がなく未確定のまま。3-way非重複という主張は現時点で未検証であり、根拠の弱い安全宣言が2.8の直列化判断を誤導するリスクがある。出典の訂正、または行域TBDである旨の明記を推奨
- FOLLOW-UP | U4(milestone-presence)の境界(unit-of-work.md)はamadeus-lib.tsとamadeus-state.tsのみを列挙し、components.mdのC1『所在』が明示するamadeus-presence-reservation.ts(humanTurnIsFresh)を含まない。一方でADR-1実装契約2は『境界セマンティクスはhumanTurnIsFresh(presence-reservation)と同一定義を1箇所で共有』と明記しており、この共有が読取専用の参照なのか同ファイルへの変更を伴うのかが不明瞭。U1(prc-finalization)のoverride最終化もreuse inventoryで『既存presence機構(overrideの人間承認)』を再利用すると述べており、両unitが同じhumanTurnIsFreshに依拠する可能性がある。team-leadが挙げた『U1のoverride人間承認とU4のpresence変更の関係』はこの点で未確定 — 読取専用で干渉なしと確認できるなら明記し、変更を伴うならU4の境界とU1の制約の双方に相互参照を追加することを推奨
- FOLLOW-UP | unit-of-work-story-map.mdの『横断関心事』節が指摘するaudit-format.mdの行域重複(『U3とU4が同一行域:150/:297周辺を編集』)は、unit-of-work-dependency.mdの『統合点』『共有リソース』節には反映されていない。本ステージの目的(2.8 delivery-planningがBolt順序付けに読む依存DAGの生成)に照らすと、この具体的な文書同期コンフリクトはdependency成果物側に集約すべき統合点であり、story-map側にしか現れない現状では2.8がstory-mapを横断参照しない限り見落とすリスクがある。dependency成果物の『統合点』または『共有リソース』節への転記を推奨
