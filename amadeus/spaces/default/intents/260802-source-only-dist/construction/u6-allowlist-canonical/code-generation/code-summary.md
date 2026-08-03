# Code Summary — u6-allowlist-canonical

## 結果

FR-5.2 / FR-5.3 に対応する self-install allowlist の単一正本を導入した。`scripts/promote-self.ts` に重複していた preserved 10件と regex 4本を削除し、正本由来の preserved 11件（既存10件 + u4 dispatcher）と regex import に置換した。

`.gitattributes` の review-visible 例外は正本 `tracked` 6件 + 歴史的例外 `.codex/hooks.json` の7件へ同期した。`.gitignore` は実ファイルを変更せず、u8 が原子切替時に使う期待値と深さ2再包含規則だけを実装・検証した。

## 変更

- `packages/framework/core/tools/data/self-install-allowlist.ts`
  - `tracked`: 設定5件 + `.claude/hooks/amadeus-dispatch.ts`
  - `preservedRuntime`: `.claude/settings.local.json`、`.claude/worktrees/`、`.codex/hooks.json`、`.codex/agmsg-delivery-mode`、`.codex/local/`
  - `perUserPatterns`: `COMPOSED_SCOPE_RE`、`SCOPE_GRID_RE`、`PLUGIN_ENGINE_STATE_RE`、`STAGE_GRAPH_RE`
  - `preserved`、`gitignoreExpectation`、`gitattributesExpectation` の純関数
  - absolute、Windows absolute、backslash、NUL、glob、`.` / `..`、depth 不一致、区分重複の fail-fast 検査
- `scripts/promote-self.ts`
  - preserved 配列と regex 4定義を削除し、正本 import に置換
  - u5 所有の `PROJECT_INSTRUCTIONS` / `composeRootAgents` / apply-check 責務には不干渉
- `.gitattributes`
  - dispatcher を `-linguist-generated` へ追加
- tests
  - t416 pure unit: catalog、導出集合、preserved union、異常 path / 重複
  - t416 integration: 実 `.gitattributes` 突合、生成 `.gitignore` の `git check-ignore --no-index` positive / negative
  - t200 / t356 の regex import 元を正本へ変更（挙動 assertion は不変）
  - `scripts/promote-self.ts` の coverage allowlist 行を base→head で機械 remap（361-362→350-351、689→678）。前者の stale reason も現行行の意味へ是正し、span 膨張はない

## 判断

- `.gitignore` 実ファイル突合は導入しなかった。現行ファイルには source-only 節がなく、部分一致 test は vacuous になるため、承認済み設計どおり u8 に残した。
- `.codex/hooks.json` は未追跡・gitignored だが、既存 `.gitattributes` の歴史的 review-visible 例外として明示的に維持した。維持 / 撤去の棚卸しは u8 が担う。
- generated self-install face の ignore 期待は `.agents`、`.claude`、`.codex`、`.cursor`、`.kimi-code`、`.opencode` を root-anchored `/**` で閉じ、tracked のみ否定パターンで再包含する。dispatcher は親 `.claude/hooks/` を先に再包含する。
- filesystem / subprocess を伴う検査は unit へ置かず medium integration test とした。network、service、database、並行 protocol は存在しないため、Comprehensive 戦略でも負荷試験、DAST、形式検証、E2E は追加していない。

## TDD と落ちる実証

| 段階 | 実測 | 結果 |
|---|---|---|
| 最初の公開 seam | `bun test --timeout 120000 ./tests/unit/t416-self-install-allowlist.test.ts` | module 不在、0 pass / 1 fail、exit 1 |
| preserved / expectation / validation | 同対象 test を各 slice で実行 | export 不在または assertion failure の Red → 最小実装後 Green |
| 実 `.gitattributes` | `bun test --timeout 120000 ./tests/integration/t416-self-install-gitattributes.integration.test.ts` | dispatcher が canonicalOnly として1件検出、exit 1 → 追記後 Green |
| 故意の不一致注入 | 正本へ `.codex/falling-proof.toml` を一時追加し t416 unit + integration を実行 | catalog / preserved / gitignore / gitattributes expectation / 実ファイル突合の5 failures、exit 1 |
| 復旧 | 故意 entry を除去して同2ファイルを再実行 | 6 pass、exit 0（後続 refactor 後は7 pass） |

故意 entry は除去済みで、最終 diff に残っていない。

## 検証

- 対象8ファイルの実在を全件確認後、`bun test --timeout 120000 <8 paths>`: 69 pass / 0 fail / 8 files、exit 0
- t416 最終再実行: 7 pass / 0 fail / 2 files、exit 0
- `bun run lint`: exit 0。既存 baseline の complexity 等 386 warnings / 23 infos（本変更の新規 `assertAllowlist` warning は helper 分割後、対象 Biome check で0件）
- `bun run typecheck`: exit 0
- 変更対象3ファイルの Biome check: `Checked 3 files ... No fixes applied`、exit 0
- coverage allowlist JSON parse: valid、exit 0
- `git diff --check`: exit 0

## 逸脱

設計・仕様からの逸脱はない。

作業手順上、最初の `apply_patch` 呼出しがツール既定 CWD（担当外 worktree）を指していることを検出した。直前に作成した未追跡 plan / test の2ファイルだけを即時削除して原状回復し、担当 worktree で同じ patch を再適用した。担当外 worktree では Git 操作を一切実行していない。その後の全編集・検証・Git 操作は担当 worktree 内に限定した。

## 引き渡し

### u5

- `scripts/promote-self.ts` は `preservedEntries(SELF_INSTALL_ALLOWLIST)` を使用する。ローカル preserved 配列を復活させないこと。
- regex は promote-self から再 export していない。正本 module を直接 import する。
- u5 所有範囲を再接地する際は、本 Unit の冒頭 import と `const preserved` を保持する。

### u8

- `gitignoreExpectation(SELF_INSTALL_ALLOWLIST)` の返却集合を source-only 節の期待値として実 `.gitignore` と突合すること。
- `.codex/local/` は現時点で ignore 未登録。u8 の原子切替で追加し、実ファイル突合と故意 stage の落ちる実証を同 PR に含めること。
- `.codex/hooks.json` の `.gitattributes` 歴史的例外を維持するか撤去するか棚卸しすること。
- dispatcher は u4 成果の着地後に実ファイルが存在する前提。深さ2再包含は t416 integration の `git check-ignore --no-index` で実効性を固定済み。
