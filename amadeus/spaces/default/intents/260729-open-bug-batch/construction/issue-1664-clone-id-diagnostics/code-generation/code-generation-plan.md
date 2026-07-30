# #1664 Code Generation計画

## 対象と追跡

- 対象Issue: [#1664](https://github.com/amadeus-dlc/amadeus/issues/1664)
- 入力fallback: `unit-of-work.md`とuser storiesは`amadeus-bugfix`スコープでexpected absentのため補完せず、`requirements.md`とbrownfieldの既存Bolt証跡からスコープした。
- 対応要件: FR-1664-1〜3、FR-CROSS-1〜4、NFR-1、NFR-4〜6
- 配送単位: 1 Issue = 1 Bolt = 1 [PR #1687](https://github.com/amadeus-dlc/amadeus/pull/1687)
- 配送結果: merge commit `b52a3f36c0290a5b466248fc0c4a00ee798f7d0d`。製品コードは変更せず、test fixtureとt224 integrationだけを変更した。

## 実測根因と要件の整合

- `requirements.md`のAssumptionsは「#1664の最終根因は未確定」としており、探索開始時にsymlink／clone-idを根因として固定しない点は実装結果と整合する。
- [PR #1687](https://github.com/amadeus-dlc/amadeus/pull/1687)は、異なるfixture identityがMD5先頭8桁の同一audit-lock pathへ衝突し、生存ownerがそのpathを占有するとmigrationが`status=1`、`Failed to acquire audit lock after retries`、rollbackへ到達する制御fixtureを追加した。fixture固有の`.git/amadeus-test-audit-locks`へnamespaceを分離すると同じcaseがGreenになる。
- ただし、2026-07-28の元CI失敗にはstdout／stderrが保存されていないため、元事象の直接原因が同じlock衝突だったことは事後証明できない。実装は「同じstatus 1を生む因果的に十分なfixture競合」を是正したものであり、元事象の根因確定という表現は用いない。
- FR-CROSS-2は、当初仮説と異なる根因を得た場合、**実装前**に要件の根因記述と受け入れテストを更新するよう要求する。Git履歴では修正commit `40f31589a`が先、決定的衝突fixture commit `a26c78422`が後であり、この歴史的順序は事後修正できない。ユーザーは2026-07-30のCode Generation Revision 2で、この過去の順序と実装前再確定証拠の欠落だけを明示的にwaiveした。

## FR-CROSS-2限定waiver

- 適用範囲: #1664の修正commitと決定的fixtureの歴史的順序、および実装前の根因再確定証拠の欠落だけ。
- 非適用範囲: ほかのBolt、今後の#1664変更、修正後Green、関連suite、根因証拠の保存。
- 代替統制: audit-lock衝突の制御Red→Green、4境界の決定的失敗注入、clone-id反復安定性、symlink target metadata不変性、unit／integration／E2E。
- 残余リスク: 元CIのstdout／stderr欠落により直接原因は事後確定できず、audit-lock衝突を元CIの確定根因とは扱わない。

## 変更面

| 区分 | 実変更 | 判定 |
|---|---|---|
| fixture helper | `tests/helpers/upstream-v2-fixture.ts` | 衝突する`projectDir`を指定できるtest seam |
| integration | `tests/integration/t224-upstream-v2-migration-cli.test.ts` | subprocess診断、lock衝突の制御再現、fixture固有lock base |
| product | migration／doctor／clone-id／audit-lock実装 | 変更なし |
| distribution | generated harness／self-install | 正本変更がないため再生成なし |

## 実装手順

- [x] **Step 1 — 元事象の診断欠落を確認する**: [Issue #1664](https://github.com/amadeus-dlc/amadeus/issues/1664)と失敗runは`result.status=1`だけを残し、stdout／stderr／終了経路を失っていた。
- [x] **Step 2 — 失敗時だけ診断を保持する**: command、exit-status／signal／spawn-error、status、signal、spawn error、stdout、stderr、clone-id論理／target pathを`expectSuccessfulMigration`の例外messageへ追加した。成功時はreturnするためdumpしない。
- [x] **Step 3 — audit-lock衝突を制御再現する**: 共有lock baseで衝突pairと生存ownerを作り、`status=1`、lock取得失敗、rollbackを確認し、fixture固有lock baseでGreenを確認した。
- [x] **Step 4 — FR-1664-2の4境界を個別注入する**: `runCloneIdDoctorBoundaries`をtest-side portとして追加し、symlink解決、clone-id導出、process起動、fixture cleanupの各境界を個別に失敗注入した。前3境界の失敗でもcleanupが必ず走り、cleanup自体の失敗は`fixture-cleanup`として識別する。
- [x] **Step 5 — clone-id／target不変条件を完全検証する**: `_resetCloneIdForTests`を挟む2回の`auditCloneId`導出値を比較し、実migration後のinstalled doctorも2回実行した。targetのmode／uid／gid／size／mtime／inodeをbefore／after比較し、symlink種別・link先・内容も維持した。
- [x] **Step 6 — rollback／audit隣接契約を検証する**: real doctor失敗時のworkspace／index rollbackと、成功時の`GUARDRAIL_LOADED`／`HEALTH_CHECKED`をt224で確認した。
- [x] **Step 7 — Linux／macOSの対象suiteを確認する**: Ubuntu 24.04・Bun 1.3.13の[Tests job](https://github.com/amadeus-dlc/amadeus/actions/runs/30445827782/job/90558381289)と、macOS 26.5.1 arm64・Bun 1.3.13でmerge commit archiveのt224を実行し、双方62 pass／0 fail／576 expectsだった。
- [x] **Step 8 — Comprehensive戦略を満たす**: 専用unit 6件、既存t224 integration 62件、対象installed migration／doctor E2E 1件を実行した。専用unitが4境界注入と値／metadata不変性、integrationがmigrationと診断、E2Eが利用者経路を分担する。
- [x] **Step 9 — テスト構成を確認する**: 既存のBun test runnerと`package.json`の設定を再利用し、新しいtest configが不要であることを確認する。

## 完了判定

- FR-1664-1の診断契約、audit-lock衝突の制御fixture、fixture namespace隔離、4境界個別注入、clone-id反復安定性、target metadata不変性、unit／integration／E2E Greenは証拠がある。
- 歴史的なFR-CROSS-2の順序違反は限定waiverで受容した。元CI失敗の直接ログ欠落はresidual riskとして維持する。
- 今回のrevisionで承認済みの実装・テスト未解決項目は閉じた。revisionは未commit・未pushであり、既存[PR #1687](https://github.com/amadeus-dlc/amadeus/pull/1687)の配送状態は変更していない。

## Revision 3 実行結果

- focused tests: `bun test --timeout 120000 tests/unit/t224-clone-id-doctor-boundaries.test.ts tests/integration/t224-upstream-v2-migration-cli.test.ts tests/e2e/t224-clone-id-doctor.test.ts` → 69 pass／0 fail／608 expects
- typecheck: `bun run typecheck` → exit 0
- lint: `bun run lint` → exit 0。既存cognitive-complexity warningのみで、本変更のerrorはない。
- 配布: product core／harnessを変更しておらず、test helperとtestだけのためdist／self-install再生成はN/A。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:07:03Z
- **Iteration:** 1
- **Scope decision:** none

実測根因に対する修正方針は妥当だが、要件更新と必須受け入れ証拠が不足しており実装完了を検証できない。

### Findings

- Major: 実測根因をaudit-lock namespace衝突へ変更した一方、requirements.mdは#1664の根因を未確定のまま残し、変更ファイル一覧にも要件更新がないため、根因相違時に実装前に要件と受け入れテストを更新するFR-CROSS-2へ違反する。
- Major: FR-1664-2が要求するsymlink解決、clone-id導出、process起動、fixture cleanup各段階の個別遅延・失敗注入について、summaryは単一のfailure injection overrideにしか言及せず、4境界の決定的ケースを証明していない。
- Major: Comprehensiveテスト戦略に対して変更はhelperとintegration testだけであり、unit・E2Eの不足理由、修正前Red、失敗診断例、要件とテストの双方向対応がsummaryに記録されていない。
- Major: FR-1664-3とNFR-4が求めるLinux CI・macOS双方のclone-id互換、symlink target metadata不変性について、t224の62件Greenと一般的なCI成功だけでは各環境・各不変条件の検証結果を特定できない。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:14:47Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の指摘は明文化されたが是正されておらず、承認済み要件とComprehensiveテスト戦略の未充足が残る。

### Findings

- Major: FR-CROSS-2 — 決定的な衝突fixtureは修正commit後に追加され、audit-lock境界への根因・受け入れ条件の再確定も実装前に行われていない。
- Major: FR-1664-2 — symlink解決、clone-id導出、実process起動、fixture cleanupの4境界について個別の遅延または失敗注入が未実装である。
- Major: FR-1664-3 / NFR-4 — clone-id値の反復比較とsymlink target metadataのbefore/after比較がなく、安定性とmetadata不変性を検証できない。
- Major: Code Generation test strategy / NFR-6 — Comprehensive戦略に必要な専用unit testと対象経路のE2E testがなく、修正前Redの実行証拠もない。

## Revision 2 follow-up配送

- commit: `ddf2494abca68286f81f44438eee802deb040e0a`
- draft PR: [PR #1714](https://github.com/amadeus-dlc/amadeus/pull/1714)
- 最新`main`起点の1 commitとして、4境界fixture、専用unit、t224 integration強化、installed doctor E2Eだけを配送した。
- push前検証: 69 pass／608 expects、typecheck／lint成功。FR-CROSS-2の歴史的順序は限定waiver、追加test群は代替統制として追跡する。
