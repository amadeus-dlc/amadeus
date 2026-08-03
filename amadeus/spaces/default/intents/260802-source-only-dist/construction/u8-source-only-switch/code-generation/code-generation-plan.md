# Code Generation Plan — u8-source-only-switch

上流入力（consumes 全数）: `business-logic-model`（原子切替順序と境界述語）、`business-rules`（BR-U8-1〜9）、`domain-entities`（Git index・CI・生成器の不変条件）、`performance-design`（線形 scan）、`security-design`（明示 pathspec と fail-closed）、`unit-of-work`（C7 段階2 + C8 + C9 を統合した u8）、`requirements`（FR-4.2/4.3/4.5、FR-5、NFR-1/2/3）。補助入力として `logical-components`、`reliability-design`、`scalability-design`、application-design の C7/C8/C9・ADR-A8、`unit-of-work-story-map` の Slice 3、delivery-planning の Bolt 7 を参照する。user-stories 成果物は本 Intent に存在しないため、各ステップは Slice 3「source-only 切替」と対応要件へ追跡する。

## 目的と原子境界

- 生成済み `dist/**` と project-local self-install 面を Git 追跡から外し、正規ソースと6件の bootstrap/configuration allowlist だけを追跡する。
- committed mirror との byte 比較を撤去し、source-only 境界、source-owned graph identity、semantic compile invariants、隔離2回 build の再現性へ検証責務を切り替える。
- 追跡除外、旧 check 撤去、第3ガード再定義、境界ガード有効化、生成器 bootstrap を単一の変更系列で着地させる。作業ツリーの生成物、per-user runtime、稼働中 worktree は削除しない。
- 成果は [GitHub PR #2140](https://github.com/amadeus-dlc/amadeus/pull/2140) として統合し、切替後の不具合は履歴 rewrite ではなく前進修正する。

## 成功条件

1. `git ls-files` と生成対象述語の交差が空で、`bun run source-only:check` が clean を返す。
2. `.gitignore` の source-only パターンが `SELF_INSTALL_ALLOWLIST` から導出した期待集合と一致し、6件の tracked allowlist と `.codex/hooks.json` の歴史的可視化例外を維持する。
3. committed `stage-graph.json` がない fresh source-only checkout から `bun run build` が成功する。
4. `amadeus-graph.ts compile --check` が parse、未知 sensor、全 scope-grid 面の同値性、Bolt DAG parse、非自己参照の不変量 (i)〜(v) を検査する。
5. `dist:check`、`promote:self:check`、`package.ts --check` の committed-copy parity 契約を撤去し、CI は source-only guard、build、compile invariants、再現性比較で fail closed する。
6. 故意に生成物を追跡した falling proof が赤になり、注入を除去した最終HEADで全検証が green になる。
7. source-only 化に伴う packaging、plugin fixture、coverage source path の回帰を解消し、full CI が完走する。

## 実装計画（Comprehensive test strategy）

- [x] Step 1: Bolt 1〜6 の着地、u6 allowlist 正本、u7 build-before-test / reproducible-build、clean checkout 前提を確認する。Trace: BR-U8-2/7、delivery-planning Bolt 7、Slice 3。
- [x] Step 2: source-only の生成対象述語と境界判定をテスト先行で固定し、`dist/**`、self-install 面、tracked allowlist、preserved runtime、stable ordering、線形 scan を検証する。Trace: FR-4.5、FR-5.2/5.3、BR-U8-4、performance-design。
- [x] Step 3: `scripts/source-only-boundary.ts` と `source-only:check` script を実装し、`git ls-files -z` の失敗と追跡違反を loud に返す。CI と release の blocking guard へ接続する。Trace: FR-4.5、BR-U8-4/6、security-design。
- [x] Step 4: `.gitignore` を source-only 契約へ反転し、u6 正本由来の6件だけを再包含する。`.codex/hooks.json` の歴史的 `.gitattributes` 例外は維持する。Trace: FR-5.1〜5.3、BR-U8-3/9。
- [x] Step 5: source-owned `stage-identities.json` を導入し、`scripts/package.ts` が既存 `dist` seed なしで全ハーネスの graph/grid を compile できるようにする。空 candidate からの実buildを統合テストで検証する。Trace: FR-3.1、FR-4.3、business-logic-model 第3ガード。
- [x] Step 6: graph compile の semantic invariants (i)〜(v) と全 surface discovery を実装し、scope-grid 差、invalid JSON、Bolt DAG parse 退行、未知 sensor を unit / integration test で fail closed にする。Trace: FR-4.3、BR-U8-5、logical-components。
- [x] Step 7: `dist:check`、`promote:self:check` の root scripts と `package.ts --check` の committed parity 実装を撤去する。`promote-self.ts` は毎回 source から candidate を生成して project-local 面を比較・適用し、u7 の隔離2回 build を再現性の正規検査として維持する。Trace: FR-4.2、FR-5.4、C7 段階2 / C8。
- [x] Step 8: CI の drift job を「Source-only and graph invariants」へ切り替え、build-before-consume を必要 job に補完する。`detect-ci-changes.sh` は `dist/*` 注入も boundary guard へ配送し、release workflow も source-only / graph invariant を検証する。Trace: FR-4.1〜4.5、BR-U8-6/7、reliability-design。
- [x] Step 9: Git index から生成面を除外し、作業ツリーの bytes を保持する。変更全体で削除 6,672 files、追加 6 files、変更 44 files となること、および allowlist 6件が追跡されたままであることを確認する。Trace: FR-5.1、BR-U8-1/3、NFR-2/3。
- [x] Step 10: source-only checkout に合わせて packaging / plugin / book-pack / CI fixture と coverage registry を更新し、一時 `amadeus-candidate-*` source を canonical core path へ fold する。Trace: Slice 3 の clean checkout CI、NFR-3、回帰防止。
- [x] Step 11: falling proof として commit `17f7e5c4c` で生成ファイルを故意に追跡し、`source-only:check` の exit 1 と対象1件の報告を確認する。commit `164facb76` で注入を除去し、clean に復元する。Trace: BR-U8-6、FR-4.5。
- [x] Step 12: 対象テスト、`bun run build`、`bun run source-only:check`、compile invariants、typecheck、lint、full `test:ci`、GitHub CI を確認し、実績を `code-summary.md` に記録する。Trace: Comprehensive 戦略、Bolt 7 完了条件。

## 要件トレーサビリティ

| 要件・設計 | 実装 | 検証 |
|---|---|---|
| FR-4.2 / C7 段階2 | committed parity scripts と `package.ts --check` を撤去 | CI再現性 job、旧verb拒否契約、CI静的契約テスト |
| FR-4.3 / BR-U8-5 | source identity seed + compile invariants (i)〜(v) | t418 graph unit / integration、CI「Source-only and graph invariants」 |
| FR-4.5 / BR-U8-4/6 | `source-only-boundary.ts` とCI/release接続 | t418 boundary unit / integration、falling proof、`source-only:check` |
| FR-5.1〜5.3 / BR-U8-3/9 | `.gitignore` 反転、6件 allowlist、歴史的例外維持、生成面追跡除外 | t416 gitignore / gitattributes、`git ls-files` 境界検査 |
| FR-3.1 / NFR-1 | source-only checkout からの build、隔離2回生成 | candidate build integration、CI「Reproducible build」 |
| NFR-2/3 | build後も追跡差分を作らず、生成物をGit履歴から除去 | source-only guard、full test / CI、merge commit inventory |

## テスト計画と設定

- Runtime / runner: Bun 1.3.13、既存 Bun test 設定を再利用し、新規 test config は作らない。
- Unit: path policy、boundary verdict、graph invariant の正常・異常・線形性。
- Integration: 実 Git index、buffer上限超過、index-only removal の bytes保持、空 candidate build、root/dist scope-grid surface、CI順序、allowlist と実ファイルの一致。
- End-to-end / CI: `bun run build`、full `bun run test:ci`、reproducible build、source-only / graph invariant job、coverage。
- Security: 不正な生成物追跡と Git inventory 取得失敗を fail closed にし、credential / per-user runtime を再包含しない。
- Performance: tracked path を2倍にしたfixtureで predicate 呼出し回数が線形であることを検証する。常駐serviceや負荷境界はない。

## 非適用項目

API、repository/data access、database migration、frontend、database、queue、cloud infrastructure、deployment/IaC の新設は本 Unit に存在しない。UI は `frontend-components` の根拠付き N/A を継承し、公開出力はCLIの診断メッセージのみとする。
