# Code Generation Plan — repository-adoption

## 対象とトレーサビリティ

本計画は Unit `repository-adoption`、Issue #1979、先行 Unit U1〜U3 の統合、CI blocking、23件の closed evidence receipt、および当該 Unit の Functional／NFR Design に対応する。

## 実装計画

- [x] Step 1: `no-silent-drop` entrypoint に閉じた `--base-revision <full-sha>` parser を追加し、未知／重複／欠落／short／zero SHA を起動前に拒否する。対応: **FR-09、FR-13、SC-07、NFR-03**（trusted revision のfail-closed）。
- [x] Step 2: 既存 CI lint job に fetch-depth 0 と独立 blocking step を追加し、event別SHA検証後に GNU timeout で gateを1回だけ実行する。対応: **FR-13、SC-01、SC-07、NFR-03、NFR-09**（CI enforcement、hang deadline）。
- [x] Step 3: 23 ID の schema v1 evidence registry、receipt validator、event revision、deadline argv、timing、capacity fixture を実装する。対応: **FR-06〜FR-09、FR-15、SC-03、SC-04、SC-07、NFR-04**（closed proof registry）。
- [x] Step 4: PR／fork PR／push、workflow構造、timeout、5 cold＋5 warm、capacity r0／r2／r4 の unit／integration／performance testを追加し、既存 `t407`／`t411` と repository integration で #1963 の loud-failure 契約を維持する。対応: **FR-12、FR-13、FR-15、SC-01、SC-03、SC-07、NFR-01、NFR-06**（Comprehensive test strategy）。
- [x] Step 5: 先行 U1／U2 の complexity 新規違反を baseline 追加せず、private helper 抽出で CCN≤15へ追補する。対応: **NFR-05**（complexity receipt）。
- [x] Step 6: package apply→promotion apply、package／promotion check、typecheck、lint、complexity、focused regressionを実行する。対応: **FR-14、FR-15、NFR-08、NFR-09**（canonical source と配布整合）。
- [x] Step 7: clean implementation revision で full／coverage aggregateを実行し、normalとnamed isolatedの双方をexit 0にする。対応: **FR-15、NFR-06、NFR-07、Completion Criteria 1／6**（full-test／coverage receipt）。
- [x] Step 8: coverage allowlistの同一claimを現行行へ再pinし、新規U4行は実テストで覆い、patch／project両gateをgreenにする。対応: **FR-15、NFR-07**（coverage ratchet）。
- [x] Step 9: 23件すべてを tested implementation revision と実測digestに結び、evidence-only commitで閉じる。対応: **FR-15、NFR-04、Completion Criteria 1**（自己参照のない証跡昇格）。
- [x] Step 10: test configurationを独立検証する。既定のper-test timeout 30秒を維持し、明示 `--test-timeout-ms 120000`（必要時は実装済み上限内の `300000`）をfull／coverageのaggregateとnamed isolatedに同条件で適用する。欠落／非整数／0以下／300000超をusage errorで拒否し、test-size `medium` と全実行形態を検証する。対応: **NFR-06、NFR-07**（既存Bun test runner設定の有効性と境界）。

## 非適用項目

新規CI job、required check、service、credential、artifact upload、DB、HTTP、UI、デプロイ資産は追加しない。test runnerは既存Bun設定と既定30秒を維持し、証跡用の明示timeout overrideだけを追加する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T13:16:15Z
- **Iteration:** 2
- **Scope decision:** none

前回blockerへの追補は記録されたが、coverage gate証拠、tested revision追跡、receipt対応表、計画トレーサビリティに未解決事項がある。

### Findings

- Critical: coverage normalはexit 4 known-timeoutだがregistryをok:trueとしており、aggregate coverage gate exit 0をnamed isolated成功で代替する承認済み例外がない。十分なtimeoutでcoverage gate全体をexit 0にするか、overall failまたは上流承認済み代替規則が必要。
- Major: tested implementation 05bce75a2facb841ba07ea4eb66e385f5eb2f610が全追補を含むancestry、tree digest、manifest対応をartifactから追跡できない。最終treeに対するclosed registry検証結果を記録する必要がある。
- Major: canonical evidenceのliteral path、artifact digest、23 receipt ID一覧と25 runsとの差分理由がCode Summaryにない。IDからartifact path／digest／tested revisionへの対応を記録する必要がある。
- Minor: Code Generation PlanにSC／FR ID単位のstep traceabilityと、既存test configurationを検証する独立stepがない。

## Request Changes 解消 — Revision 4

- Critical: `full-test` と `coverage` のnormal／isolatedを120,000msで実測し、tested implementation と final evidence HEAD の双方で4実行すべてexit 0を得た。`known-timeout` の成功昇格は廃止した。
- Major — revision binding: tested implementation `8a67ffc536be242d8a98128f4ba333cfbf6ccc4f`、tree `9e94ea5a28959995342806724a2dd9a28e82709e`、immediate evidence-only commit `ef0f203e3f0eb3267c3d48d548d87aa2151bfa1f`、evidence tree `1aca2f98bd9a36253e454061c9b3d6aa275d45f6` を記録した。両commitはcurrent branch `HEAD` の祖先で、current treeはevidence treeと一致する。
- Major — evidence traceability: Code Summaryに51変更パス、canonical literal path、manifest／artifact／bootstrap digest、pre／post source manifest digest、23 receipt IDからrun／record ID／binding digest／artifact path／artifact digest／tested revisionへの対応表を追加した。25 runは21 primary＋full 2＋coverage 2である。
- Minor: Step 1〜10へ具体的なFR／SC／NFR IDを付与し、FR-12の既存回帰契約と独立したtest configuration検証をStep 4／10に追加した。
- Root verification: focused 101件、`bun run check`、package／promotion drift、`git diff --check` はすべてgreen。lintの373 warnings／22 infosは既存baselineである。
