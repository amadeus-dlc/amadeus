# Code Generation Plan — sibling-worktree-guard(#670)

> Unit: sibling-worktree-guard(Bolt: #670)。上流: requirements.md FR-2(FR-2.1〜FR-2.5)、AC-2a〜2g、NFR-1〜NFR-5。codekb: architecture.md / code-structure.md の worktree-guard セクション。
> トレーサビリティ: bugfix スコープのため user story は無く、各ステップは FR/AC 番号へ遡る。

## 設計決定(実測済みコードに基づく)

対象正本: `packages/framework/core/tools/amadeus-worktree.ts`(`assertNotSiblingWorktree`:112、呼び出し3箇所 = `handleCreate`:204 / `handleMerge`:277 / `handleDiscard`:512)。

1. **ガードの置換**(FR-2.1/2.2/2.3): `assertNotSiblingWorktree(repoCwd): void` を `resolveWorktreeAnchor(repoCwd: string): { gitCwd: string; anchored: boolean }` に置換する。
   - `cwdTop === mainCheckout`(main checkout から実行)→ `{ gitCwd: repoCwd, anchored: false }`。**バイト同一の従来挙動**(canonicalise 済みパスを外に漏らさない — 監査フィールド・出力 JSON のパス表記が変わると既存 t02〜t05/t07 等の fixture 比較が壊れるため)。
   - `cwdTop !== mainCheckout` かつ cwdTop が **真のネスト**(= `basename(cwdTop)` が `bolt-` 始まり かつ `dirname(cwdTop)` が `<mainCheckout>/.amadeus/worktrees`、`pathKey` 比較 — `handleList` の Bolt 判定と同一定義)→ 従来同型の pre-audit エラーで拒否(FR-2.2、AC-2c)。エラーメッセージは「Bolt worktree 内からの実行は不可(真のネスト)」を明示する新文面とし、旧文面 `must run from the main repo checkout` は**置換**する(NFR-4: 旧挙動は削除して置き換え)。
   - それ以外(sibling worktree from 実行)→ `{ gitCwd: mainCheckout, anchored: true }`。以降の git 操作はすべて `gitCwd`(= main checkout)で実行(FR-2.3: `dirname(git-common-dir)` による解決を維持)。
2. **wtPath のアンカー**(FR-2.1「現在の worktree 直下にネストしない」): `anchored === true` かつ legacy 単一リポ(`pathKey(repoCwd) === pathKey(canonicalise(resolve(pd)))`)のとき `worktreePath(mainCheckout, slug)`。それ以外は従来どおり `worktreePath(pd, slug)`(P7 マルチリポの workspace-roof アンカーは不変)。
3. **監査シャードの所属は不変**: `emitAudit` は従来どおり pd(実行セッションの record)へ書く。変わるのは git 操作の cwd と worktree 実体の置き場所のみ。
4. **merge の HEAD 検査**(FR-2.5/AC-2e): `handleMerge` の `rev-parse --abbrev-ref HEAD` も `gitCwd` で実行 — sibling から実行した場合「main checkout 側に `--target` がチェックアウトされていること」が新契約(sibling 自身のブランチは無関係)。squash/merge/ff/commit/cleanup も `gitCwd`。rebase の `git rebase`/`git fetch` は従来どおり wtPath 内。
5. **discard**(FR-2.5/AC-2f): `handleDiscard` の branch 存在確認・`worktree remove`・`branch -D` を `gitCwd` で実行。
6. **list / verify / info は無変更**(FR-2.4)。

## ステップ

- [ ] Step 1: `packages/framework/core/tools/amadeus-worktree.ts` — `assertNotSiblingWorktree` を `resolveWorktreeAnchor` に置換(設計決定1)。ファイルヘッダの Sibling-worktree rejection 注記(:10-12)と関数コメント(:99-111)を新挙動(sibling 許可 + 真ネスト拒否 + main checkout アンカー)に書き換え。【FR-2.1/2.2/2.3】
- [ ] Step 2: 同ファイル — `handleCreate` / `handleMerge` / `handleDiscard` の3呼び出しを新 API に切り替え、git 操作 cwd を `gitCwd` に、wtPath を設計決定2に従い解決(3経路すべて同じ緩和 — FR-2.5)。【AC-2a/2b/2e/2f】
- [ ] Step 3: 回帰テスト書き換え — `tests/e2e/t06.test.ts` を新契約へ**反転**(NFR-5。単なる green 維持ではない):
  - T1: sibling worktree から `create` → exit 0、worktree は main checkout 側 `.amadeus/worktrees/bolt-<slug>` に作成され sibling 直下に存在しない、WORKTREE_CREATED が pd(sibling record)に着地。【AC-2a】
  - T2: main checkout から `create` → 従来どおり成功(回帰なし)。【AC-2b】
  - T3: Bolt worktree 内から `create` → 拒否(真ネスト維持・pre-audit: 監査行ゼロ・worktree 未作成)。【AC-2c】
  - T4: sibling から `merge --strategy squash`(main checkout は `main` checkout 済み)→ 成功。真ネストからは拒否。【AC-2e】
  - T5: sibling から `discard` → 成功。真ネストからは拒否。【AC-2f】
  - T6: `list` が sibling / main の双方から従来どおり成功(ガード対象外の不変)。【AC-2g/FR-2.4】
- [ ] Step 4: **落ちる実証**(AC-2d、Mandated「新設ゲートは失敗ケースを注入して赤を実証」): 修正前コード(main HEAD)に対して新 t06 の T1/T4/T5 が赤、修正後に緑となることを実測し、exit code を code-summary.md に記録。真ネスト拒否(T3)が修正後も赤ではなく「拒否=テスト緑」で維持されることを併記。
- [ ] Step 5: dist 同期 — `bun scripts/package.ts` + `bun run promote:self` を実装と同一コミットに含める(NFR-2)。
- [ ] Step 6: 検証一式 — `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` を最終変更後に再実行し、実測 exit code を code-summary.md に記録(NFR-3、evidence-discipline)。
- [ ] Step 7: PR 発行 — bolt ブランチ(origin/main ベース)から単独 PR(NFR-1)。PR 本文に「t06 の契約反転は変更対象そのもののテストであり回帰ではない」を明記(NFR-5)し、codex メンバーへレビュー依頼。

## テスト構成メモ

- 新規テストランナー・設定は追加しない(既存 `tests/run-tests.sh` 4層構成を再利用 — inception ガードレールの reuse inventory)。
- t06 は e2e 層(プロセス境界・実 git)のまま。fixture は既存 `setupWorktreeFixture` / `addSibling` パターンを再利用し、真ネスト用に「main から bolt worktree を1つ実作成してその中から実行」を追加。
