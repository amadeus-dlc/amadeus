# Election Record
Election ID: E-260819-RFC0001-TLA-ROUTE
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-tla-route: intent 260815-rfc-autonomy-modes(RFC-0001 Intent Autonomy Modes、実装は 13 unit の PR として着地済み)の tla-authoring ステージの適用性ルートを裁定せよ。ステージ本文(.claude/plugins/formal-model-check/stages/tla-authoring.md の Steps 1)は、選定した subject を new-subject / semantic-change / impl-only / non-target に分類し、未登録の選定集合は author-new へ、選定集合が空なら terminal not-applicable を記録して成功終了せよと定める。既存の登録モデルは BoltPrAttestationGate / FormalElection / MirrorLifecycle / PrConvergenceGate の4件。要件は amadeus/spaces/default/intents/260815-rfc-autonomy-modes/inception/requirements-analysis/requirements.md(FR-1〜FR-15、NFR 5件)。判断にあたっては (1) ステージ本文 Steps 1 (2) team.md § Testing Posture の二層検証の発火条件 (3) project.md の cid:tla-authoring:tla-spec-change-discriminator と cid:tla-authoring:tla-impl-only-evidence-shape を実読すること。実測済みの証拠は各選択肢の description に転記してあるが、鵜呑みにせず自分で再実行して確認すること。
Established: author-new(FR-3 の waiting terminal を新規 subject として登録しモデルを起こす) (choice 2)
Choice counts:
- Choice 1 impl-only(terminal ルート。モデルの新規作成・改訂を行わない): 0
- Choice 2 author-new(FR-3 の waiting terminal を新規 subject として登録しモデルを起こす): 2
- Choice 3 not-applicable(選定集合が空。terminal 記録のみ): 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-19T08:24:22Z] GoA 2: author-new に進む前に選定集合の境界を確定させること。私が選定基準を満たすと実測できたのは FR-3(waiting terminal の三分割と ledger 束縛の rate 制約)であり、FR-4 は同一状態機械の裁定順序として同梱すべきだが、FR-5(semi projection)/ FR-6(乖離 loud fail)/ FR-12(presence fail-closed)は project.md の discriminator が名指す除外2類型(fail-closed 拒否ガードの追加 / 既存経路が既に持つ契約への対称性回復)に該当するため選定集合へ入れない。subjects declare は FR-3 (+FR-4) に絞ること。また実装は既に 13 unit で着地済みであり、本ルートは gating ではなく事後の形式検証になる — その位置づけを applicability-assessment へ明記し、step 5 の human gate でコスト是非を人間へ提示すること。
- Reservation subagent-2 [original:2026-08-19T08:23:32Z] GoA 2: ballot に revise-model が選択肢として無い点を留保する。独自 census で BoltPrAttestationGate.tla:74-77 の AutonomyDecisionSafe(humanQuestion = FALSE / authorityDecision = continued => candidateCount = 1 / refused => candidateCount # 1)と :156-158 の ResolveAuthority(authorityDecision' = IF candidateCount = 1 THEN continued ELSE refused)を発見した。これは FR-1 の unique/contested/none と FR-4 の『対話→人間』経路に語彙上きわめて近く、一見 revise-model を要するように見える。実読で追跡した結果、この candidateCount は degrade の unit ディレクトリ解決(amadeus-orchestrate.ts resolveDegradeUnit :4624-4637 の candidates.length === 1)を抽象しており、commit d7ffaa544(#2999『Fix multi-Unit Delivery Bolt PR attestation』)が導入した Delivery Bolt authority(approved-plan / engine-singleton)の抽象であって RFC-0001 の推薦梯子ではない、と判定した。したがって revise-model は不要で author-new が正しいが、この判定は authoring 段で再確認すべきであり、新モデルの scope 境界は AutonomyDecisionSafe と衝突しない形(Delivery Bolt unit 解決を subject に含めない)で明示的に引くこと。あわせて author-new の subject は FR-3(waiting terminal)を中核とし、FR-1/FR-4 のうち waiting へ流れ込む裁定経路までを境界とすること — FR-7/FR-8/FR-13/FR-14 等の非並行 FR を選定集合へ混ぜない。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-19T08:24:44Z run=run-1