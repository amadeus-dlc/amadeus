# Code Generation Plan — unit: priority-bug-batch

> Depth: Minimal / Test Strategy: Comprehensive(self-fix)/ TDD 既定。
> Traceability(step → 上流): 全 step は requirements.md の FR-n へ、FR-n は各 Issue へ trace(FR-1/2→#3065、FR-3→#3034、FR-4→#3040、FR-5→#3035、FR-6→横断)。user stories は scope により SKIP のため FR 起点でスコープした(degraded input の明記)。
> 実装は git worktree 分離(`cid:code-generation:solo-bolt-worktree-required`)。base = main、merge target = main、単一 Bolt・単一 PR(裁定 auto-decision-3cd3fd2c…)。

## Steps

- [ ] Step 1: worktree セットアップ — `amadeus-worktree.ts create` で Bolt worktree を作成し、`bun install` + `bun run build`(source-only 境界下の自己インストール面再生成)
- [ ] Step 2 (FR-5/#3035): `tests/unit/t07-hook-audit-logger.serial.test.ts` の 300ms/500ms 壁時計 assert 2 箇所を削除し機能 assert のみに絞る(TDD 適用外: 振る舞い不変のテスト削減。前後で当該ファイル green を実測)
- [ ] Step 3 (FR-3/#3034): `tests/integration/t2851-doctor-self-install-freshness.serial.test.ts` 最終ケース冒頭に live `--check` clean の前提条件プローブを追加し、DIFFERS/ORPHAN 時は理由明示で skip(裁定 E-AD-CA3B97CA。dirty 投影下で skip になることを実測、clean 下で従来どおり実行)
- [ ] Step 4 (FR-1/#3065): Red — 合成 SpawnOutcome(exit 0・非 NUL 終端の部分 stdout)注入で現行 `parseTree` 即発火を失敗テストとして固定 → Green — `systemCommandRunner` の NUL 終端読み取りへ完全性述語+有限リトライ層を実装(裁定 E-AD-16EFE5C9)。リトライ上限超過時は既存ガード発火を維持
- [ ] Step 5 (FR-2/#3065): Red — `result.error` 付き合成 spawn 結果で `git()` が ok:true を返す現行挙動を失敗テストで固定 → Green — `amadeus-migrate.ts` の `git()` に error 検査の fail-closed 正規化を実装
- [ ] Step 6 (FR-4/#3040): Red — settle 通知後に close が `timeoutMs` を超えて遅延するケースをタイミングシームで決定的に構成し、現行 `timed-out` 誤分類を失敗テストで固定 → Green — `amadeus-pi-driver.ts` の状態遷移を settle 観測後は timeout レース対象外(cleanup 期限のみ)へ是正(裁定 E-AD-C38DFF5B)。settle 前の真のハングが `timed-out` のままであることも同時に固定
- [ ] Step 7 (FR-6): 台帳同期 — 新規テストファイルがあれば `bun tests/gen-coverage-registry.ts` regen、`amadeus-migrate.ts` 等が意味的セレクタ/model-map ピンに掛かる場合は同一変更で resync(`bt-ledger-resync`/`c1`)
- [ ] Step 8: ローカル検証 — `bun run typecheck` / `bun run lint` / 患部 targeted テスト(t07, t2851, t224, t427, t-pi-child-driver + 新規テスト)/ `coverage-patch-quick` advisory
- [ ] Step 9: commit(英語・Conventional)→ push → PR 作成(remote-first。blocking 検証は CI `ci-success` 集約を正とする)

## 補足(reviewer FOLLOW-UP の申し送り反映)

- FR-4 の非仕様変更判定の根拠: settle 済み child への `timed-out` 報告は「settle した RPC は close される」という既存契約(テスト名が固定する期待)からの逸脱の修正であり、仕様への回復。ユーザー可視 CLI 契約への影響なし(この1箇所に集約、FR-4 本文は参照のみとする)
- consume 面: business-overview.md / architecture.md は本バッチ(テスト基盤・driver 内部修正)に直接関連する記述がないことを RE 断面で確認済み。患部の一次根拠は code-structure.md とスキャン報告
