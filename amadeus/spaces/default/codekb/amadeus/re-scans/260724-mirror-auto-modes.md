# Re-scan 記録 — 260724-mirror-auto-modes

## スキャン契約

- Date: `2026-07-24T02:35:32Z`
- Base commit: `ffc79aad9a53c600ea9b464f1f04c6fa627ae59e`
- Observed commit: `2126ec1144a6fd0808021d7c386c1afbfdea6ae2`
- Repository: `amadeus`
- Intent: `260724-mirror-auto-modes`
- Scope: `amadeus-feature`
- Project type: Brownfield

Base は本 Intent に以前の re-scan record がないため、既存 `re-scans/` のうち最新 scan record `260723-marker-heading-exemption.md` の observed commit を使用した。共有 `reverse-engineering-timestamp.md` は base の正本として使用していない。

## Focus

`auto-mirror` を boolean から厳密な `off | prompt | auto` へ置き換え、未指定を `prompt` とする変更面を分析した。対象は次のとおり。

- Global→Space→Intent の3層 config、boolean 拒否、既定値
- Intent Capture 承認直後の create
- phase 完了、park、workflow 完了の sync
- 最終 sync 後の ownership 検証付き close
- GitHub 障害時の non-blocking warning、未同期状態、retry
- provenance と create 部分成功の冪等性
- core→6 harness→`dist/`→self-install の生成・drift
- unit/integration/e2e と日英 guide/reference

## Observed

現行 config は `autoMirror: boolean`、既定値 `false`、3層後勝ち merge である。mirror CLI は create/sync/close/status と `gh auth status`、`gh issue create/edit/close/view` を実装する。orchestration は verified phase 境界で ask/auto-sync を判断し、state は `Mirror Boundary Receipts` の pending/completed を保持する。

主要な観測事項:

1. `projectDirFromToolsDir()` は core source の深さでは正しいが、`.codex/tools` 等の配布 layout では誤る。既存 `amadeus-lib.ts` の `resolveProjectDir()` が正準候補である。
2. state は Issue 番号だけを持ち、Amadeus 作成 ownership を証明しない。現行 close は provenance を検証せず、誤 Issue を edit/close し得る。
3. `gh issue create` 成功後の state write 失敗は Issue 番号をローカルに残せず、retry で重複作成し得る。
4. pending receipt は config 解決より先に処理され、後から `off` に切り替えた場合の契約と衝突する可能性がある。
5. `handlePark`、workflow complete、Intent Capture 承認直後に auto lifecycle の配線がない。
6. non-default space の record path に default 固定の経路があり、selector の一貫性が必要である。
7. mirror 関連の既存テストは green だが、3 mode matrix、provenance、部分成功、non-blocking retry、配布 layout root の検証が不足する。

## 合成判断

三モードの意味は、mode、operation、boundary を入力とし `suppress | ask | execute` を返す狭い policy decision/result 型へ集約する。provenance、operation identity、receipt、warning は Intent record が所有し、GitHub Issue は record から生成される一方向の派生ビューとする。

GitHub 以外の transport abstraction、boolean 互換 shim、stage ごとの sync、外部 Issue の auto close、daemon、新規クラウド基盤は追加しない。実装は既存 `gh` runner、config merge、state/audit、package/promote pipeline を再利用する。

## 更新成果物

本 scan では共有 CodeKB の9成果物を観測コミット時点のリポジトリ全体スナップショットへ更新し、今回の focus findings を各成果物へ統合した。実装コード、state、audit、Intent 成果物、生成物には変更を加えていない。
