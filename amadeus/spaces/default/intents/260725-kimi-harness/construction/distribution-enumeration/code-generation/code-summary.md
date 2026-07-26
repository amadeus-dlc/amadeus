上流入力(consumes 全数): unit-of-work, requirements

# Code Summary — distribution-enumeration

unit-of-work.md の U5 と requirements.md の FR-5/FR-6 の実装記録(code-generation-plan.md の全5ステップ完了)。

## 変更ファイル

### 正本(BR-1 の原子変更 — setup 列挙 + 配布列挙を同一変更で)

| ファイル | 内容 |
|---|---|
| `packages/setup/src/domain/harness.ts` | union と `HarnessName.all` に `"kimi"` |
| `packages/setup/src/domain/engine-layout.ts` | `kimi → .kimi-code` |
| `packages/setup/src/modules/reporter.ts` | usage/エラー列挙 + `renderSnippetUnreadable` 新設(SEC-I04 の流儀) |
| `packages/setup/src/cli.ts` | `CliPorts.kimiHooks` 追加と `wireKimiHooks` ヘルパ。install/upgrade の verify 後に `--harness kimi` のみ `runHooksMerge` を呼ぶ。not-applied は exit 1(BR-I11) |
| `scripts/plugin-projection.ts` | `PACKAGE_HARNESSES`(6→7)・`SELF_INSTALL_HARNESSES`(4→5) に kimi |
| `scripts/promote-self.ts` | managedDirs に `dist/kimi/.kimi-code → .kimi-code`、`PACKAGE_HARNESSES` に kimi |
| `scripts/detect-ci-changes.sh` | glob に `.kimi-code/*` |
| 既存テスト 10 ファイル | 閉集合追随(fakePorts に kimiHooks・fixture に dist/kimi 等) |

### 新規テスト(11 件)

- `tests/unit/setup-engine-layout.test.ts`(4)・`setup-reporter.test.ts` +2・`tests/integration/t-kimi-cli-wiring.test.ts`(5: 非対話 abort・対話承認/拒否・冪等 noop・upgrade 到達)

### 生成物

- `dist/kimi/`(再生成)・ルート `.kimi-code/`(promote:self)

## 検証(conductor が再実行して裏取り)

- 配線 + engine-layout 9 件 → 0 fail(conductor 再実行でも 0 fail・46 expect)
- `bun run promote:self:check` → 0(conductor 再実行でも 0)
- `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self` → 全て exit 0(worker 実行)
- 関連 22 スイート → 245 pass / 0 fail(worker 実行)。**なお `bash tests/run-tests.sh --ci` のフルベースラインは本 Bolt では未実行** — build-and-test ステージで実施する(BR-3 の範囲確定)

## dogfood 証跡(実機・P2 どおり実行出力から)

1. ルート `.kimi-code/` 生成を確認
2. `kimi -p "/skill:amadeus --status"` → engine の status 出力を確認(CONSTRUCTION / Code Generation)
3. Q1 手順で配線(バックアップ → 本番マージロジックで block 適用)→ `kimi -p` のプロンプトで **HUMAN_TURN が audit shard にミント**(2026-07-26T05:50:22Z。conductor も audit の HUMAN_TURN 行を確認)→ 除去ロジックで block 除去。**CLI による再シリアライズは今回ゼロ**で、末尾改行の1行差分を補ってバックアップとバイト一致に復元
4. `bun .kimi-code/tools/amadeus-utility.ts doctor` → **kimi arm は全てパス**(adapter・managed block・残留なし・CLI >= 0.28.1・probe 発火)。2件の fail は kimi 無関係の既存リポジトリ衛生(orphan worktrees・stale branches)で「現状に一致する結果」と記録

## 逸脱・判断

- not-applied 時は exit 1(配置成功でも hooks 未配線を「成功」と報告しない。BR-I11)
- `CliPorts.kimiHooks` メンバ追加に伴い既存 fakePorts 4箇所を更新(ports 一括注入の既存流儀)

## 申し送り(U6/U7 へ)

- 新規 `.kimi-code` ツリーの scope-grid は合成スコープ(amadeus-feature 等)を持たない。別プロジェクトで途中参加する場合はスコープの再合成またはコピーが必要(U6 journey / U7 docs で記録候補)
- doctor は kimi CLI 0.29.0 を検出したが PATH の `kimi --version` は 0.28.1(解決経路が2系統ある観察。記録のみ)
- state の Scope 表示が `feature` と正規化されている観察(conductor 確認: ルーティングは amadeus-feature の18ステージ集合どおりで、audit に scope 変更イベントなし。表示正規化と判断)

## 残置(非改変・記録のみ)

- `~/.kimi-code/config.toml.amadeus-backup-20260726T001558Z`(B2 作業時のバックアップ。ユーザーの実 config は dogfood 前とバイト一致を確認済み)
