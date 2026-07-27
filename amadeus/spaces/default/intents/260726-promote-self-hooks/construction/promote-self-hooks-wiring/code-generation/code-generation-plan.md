# Code Generation Plan — promote-self-hooks-wiring

上流入力 (consumes): requirements.md (inception/requirements-analysis)。units-generation / application-design は bugfix スコープにより SKIP — requirements + codekb (RE 差分リフレッシュ) からスコーピングした (degraded input: ユーザーストーリーなし、FR トレーサビリティで代替)。

テスト戦略: amadeus-bugfix スコープの testStrategy = **Comprehensive** (unit + integration + 既存 e2e の更新)。

## 変更対象 (正本)

- `scripts/promote-self.ts` — FR-1 (マージステップ追加)
- `packages/framework/core/tools/amadeus-utility.ts` — FR-2 (doctor 文言分岐)。C-1: self-install コピー (.kimi-code/tools/) は promote-self --apply で反映、直接編集しない
- テスト: `tests/` 配下に FR-3 の各テスト

## 実装ステップ

- [x] Step 1: FR-2 doctor 文言分岐 (packages/framework/core/tools/amadeus-utility.ts)
  - 自己開発リポ判定関数を追加: ワークスペースルートに `scripts/promote-self.ts` が存在するか (env 差し替え可能な純粋判定、resolveDoctorContext の規則に倣う)
  - `KIMI_MANAGED_BLOCK_FIX` (現 :855-856) を配布ユーザ向け文言として維持し、自己開発リポ向け文言 (`bun scripts/promote-self.ts --apply` 誘導) を別定数で追加。`kimiManagedBlockDoctorCheck` の FAIL 2経路 (config 欠落 :960 / block 未検出 :994) で判定に応じて選択
- [x] Step 2: FR-1 promote-self マージステップ (scripts/promote-self.ts)
  - `packages/setup/src/modules/kimi-hooks.ts` の `runHooksMerge` / `resolveKimiHome` / `renderHooksError` を import (scripts→packages import は :23 の先例どおり)
  - apply 経路の dist 同期完了後に、`dist/kimi/.kimi-code` が managedDirs のソースとして存在する場合のみマージステップを実行
  - ports: `tty.confirm = async () => true` (Q4=A 暗黙承認)、`interactive: true` (OC-1: approve() は interactive=false を拒否する — reviewer 申し送り)、fsRead/fsWrite/applyWrite は node:fs の実装、`out` は console 出力
  - snippet は正本 `packages/framework/harness/kimi/hooks/amadeus-hooks.snippet.toml` から読む (FR-1e)
  - マージ失敗時は `renderHooksError` の文言を表示し promote-self 全体を非ゼロ終了 (FR-1d)。noop 時は従来どおり成功
  - `--check` 経路には一切触れない (FR-1f hermetic 維持)
- [x] Step 3: Step 2 のテスト (FR-3a) — `tests/unit/t2xx-promote-self-kimi-hooks.test.ts` (新規)
  - t209 様式: fixture 最小 dist ツリー + `promoteSelfMain(["--apply","--no-build"], fixtureRoot)` in-process 駆動、`KIMI_CODE_HOME` を mkdtemp home に向ける (save/restore)
  - (i) config 不在 → managed block 追加 + バックアップなし、(ii) 同一ブロック既存 → noop (config 不変・バックアップなし)、(iii) 旧版ブロック既存 → replace + バックアップ作成、(iv) dist/kimi 不在 fixture → マージ非発火
  - `// covers:` / `// size:` ヘッダ規約に従う
- [x] Step 4: Step 1 のテスト (FR-3b) — doctor 文言分岐テスト追加/更新
  - t-kimi-doctor-arm 様式 (mkdtemp KimiHome + KIMI_CODE_HOME save/restore) で、自己開発リポ疑似 fixture (scripts/promote-self.ts 有り) は promote-self 誘導文言、配布疑似 fixture (無し) は現行 bunx 誘導文言が返ることを検証
  - 文言をピンしている既存テスト (tests/integration/t-kimi-doctor-arm.test.ts, tests/e2e/t-print-kimi-doctor.serial.test.ts) の期待値を新文言に更新
- [x] Step 5: 検証 — `bun run typecheck`、`bun run lint`、対象テストの実行 (build-and-test ステージの前段セルフチェック。linter / type-check センサー適用対象)
- [x] Step 6: ドキュメント整合確認 — `docs/guide/harnesses/kimi-code.md` (日英) の doctor 修復手順記述が新文言と矛盾しないか確認し、必要なら最小更新

## トレーサビリティ

| Step | 要件 |
|---|---|
| Step 1, 4, 6 | FR-2a/2b |
| Step 2, 3 | FR-1a〜1f |
| Step 3, 4 | FR-3a/3b/3c, NFR-1〜3 |
| Step 5 | C-3 (build-and-test 前段) |

## スコープ外 (実施しない)

- OQ-1 (managed block 消失シナリオの犯人追跡) — 別 intent 候補
- OQ-2 の恒久機構 (新ハーネスへの composed scope 引き継ぎ自動化) — 手動修復分のコミット同梱のみ (ゲート裁定済)
- promote-self --check へのユーザー級 config 検査 (Q2=A で明示除外)
