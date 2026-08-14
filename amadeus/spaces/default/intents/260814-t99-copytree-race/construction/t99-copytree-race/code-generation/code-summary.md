# Code Summary — unit t99-copytree-race

**Depth**: Minimal(bullet のみ)/ 変更 2 ファイル(+183 行、削除 0)、プロダクトコード非変更(FR-5 充足)。

## 変更ファイル

- `tests/harness/fixtures.ts`(+63)
  - `CopyTreeOps` へ `remove(path): void` 追加。default = `rmSync(path, {recursive:true, force:true})`(非存在パスで冪等 — reviewer NIT 対応)(FR-1)
  - `copyTreeWithRetry` の各 attempt で `ops.copy` 直前に `ops.remove(dest)`(FR-1。既存の例外分類経路は不変)
  - dest-fresh 契約を CopyTreeOps 直上の doc comment に明文化(「dest must not exist when called — the helper owns it outright」+ merge 累積で post-condition が構造的に不成立になる機序。既存の設計意図コメント2件は無変更)(FR-2 — 契約文言の内容照合済み: reviewer FOLLOW-UP 対応)
  - count mismatch 診断へ `describeTreeDifference`(src のみ / dest のみの entry 集合差、上限 20 件 + 超過件数)を追加(FR-3)。走査は stat なしの `safeReaddirRecursive`(racing walk の追加を回避)
- `tests/integration/t-fixtures-copy-tree-retry.integration.test.ts`(+120)
  - dest>src 収束テスト(TDD の対象)・診断差分テスト・truncation/`(none)`/ENOTDIR catch の駆動テスト計 3 本追加、opsRecorder へ remove スタブ、既存 1 本の call 列 assert 更新(remove 1 件増)

## 検証実測(数値は実行出力からの転記)

| 検証 | 結果 | 測定 ref / コマンド |
|---|---|---|
| TDD Red(実装前) | 9 pass / 2 fail(新規2本のみ赤: 収束テストは 3 attempt とも dest 11 で非収束、診断テストは差分行なし) | 本 worktree、`bun test tests/integration/t-fixtures-copy-tree-retry...` |
| Green(実装後) | 12 pass / 0 fail | 同上 |
| 落ちる実証(診断分岐) | truncation 分岐除去→1 fail / try-catch 除去→ENOTDIR fail、各 revert 後 md5 一致(59005cee...)で残渣ゼロ | 注入→赤→revert の1セット×2 |
| 回帰ガード | 既存 dest<src ケース(:107-127)は期待不変で緑(attempts=3、sleeps=[50,100]) | 同ファイル |
| t99 単独 | 17 pass / 0 fail | `bun test tests/integration/t99-learnings-gate-flow.test.ts` |
| real 呼出サイト | t27 63/0、t80 7/0 | `bun test tests/unit/t27.test.ts` / `t80.test.ts` |
| typecheck / lint | exit 0 / exit 0(警告は既存分のみ) | `bun run typecheck` / `bun run lint` |
| フルスイート | **RESULT: PASS**(exit 0。Failed assertions 0 — coverage / patch coverage gate 込みの単独所有実行) | `bash tests/run-tests.sh --ci` @ 本 worktree |

## Key decisions / 逸脱

- plan からの逸脱 1 件(申告): FR-3 の差分走査を「ファイルのみ(stat 併用)」から「全 entry 名(stat なし)」へ変更。理由: 診断に必要なのは名前で、失敗中の path への二周目 racing walk は有害、stat の catch は決定的に駆動できず allowlist 追加(NFR-2 禁止)を要する。行ラベルを `entries only in ...` として count(ファイル数)との粒度差を明示
- FR-6: follow-up Issue **#3014** 起票済み(fixtures.ts:784 姉妹面 / 未ガード素 cpSync 面 / CopyTreeOps.exists 未消費)
- NFR-3: 新設定数 `COPY_TREE_DIFF_SAMPLE_LIMIT` は timing 語彙を含まない
