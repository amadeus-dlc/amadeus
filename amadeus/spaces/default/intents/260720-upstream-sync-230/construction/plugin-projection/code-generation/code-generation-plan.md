# plugin-projection コード生成計画

## 対象と成功条件

- 対象ユニットは U09 `plugin-projection` のみとする。
- 公開シームは `discoverPluginSources`、`buildPluginProjection`、`buildHarnessTree`、`checkHarnessTree` の4関数（`component-methods.md` の正準 signature に一致）。`buildSelfInstallProjection` は第五の公開 seam ではなく、既存 closed list 4面を投影する C5 内部 helper とする（E-OC1 再裁定 A `2026-07-20T14:09:08Z` 準拠）。
- 公開関数の引数型は `component-methods.md` 正本のまま（`PluginSource` を受け、`ValidPluginSource` 等へ置換しない）。`domain-entities.md` に従い、この Unit 内では `HarnessName` を 6面の `PackageHarness`、self-install を closed 4面の `SelfInstallHarness` として具体化する（swarm の別語彙 `HarnessName` と衝突させない）。
- **受入の核**: plugin 0件（`plugins/` 不在・空の双方）で `bun scripts/package.ts` と graph compile の出力が baseline と byte-identical であること。`dist:check`／`promote:self:check` green かつ regenerate 後の `git diff` が空で実証する。
- `plugins/<name>/` を read-only discovery し、6 harness へ host projection、`dist/plugins/<name>/` に harness-neutral bundle を決定的生成する。byte/orphan/unreferenced/collision の drift を検査する。
- self-install は既存 closed list（claude/codex/cursor/opencode）4面のみを対象にし、6面へ拡張しない。kiro/kiro-ide は package 対象だが self-install には昇格しない。

## 設計判断（U09 レーン内・ユーザー可視契約の変更なし）

- 新規モジュール `scripts/plugin-projection.ts` に C5 のロジックを凝集させ、既存 packager の core build ロジックを fork しない。純関数/注入 fs で in-process テスト可能にし、spawn 盲点（bun --coverage）を避ける。
- host projection 先は `dist/<harness>/<harnessDir>/plugins/<name>/`（namespaced、既存 byte/orphan スキャンが自動被覆）。neutral bundle は `dist/plugins/<name>/`。
- `scripts/package.ts` への統合は **plugin 0件では完全 no-op** となる加算ステップに限定し、byte-identical を自明に保つ。

## トレーサビリティ

User Stories は SKIP のため、捕捉済み intent の FR-6 item 19、機能設計の BR-U09-01〜21、`business-logic-model.md` の Projection pipeline、`domain-entities.md` の value graph を受入根拠とする。非機能面は NFR 設計（決定的 batch、validation-before-write、6×4 closed matrix、no-partial-update、既存 Bun/TS stack）に従う。

## テスト戦略（Comprehensive）

既存の Bun test / `tests/unit` / `tests/integration` をそのまま使用し、新テスト基盤は追加しない。実 FS を触るテストは integration 層に置く（fs-tests-integration-first）。純関数テストは unit 層に置く。

- Unit（純関数・fs 非依存）: discovery の canonical sort 決定性（fake fs）、構造 validation（malformed/duplicate/unsafe path）、collision guard、host projection の token/rules 変換、drift 導出（MISSING/DIFFERS/ORPHAN/UNREFERENCED の sorted 分類）、self-install closed-union guard（kiro/kiro-ide 拒否、4面通過）。
- Integration（実 FS）: (a) plugin 0件で dist byte-identical、(b) fixture plugin 1件で 6 harness projection + `dist/plugins/` を temp root に生成し順序反転で bytes 一致、(c) source 削除/artifact 改変/手編集 dist/未参照 source を各 drift kind へ分類、(d) 6×4 matrix で self-install 境界固定。
- E2E: 非適用。U09 は UI/network/新規利用者ジャーニーを追加せず、CLI 境界は既存 integration が覆う。

## 実装手順

1. [x] RED: plugin 0件 byte-identical baseline を characterization で固定（integration）。
2. [x] RED: 公開契約・構造 validation・collision・drift・self-install 境界を unit test で固定。
3. [x] GREEN: `scripts/plugin-projection.ts` を実装（4 公開 seam + 内部 helper、純関数/注入 fs）。
4. [x] GREEN: `scripts/package.ts` に plugin 0件 no-op の加算統合（discovery→host projection→neutral bundle→drift 配線）。
5. [x] 正本変更後 `bun scripts/package.ts` + `bun run promote:self` で生成物を再生成（手編集しない）。
6. [x] 検証: 対象テスト（path 実在機械確認 + `Ran ... across M files` 照合）、`typecheck`、`lint:check`、`dist:check`、`promote:self:check`、complexity gate、coverage registry check、local lcov で patch 未カバー0。
7. [x] 新設 drift 検査の落ちる実証（赤→復元→緑）。
8. [x] `code-summary.md` に変更・検証・既知の制約を記録。

## 変更方針

- 既存の既定値・出力順・エラー結果形式を維持する。plugin present のときだけ投影を加算し、0件経路のバイト列を変えない。
- 生成対象ファイルはソース変更後にジェネレーターのみで更新する。
- コミットは worktree 内のみ。push・他ユニットの実装は行わない。
