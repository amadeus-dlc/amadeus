# Requirements — Issue #2361 formal-model-check macOS provider 修正(intent 260814-fmc-macos-provider)

## Intent 分析

macOS で `run-model-check` の既定 provider 経路(`--provider auto` → sandbox-exec 固定)が、環境検査失敗時にフォールバックを持たず `ENVIRONMENT_UNAVAILABLE` で不通になる(Issue #2361、xrev-260814-2361 2名 CONFIRMED_WITH_REFINEMENTS)。目標は (1) auto の実効性判定と Docker フォールバック(両方不可なら fail-closed)、(2) JDK 検証のパッチ版完全一致を major 26 一致へ緩和し README 契約と整合させること。提案3(診断性)は PR #2453 で着地済みのため対象外(ユーザー指示 手順4)。

上流入力: RE は xrev differential scan(base `89532174c` → observed `5f6b5bf97`)。本 intent の患部機序は `codekb/amadeus/architecture.md` の現在節と `codekb/amadeus/re-scans/260814-fmc-macos-provider.md` に記録済み。`codekb/amadeus/business-overview.md` はチームモード撤去節に加え、患部固有の業務判断節(:47-56「本 intent の業務課題 — macOS 既定で formal-model-check が通らない」)を含み、Issue #2361 の2主張の独立分類 — (1) provider フォールバック不在は「文書がむしろ環境適応を約束しており bug としての性格が明確」、(2) JDK ピン厳格さは「deliberate と明示宣言した既存契約の変更であり仕様変更に当たる可能性が高い」 — をここでも独立に裏付けている。本要件の FR-1〜FR-4(bug 回復)/ FR-5〜FR-7(仕様変更、裁定者=ユーザー指示)の切り分けはこの分類を根拠として引き継ぐ。`codekb/amadeus/code-structure.md` は本 intent での更新面(ファイル増減)のみを反映しており、患部固有の主張はこの面からは引かない(cid:requirements-analysis:c4-consume-header-is-not-citable-content)。

## Functional Requirements

### FR-1: auto(darwin)の Docker フォールバック

`--provider auto` かつ darwin で、sandbox-exec 経路の環境検査(`inspectDarwin`: JDK 検出/バージョン・sandbox-exec 実在・network-deny probe)が失敗した場合、Docker planner で再試行して完走できること。
受入: unit テストで「darwin + auto + darwin 検査失敗 + docker 検査成功 → 実行が docker 経路で成立し outcome が TLC 実測由来」を assert(タイミングシーム/fake port で検証、実 TLC 不要)。

### FR-2: 両経路不可なら fail-closed

FR-1 のフォールバック先 Docker も不可(docker CLI 不在・image inspect 失敗等)なら、`ENVIRONMENT_UNAVAILABLE` の HARNESS_ERROR(exit 2)で停止し、成功を偽装しないこと。errorDetail には一次失敗(darwin 検査)とフォールバック失敗(docker 検査)の両方の理由が含まれること。
受入: unit テストで両検査失敗時に exit 2 / ENVIRONMENT_UNAVAILABLE / 両理由の包含を assert。

### FR-3: 明示 provider にはフォールバックしない

明示 `--provider sandbox-exec` / `--provider docker` は従来どおり単一経路で、検査失敗は即 fail(フォールバックなし)。`sandbox-exec` × 非 darwin の `PROVIDER_PLATFORM` 拒否も不変。
受入: 既存テスト(t-formal-verif-tlc-spawn-planner.test.ts:188 の PROVIDER_PLATFORM)グリーン維持 + 明示 provider で fallback が発生しないことの assert。

### FR-4: env-receipt は実走 provider と整合

フォールバックで Docker が走った場合、env-receipt の inspection plan は docker 側(`DOCKER_INSPECTION_PLAN`)と整合し、事前失敗 receipt の判定(`createNotRunPlannerReceipt`、tlc-spawn-planner.ts:68)と planner 選択(:526)の auto 判定が乖離しないこと。receipt スキーマ(`amadeus.env-receipt.v1`)は変更しない(裁定 Q2=A、auto-decision-2586119774c425a67d6eb897e7b134bf)。
受入: unit テストで fallback 経路の receipt plan が実走 provider と一致することを assert。

### FR-5: JDK 検証を major 26 一致へ緩和

Darwin 経路の JDK 検証を「Temurin/OpenJDK major 26(26.x.y 任意)」受理へ緩和する。対象は RE scan §1-3 の全6面: (A) `FIXED_JDK_RUN_PROFILE.version`、(B) `createJdkDistributionManifest` の完全一致比較、(C) `JdkDistributionManifest` の型リテラル、(D) `inspectDarwin` の実行時正規表現(tlc-spawn-planner.ts:152)、(E) `#verifyJavaVersion`(fs-tlc-toolchain.ts:1331)、(F) `DARWIN_INSPECTION_PLAN` の expected 文字列。実際に検出された完全バージョンは既存の receipt 実測面(jdkIdentity: versionOutput の canonical digest)で引き続き記録される(再現性の監査可能性は維持)。
受入: unit テストで `26.0.2` 系の version 出力が受理され、`25.x` / `27.x` が拒否されることを assert。

### FR-6: 文書契約の整合(仕様変更の明示)

README の内部矛盾(`plugins/formal-model-check/README.md:60-62` の major 26 vs `:74-79` の patch 完全一致 deliberate 宣言)を major 26 契約へ統一し、`mise.toml:3-5` のコメントも同時に更新する。mise の完全版ピン自体は開発既定の供給手段として維持する(裁定 Q1=A、auto-decision-4698c9378a8cd4edff7a840a73c0dd17)。この統一は PR #2453 が明文化した patch 完全一致宣言の変更(仕様変更)であり、その裁定者はユーザー指示(2026-08-14 着手指示 手順4「README 契約(major 26)と実装の整合を取る方向を基本」)である。
受入: 変更後 README / mise.toml に patch 完全一致を契約として宣言する記述が残存しないこと(grep で不在確認)。

### FR-7: 仕様変更としてのテスト更新と退行防止テスト新設

現行 `t-formal-verif-tlc-spawn-planner.test.ts:186-187` は `.ok` のみの assert で退行を検出しない(RE scan §1-5)。auto 選択の意図(darwin→sandbox-exec 優先、検査失敗時 docker、非 darwin→docker)を planner 種別まで assert するテストを TDD で新設し、エラー文言に依存する既存テスト(t-formal-verif-run-model-check.integration.test.ts:263-272 の `OpenJDK 26.0.1 verification failed` 等)は新文言へ更新する。
受入: 新設テストが修正前実装で赤・修正後で緑(落ちる実証)。フルスイート(`bash tests/run-tests.sh --ci`)グリーン。

## Non-Functional Requirements

- **NFR-1(再現性の維持)**: model-check receipt の再現性契約は「実測記録」で担保する — 検証は major 26 受理でも、実走 JDK の完全バージョンと identity digest は receipt に記録され続けること(FR-5 の受入に含む)。
- **NFR-2(fail-closed)**: いかなる経路でも検証不能を成功として報告しない(FR-2)。検証結果は実行結果由来のみ(検証劇場禁止)。

## Constraints

- 後方互換シム・フォールバック用二重実装の追加禁止(既定挙動の置き換えとして実装する。auto フォールバックは要求仕様そのものであり互換レイヤーではない)。無関係ファイルへの変更禁止(ユーザー指示)。
- `tests/.coverage-patch-allowlist.json:1469-1477` の意味的セレクタ fingerprint が患部(tlc-spawn-planner.ts:128-185)を被覆しており、患部編集時は同一変更で fingerprint を再計算する(RE scan §2 末尾)。
- 提案3(診断性改善)の二重実装禁止(PR #2453 着地済み)。
- TDD 必須(team.md Testing Posture)。TLC/Docker の実実行は不要 — タイミングシーム・fake port で unit/integration 検証(ユーザー指示 手順6)。
- PR は Bolt ごと・スカッシュマージ。マージは人間専権(CI green + レビュー READY で停止して報告)。

## Assumptions

- `--provider auto` の意味は「現在の環境で実行可能な provider を選ぶ」(plugins/formal-model-check/stages/formal-model-check.md:45 の "letting it select the execution provider for the current environment" と整合)。フォールバック不在を宣言した文書は存在しない(RE scan 述語 N)。
- フォールバックの具体的な挿入点(選択時 async probe / snapshot 失敗後の再試行 — RE scan §4-1 の3択)は code-generation 計画で確定する。要件はフォールバックの観測可能な挙動(FR-1〜FR-4)のみを拘束する。

## Out of Scope

- 提案3(診断性改善)— PR #2453 着地済み。
- advisory ループ(run-now 選択後の defer-with-risk 切替不可)— Issue #2967 / PR #2980 で別途着地済み(xrev reviewer-2 の C5 精査事項)。
- Docker image digest ピンの変更、CI(Linux)経路の挙動変更。
- mise.toml の JDK ピン値の変更(裁定 Q1=A)。

## Open Questions

- フォールバック挿入点の設計選択(RE scan §4-1: (a) 選択時 async probe / (b) snapshot 失敗後再試行 / (c) 同期 probe のみ — (c) は #2361 を解決しないことが実測確定済み)。code-generation 計画時に確定し、判断が割れる場合はソロ選挙にかける。
- JDK 緩和の「落ちる実証」を実環境(AMADEUS_RUN_REAL_TLC=1)で取るか fake port で足りるか — build-and-test で確定(ユーザー指示 手順6 により実 TLC 不要が既定)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T01:20:11Z
- **Iteration:** 1
- **Scope decision:** none

構造・FR数・受入基準は概ね良好だが、business-overview.md の内容を誤って「患部固有の主張なし」と記述し、独立に存在する裏付け根拠(bug/仕様変更の分類)を無申告で欠落させている

### Findings

- BLOCKER | requirements.md:7 は「codekb/amadeus/business-overview.md は本 intent での更新面(チームモード撤去・ファイル増減)のみを反映しており、患部固有の主張はこの2面からは引かない」と記述するが、これは事実と異なる。business-overview.md:39-56 には '運用形態の縮小と、macOS 既定での検証不能' 節があり、うち47-56行目は '本 intent の業務課題 — macOS 既定で formal-model-check が通らない' という Issue #2361 固有の内容(provider フォールバック不在=bug、JDK ピン厳格さ=仕様変更の可能性、という独立分類)を含む。この分類は FR-1〜4(bug/fail-closed)と FR-5〜7(仕様変更)の切り分けと完全に一致する裏付け証拠であり、team.md の traceability 原則(全要件は ideation/RE 成果物まで遡れる)と cid:requirements-analysis:mechanism-cite-verify-at-draft(引用は起草時に実測し不在主張は全域確認する)に照らして、上流参照の正確な記述と裏付けの明示が必要。現状は誤った不在主張により、実際に存在する独立裏付けが引用されないまま欠落している。是正: business-overview.md:47-56 の分類を FR-6(仕様変更の明示)または Intent 分析の根拠として引用し、line 7 の記述を『チームモード撤去節に加え、患部固有の業務判断節(47-56行目)も含み、bug/仕様変更の分類はここでも独立に裏付けられる』へ訂正する

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T01:31:23Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1のBLOCKER(business-overview.md不在誤記)は実内容と一致する形で是正済み。全体再レビューでも新規BLOCKERなし。

### Findings

- None
