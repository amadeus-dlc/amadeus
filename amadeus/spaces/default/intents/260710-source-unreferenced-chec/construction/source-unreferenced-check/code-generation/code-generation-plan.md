# Code Generation Plan — source-unreferenced-check(#735)

> Unit: source-unreferenced-check(単一 Bolt)。上流: requirements.md FR-1〜FR-3 / AC-1a〜2e、NFR-1〜NFR-4(選挙4問 = 全問 A)。codekb: architecture.md「packaging 入力集合と source 側 unreferenced 検査」節。
> トレーサビリティ: bugfix グリッドのため user story は無く、各ステップは FR/AC 番号へ遡る。

## 設計決定(実測済みコードに基づく)

対象正本: `scripts/package.ts`(dev-only tooling — dist/self-install 昇格対象外。NFR-2 の全検証は実施)。

1. **実読み集合の記録**(FR-1): `buildTree` に読み取り記録を導入する。記録対象は2系統:
   - **ファイル読み系**: harnessFiles の各 `src`(L357-363)、onboarding 合成が読む fills、emit プラグインが読む入力 — buildTree が readFileSync/copy する時点で記録。
   - **モジュールロード系**(FR-1.2、e6 申し送りの設計明示): `loadManifest`(package.ts:513-516)の `require()` は manifest.ts とその静的 import 連鎖(onboarding.fills.ts、codex は emit.ts)をモジュールレジストリへ載せる。**記録は require.cache(Bun 互換のモジュールレジストリ)を build 後にスナップショットし、`packages/framework/harness/<name>/` 配下のエントリを実読み集合へ合流させる**方式を第一候補とする — ハードコード列挙なしで将来の build 機構追加に自動追随(選挙 Q2=A)。require.cache が Bun で期待どおり列挙できない場合の代替(loadManifest 箇所での明示記録 + manifest が自分の import を返す契約)は builder が実測で判定し、採用理由を code-summary に記録する。**package.ts:651 の require(emit.ts) は codex trust 系統であり参照点にしない**(requirements FR-1.1 の負の指示)。
2. **差集合検査**(FR-2): `checkHarness` 内で `packages/framework/harness/<name>/` を walk し、実読み集合に無いファイルを `UNREFERENCED in source: <name>/<rel>` として problems へ追加(既存 MISSING/DIFFERS/ORPHAN と同形式)。exit 契約は既存どおり problems 非空 → exit 1。write 経路の挙動は不変(記録は副作用なしの収集のみ)。
3. **検査関数の切り出し**(FR-3.1): 差集合ロジックは pure 関数(例: `unreferencedSources(harnessDir, readSet): string[]`)として export し、unit テストが直接 import できる形にする。
4. **クリーンベースライン**(AC-1a): 現行ツリーで全 harness 検出ゼロを実測で確認(post #737 で不正未参照ゼロが前提 — RE 実測済み)。

## ステップ

- [ ] Step 0(落ちる実証・前半): 先にテストを書く — (a) unit: 検査関数の直接テスト(未参照あり→報告 / なし→空 / build 機構ファイルが参照済み扱い)、(b) プロセス境界: t148 同型の注入実証(`packages/framework/harness/kiro/hooks/` へ stale ファイル注入 → `bun scripts/package.ts --check` 赤 → 除去 → 緑)。**現行コードでは注入しても緑(= #719 の偽緑)であることを実測**し exit code を記録(AC-2d の3点実証の1点目)。【FR-3 / AC-2d】
- [ ] Step 1: `scripts/package.ts` — buildTree の実読み集合記録(設計決定1)+ checkHarness の差集合検査(設計決定2)+ pure 検査関数の export(設計決定3)。説明コメントは関数外トップレベル(NFR-4)。【FR-1 / FR-2】
- [ ] Step 2(落ちる実証・後半): 注入 → 赤(UNREFERENCED 行 + exit 1)、除去 → 緑。kiro 以外の harness でも1面注入して検出を実証(AC-2e)。unit テスト緑。【AC-2a/2b/2e】
- [ ] Step 3: クリーンベースライン確認 — 全 harness で `bun run dist:check` exit 0(AC-1a/1b: build 機構3種が誤検出されない)。【AC-1a/1b/AC-2c】
- [ ] Step 4: 検証一式 — `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` を最終変更後に再実行し実測 exit code を記録。coverage registry 同期(新規テスト検出時は再生成)。【NFR-2 / FR-3.3】
- [ ] Step 5: PR 発行(1 Bolt = 1 PR、deslop 実施後)+ レビュー依頼(領域内1 + 領域外1、自己レビュー禁止)。【NFR-1】

## テスト構成メモ

- 新規ランナー・設定は追加しない(bun test + 既存4層)。unit の配置は `tests/unit/`、プロセス境界は既存 `tests/smoke/t148` への追記 or 姉妹ファイル(既存構成に整合させ builder が判断)。
- lint スコープ: scripts/ が Biome 対象かを実測し、対象外なら既存スコープを変えない(surgical)。
