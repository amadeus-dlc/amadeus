# Components — standing-delegation-grant(Issue #1125)

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜8・E-SDG-RA/RA2 裁定焼き込み)、`../../ideation/feasibility/constraint-register.md`(C-1〜C-10)、codekb `code-structure.md`(delegate provenance 観測節)・`architecture.md`・`component-inventory.md`(いずれも本日 RE 現況)、`../practices-discovery/team-practices.md`(変更 0 件 — practices 制約なしの確認)

## コンポーネント一覧

| # | コンポーネント | 種別 | 正本パス | 規模見積 |
|---|---------------|------|---------|---------|
| C-1 | grant/revoke verb ハンドラ | 既存1ファイル改修 | `packages/framework/core/tools/amadeus-state.ts`(handleGrantStandingDelegation / handleRevokeStandingDelegation+dispatch case 2行) | 〜120行 |
| C-2 | 受理検証(第2経路) | 既存2ファイル改修 | `amadeus-lib.ts`(verifyStandingGrant 純関数群+TTL 定数)、`amadeus-state.ts`(assertHumanPresentForGateResolution:1781(approve のみ)と handleDelegateApproval:1957 の受理分岐 — handleDelegateRejection:2069 は授権範囲外の意図的除外、ADR-7) | 〜140行 |
| C-3 | 既定除外分類 | C-2 に内包 | phase-boundary = `findStageBySlug`(lib:5043)+`nextInScopeStage`(lib:5065)で導出(state.ts:1332 / :1849-1852 の独立2実装と意味論等価な第3の同型実装 — ADR-5)/ walking-skeleton = Skeleton Stance(setter :572、消費 orchestrate.ts:683+:711)+scope 先頭 construction 判定 | (C-2 込み) |
| C-4 | doctor 可視化 | 既存1ファイル改修 | `amadeus-utility.ts`(DoctorCheck 行 — :912-932 様式) | 〜30行 |
| C-5 | 監査 taxonomy・偽造耐性 | 既存2ファイル改修 | `amadeus-audit.ts`(PRESENCE_PROTECTED_EVENTS :766 へ GRANT_ISSUED/GRANT_REVOKED 追加)、`knowledge/amadeus-shared/audit-format.md`(taxonomy 追記) | 〜20行 |
| C-6 | テスト | 新規 TS | `tests/integration/t-standing-grant.test.ts`(赤側6種+白側 sweep+一時状態 fixture+決定性) | 〜260行 |

## 再利用棚卸し(reuse inventory)

- verifyDelegatedProvenance(lib:2528)の実在照合様式 — **verbatim 対照**(grant 検証は同族の第2関数、既存関数は無改修)
- 接地ゲート様式(state:1975)・DELEGATED_APPROVAL フィールド様式 — 発行 verb の対照
- DEFAULT_LOCK_STALE_MS+lockStaleMs(lib:3629-3638)— TTL named constant+env parse の対照
- 配送: 既存 checkpoint/cherry-pick 流路(新規配送機構ゼロ)
- 新規機構は「グラント行の走査・検証」のみ — 他は全て既存 seam の分岐追加
