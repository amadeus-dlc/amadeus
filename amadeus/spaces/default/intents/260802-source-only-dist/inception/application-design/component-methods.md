# Component Methods — 主要契約

上流入力(consumes 全数): requirements(FR 番号 — 各契約の根拠)、architecture(現行機序 — 変更前挙動の出典)、component-inventory(既存 seam の所在)。stories / team-practices は不存在(SKIP)。components.md の C1〜C9 に対応。

測定 ref: file:line は observed `63e69d922`。

## C1 release-dist-build

- `buildDistAssets(version): { tarPath, checksumPath, manifestPath }` — 全ハーネスを `scripts/package.ts` の buildTree で生成し、wrapper 契約(decisions.md ADR-A2)どおり単一トップディレクトリ `amadeus-dist-v<version>/` に固めて tar.gz 化。SHA256SUMS と manifest.json を併産
- 決定性: tar エントリは名前順ソート・mtime 固定・owner/group 数値0(byte-identical の NFR-1 を tar 層でも守る)
- 受け入れ基準(意味的整合 — reviewer iteration 1 Minor の是正): `buildDistAssets` は manifest.harnesses と tar 実体内のハーネスディレクトリ集合の一致、manifest.fileCount と tar エントリ数の一致を生成直後に self-check し、不一致で fail closed
- release.yml `build-dist` ジョブ(decisions.md ADR-A3): checkout(prepare の sha)→ bun 1.3.13 → フルテスト → buildDistAssets → artifact upload。`github-release` ジョブは `needs: build-dist` で artifact を受け `files:` に添付

## C2 installer asset 経路

- `resolveArchiveSource(tag): AssetSource | CodeloadSource` — `semverGte(version, ASSET_INTRO_VERSION)` の純粋関数分岐(FR-2.1/2.2、G7)。`ASSET_INTRO_VERSION` は resolved-version-factory 内の単一定数
- AssetSource 経路: `https://github.com/amadeus-dlc/amadeus/releases/download/v<ver>/amadeus-dist-v<ver>.tar.gz` を取得(302 → release-assets.githubusercontent.com、実測 — decisions.md ADR-A4)。取得後 `verifySha256(tarBytes, checksums)` を通してから展開。欠落(404)・不一致は `payload-invalid` 級の typed error で fail closed — codeload へ落ちない
- `ExtractedPayload.locate(harness)`: 現行 `wrapper/dist/<harness>`(payload-factory.ts:38,57)→ 無ければ `wrapper/<harness>` の2段 fallback(G6。asset tar は wrapper 直下にハーネス群)
- `ALLOWED_HOSTS`(http.ts:5)へ `github.com` と `release-assets.githubusercontent.com` を追加(ADR-A4)。redirect 検査(:79)の fail-closed は不変
- 旧版(< 導入版): 現行 codeload 経路を byte 不変で維持(resolved-version-factory.ts:5)

## C3 hook 単一ディスパッチャ

- 追跡ファイル `.claude/hooks/amadeus-dispatch.ts`(正本は `packages/framework/harness/claude/hooks/`): `bun amadeus-dispatch.ts <event>` — イベント名→実体フックパスの静的表で解決し、実体不在なら stderr へ「フレッシュクローンです。`bun run build` を実行してください」を出して exit 0(no-op — ハーネスのフック失敗連鎖を作らない)
- settings.json テンプレート(preserved 対象 :103 のため生成器でなく追跡正本そのものを改修): 11参照(:57-:154)を `amadeus-dispatch.ts <event>` 形式へ。mint-presence の2回参照(UserPromptSubmit / PostToolUse)はイベント引数で区別
- ロジックは従来どおり実体フック側(dispatcher は解決+案内のみ、分岐を持たない)

## C4 AGENTS.md import 分離

- 追跡 `AGENTS.md` = 手書き部(現 1-91行)+ import 行のみ。生成 suffix(現 :92-162、dist/codex/AGENTS.md 由来)は未追跡 `.agents/rules/amadeus-codex-suffix.md`(名称は実装時確定)へ移し、AGENTS.md からの import 参照に置換
- `composeRootAgents`(promote-self.ts:83-99)は廃止(追跡ファイルへの書込を持つ生成経路を残さない — NFR-2)
- `PROJECT_INSTRUCTIONS` 定数(promote-self.ts:65-74)の正本を `packages/framework/harness/claude/`(CLAUDE.md 系)へ移設し、スクリプト内ハードコードを解消(FR-3.3)

## C5 allowlist 正本+整合テスト

- `packages/framework/core/tools/data/self-install-allowlist.ts`(単一正本): { tracked: [...](プロジェクト固有設定+dispatcher), perUser: [...](第3カテゴリ regex 群 — 既存 COMPOSED_SCOPE_RE 等を re-export) }
- `preserved`(promote-self.ts:101-114)は正本から import(重複定義削除)
- 整合テスト(新設 tNNN): 正本から導出した期待パターン集合と `.gitignore` / `.gitattributes` の実記述を突合し、不一致で赤。故意の不一致注入による落ちる実証を同 PR に含める(FR-5.2)

## C6 scope 正本昇格

- `packages/framework/core/scopes/` へ self-* 4 + installer-distribution を追加(全 dogfood 面へ投影 — RA Q1 裁定)。scope-grid 正本を15キー化し、`scopeGridInSync` の期待側を更新
- self-scope-consistency センサーの期待を「全面 = 正本投影の完全一致」へ改訂(現行の root-only 生存前提を撤去)

## C7 CI 再設計

**二段階の切替時期を明示する(reviewer iteration 1 Critical の是正)。** 検査系の対象が「コミット済み dist」から「未追跡の生成物」へ変わる検査は、追跡除外(C9、移行順序5)と**同一変更で原子的に切り替える** — 先行させると追跡中の dist にガードが反応して CI が恒久赤になり、遅行させると検査空白が生じるため。

- **段階1(移行順序3で導入 — 追跡状態と無関係に安全なもの)**:
  - ci.yml: 全テスト系ジョブの前段に build ステップ(`bun run build`)
  - `tests/run-tests.sh` 入口: dist 不在なら「`bun run build` を実行してください」で loud fail(FR-4.1)
  - 再現性検査(隔離2回 build 比較)を**追加ジョブとして新設**(temp dir A/B に独立 build → byte diff。既存 checkHarness :698 の temp build を流用)。この時点では旧 `dist:check` / `promote:self:check`(committed 比較)は**現行のまま並存** — 手編集検出の空白を作らない
- **段階2(移行順序5 = 追跡除外と同一 PR で原子切替)**:
  - 旧 `dist:check` / `promote:self:check`(committed 比較)を撤去し、段階1の再現性検査+C8 のローカル鮮度検査が後継となる
  - 第3ガード: `amadeus-graph.ts compile --check` を「正本 stage 定義 → compile 成功+不変量(未知 sensor の loud reject 等 — 具体集合は functional-design OQ-4)」検証へ再定義(コミット済み graph が消えるのはこの時点)
  - 境界ガード(新設): `git ls-files` に生成対象パターン(dist/** + 未追跡化面 − allowlist)がヒットしたら赤。落ちる実証必須(FR-4.5)。**有効化は追跡除外コミットと同一 PR** — それ以前は対象が意図的に追跡中のため成立しない
- `detect-ci-changes.sh:18-24`: dist/* 死にパターン整理、`.kiro/*` 不整合是正、`.kiro-ide` 点検(FR-4.4 — 段階2)

注記(要件との整合): requirements は FR-4 を移行順序3に置くが、Constraints「追跡除外は FR-1〜FR-4 完了+クリーン環境検証後」が優先するため、FR-4.2/FR-4.3/FR-4.5 の**切替・有効化**は順序5で実施する(FR-4 での**実装準備**は順序3で完了)。この時期解釈は設計判断としてここに申告する

## C8 promote-self 再責務化

- `--check` の意味を「コミット済み mirror との byte 一致」から「ローカル self-install 面が最新 build と一致するか(ローカル鮮度検査)」へ変更。apply は従来どおり生成(carve-out 群 :124/:178-179 は不変)
- 冪等性契約: apply の再実行で `git status --short` 不変(追跡ファイル不触 — composeRootAgents 廃止で成立)

## C9 追跡除外+文書

- `.gitignore`: COMMITTED 契約(:16-19)反転、allowlist は深さ1限定+dispatcher(深さ2)の階層再包含パターン(FR-5.3)
- 文書: README / README.ja / CONTRIBUTING(:17,:48)/ AGENTS.md:90 / `.gitattributes` / ハーネスガイド / リリース手順
- ノルム PR 5点(FR-6.2)は別 PR
