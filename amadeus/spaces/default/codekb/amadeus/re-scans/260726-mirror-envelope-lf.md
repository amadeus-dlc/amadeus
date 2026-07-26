# re-scan: 260726-mirror-envelope-lf

上流入力（consumes 全数）: Developer スキャン結果 `amadeus/spaces/default/intents/260726-mirror-envelope-lf/inception/reverse-engineering/scan-notes.md`

## スキャン諸元

| 項目 | 値 |
| --- | --- |
| intent | `260726-mirror-envelope-lf`（[Issue #1498](https://github.com/amadeus-dlc/amadeus/issues/1498) P1/S2） |
| Scope | `amadeus-bugfix`、Brownfield、単一 repo `amadeus` |
| Base commit | `1673c433209c74820881c75a0816bbce3fb2d512`（前 intent `260726-crossreviewed-bug-batch` の observed） |
| 祖先性 | `git merge-base --is-ancestor 1673c4332 HEAD` **exit 0**、`git rev-list --count 1673c4332..HEAD` = **27**（cid:reverse-engineering:rescan-base-ancestry） |
| Observed commit | `e3940222480b15d9cf10dd0a97df6a35a7ffb7d5`（= 現 HEAD、worktree `.claude/worktrees/bugfix`、ブランチ `worktree-bugfix`） |
| 区間規模 | `git diff --shortstat 1673c4332 HEAD` = **322 files changed, 20142 insertions(+), 2027 deletions(-)** |
| 面別内訳 | record 137 / 実装 58 / dist + self-install 114（`git diff --name-only … \| grep -c` 出力） |
| 患部の区間変更 | `git log --oneline 1673c4332..HEAD -- '*amadeus-mirror-gateway*'` = **0 行** |
| 方式 | 差分リフレッシュ（フルスキャン不実施、cid:reverse-engineering:c1） |

**合成直後の HEAD 前進**（cid:reverse-engineering:upstream-cite-reresolve-on-shift）: 本合成の途中で conductor が `origin/main` を取り込み、HEAD は `e39402224` → **`ccdabd323b8fa56ae8794584f51aec2e68e888ba`** へ前進した（`9e3d6d2fb` metrics snapshot [#1533](https://github.com/amadeus-dlc/amadeus/pull/1533) / `a45b01bd3` **Kimi Code CLI ハーネス追加** [#1522](https://github.com/amadeus-dlc/amadeus/pull/1522) / `3442beec3` metrics snapshot [#1531](https://github.com/amadeus-dlc/amadeus/pull/1531)）。前進後に再実測した結果、**患部ソースは無変更**（`wc -l` = 724、`:196` `const eol = bin.indexOf("\r\n", pos);` 不変。`git log e39402224..HEAD -- '*amadeus-mirror-gateway*'` のヒットは kimi ハーネス由来の新規配布コピー 2 パスのみ）。したがって本記録の file:line は測定 ref `e39402224` のまま有効で、**変わったのは配布コピー数のみ** — `git ls-files "*amadeus-mirror-gateway*"` は **12 → 14**（self-install 4 → 5、dist 6 → 7。追加は `.kimi-code/tools/` と `dist/kimi/.kimi-code/tools/`、`projections.ts:9` `"kimi",` / `:94-95` `kimi: { harnessDir: ".kimi-code",`）。`cmp -s` で配布 12 コピーすべて正本とバイト一致を再実測した。修正 PR が同期すべき生成物は 10 → **12** になる。あわせて `origin/main` から並行 intent `260725-kimi-harness` の RE 節が codekb へ合流したが、同節は合流時点で既に「履歴」ラベルであり本 intent の「現在」マーカーと競合しない。

**ブリーフィングとの差異**: ブリーフィングは区間 23 コミットとしたが observed での実測は **27**。直近の `origin/main` マージ（`e39402224`）以降の前進分を含むため。本 codekb は実測値 27 を採る（cid:requirements-analysis:numbers-from-command-output-only）。

区間の主系統（`git log --oneline 1673c4332..HEAD` 全27件）:

- **前 intent のクロスレビュー済みバグ 6 修正の着地** — `da94f232c`（[PR #1516](https://github.com/amadeus-dlc/amadeus/pull/1516) / [#1457](https://github.com/amadeus-dlc/amadeus/issues/1457)）/ `6aa1eb3eb`（[PR #1517](https://github.com/amadeus-dlc/amadeus/pull/1517) / [#1459](https://github.com/amadeus-dlc/amadeus/issues/1459)）/ `499a65488`（[PR #1518](https://github.com/amadeus-dlc/amadeus/pull/1518) / [#1462](https://github.com/amadeus-dlc/amadeus/issues/1462)）/ `071cb2f7b`（[PR #1521](https://github.com/amadeus-dlc/amadeus/pull/1521)）/ `2f76f79a4`（[PR #1523](https://github.com/amadeus-dlc/amadeus/pull/1523) / [#1458](https://github.com/amadeus-dlc/amadeus/issues/1458)）/ `a41035c63`（[PR #1524](https://github.com/amadeus-dlc/amadeus/pull/1524) / [#1377](https://github.com/amadeus-dlc/amadeus/issues/1377)）/ `1886a2567`（[PR #1507](https://github.com/amadeus-dlc/amadeus/pull/1507) / [#1489](https://github.com/amadeus-dlc/amadeus/issues/1489)）
- CI 検証ジョブの分割 `4e95162e3`（[PR #1528](https://github.com/amadeus-dlc/amadeus/pull/1528)）
- metrics ダッシュボード `aef8fad20`（[PR #1500](https://github.com/amadeus-dlc/amadeus/pull/1500)）/ `8fd9d4138`（[PR #1504](https://github.com/amadeus-dlc/amadeus/pull/1504)）
- 残りは record 同期・metrics スナップショット・`origin/main` マージ

## 患部の現存判定（observed `e39402224`）

| Issue | P/S | 現存判定 | 主患部 |
| --- | --- | --- | --- |
| [#1498](https://github.com/amadeus-dlc/amadeus/issues/1498) | P1/S2 | **現存**（区間内で無変更） | `packages/framework/core/tools/amadeus-mirror-gateway.ts:196`（CRLF 前提の終端探索）→ `:198-199` malformed → `:525-534` `invalid-response`。影響は 5 verb 全部 |

`amadeus-mirror-gateway.ts` / `t272` / `t270` / `amadeus-mirror-lifecycle.ts` のいずれも区間内で 0 変更であるため、クロスレビュー時点（実測 ref `9ea9a6160`）の観測は observed でもそのまま有効で、行番号も一致する。

## Architect 段の独立再検証

上流 scan-notes の file:line・数値を observed で全数直読照合した。**訂正 0 件**（cid:reverse-engineering:cite-shift-vs-nonshift-separation に従い、一括シフト補正では救えない単発ずれも個別に照合）。

| 照合対象 | 結果 |
| --- | --- |
| `amadeus-mirror-gateway.ts` `:179` / `:195` / `:196` / `:198` / `:199` / `:215` / `:220` | 一致（`grep -n` 出力） |
| 同 `:495` / `:509` / `:525-534` / `:549` | 一致 |
| 5 verb の呼び出し `:649-650` / `:656-657` / `:690-691` / `:704-705` / `:718-719` | 一致（`sed -n` 直読） |
| `viewArgv` 実体 `:134-139`（`:138` verbatim）| 一致 |
| `findArgv` の `--paginate` `:124` / `--slurp` `:125` | 一致 |
| `findIssuesByMarker` の `:665` `JSON.parse` / `:669` 不変条件 / `:670` `invalidResponse` | 一致 |
| `tests/unit/t272-amadeus-mirror-gateway.test.ts:61` の `block()` verbatim | 一致 |
| `packages/framework/harness/projections.ts:26` | 一致 |
| `packages/framework/core/tools/amadeus-mirror-lifecycle.ts:29` | 一致 |
| `security-design.md:37`（過去 record の設計宣言）| 一致（`grep -n 'stdout grammar'` = `:37`） |
| allowlist の gateway 行ピン 5 件（`447-448` / `602` / `615-620` / `702` / `716`）| 一致 |

数値も再実測で一致: `wc -l` = **724** 行 / `git ls-files "*amadeus-mirror-gateway*"` = **12** パス / `grep -c 'HTTP/' tests/unit/t272-…` = **1**。

## 合成上の主要な確定事項

1. **主因は bare-LF ステータス行**。`gh 2.96.0` の `--include` はステータス行のみ LF 終端・ヘッダ行は CRLF。パーサ `:196` は CRLF 前提のため `:198` に渡る文字列が `"HTTP/2.0 200 OK\nAccess-Control-Allow-Origin: *"` となり `:199` で malformed。実 `parseHttpEnvelope` を実バイトへ適用した対照実測（実バイト → malformed / ステータス行のみ LF→CRLF 置換 → `{"kind":"ok","statuses":[200]}`）が決定的。
2. **Issue 本文の機序記述は否定済み**。主因を `--slurp` 先頭の `[` とする記述は誤りで、先頭 `[` を 1 バイト除去しても malformed のまま。クロスレビュー 2/2 の訂正を独立再現した。requirements は本 re-scan の機序を前提にする。
3. **影響は 5 verb 全部**。`--slurp` を含まない `viewArgv`（`:138`）経路も malformed。⇒ auto-mirror は全面不成立で、P1/S2 への引き上げと整合。
4. **find は二重の欠陥**。実 `--slurp` 出力は `'[' <HTTPブロック> <ページ配列> ( '\n' ',' … )* ']'` の interleave 文法であり、ステータス行を LF/CRLF 両対応にしても `:669` の `outer.length !== interp.pageCount` で落ちる。修正方式は (A) interleave 文法のブロックパーサ、(B) `--slurp` 撤去して 1 ページずつ取得、の 2 案（クロスレビュー 2/2 は B を推す）。
5. **偽 green の機序は fixture の自作 CRLF**。`t272:61` の `block()` が唯一の `HTTP/` 出現（`grep -c` = 1）で、`singleEnvelope` / `paginatedEnvelope` はこれを連結して**設計宣言そのもの**を再現する。実 `gh` 出力を一度も通していない検証劇場クラス（org.md Forbidden）。
6. **設計宣言も誤っている**。`security-design.md:37` の宣言は実出力と 3 点で相違（LF vs CRLF / interleave / 末尾 LF なし）。これは seam ドリフトではなく**実装時点から実 `gh` 出力を測っていない仮定文法**が宣言・パーサ・fixture の 3 面へ一貫して焼き込まれた構造（cid:application-design:external-seam-vocab-measurement の同族）。本環境に `gh 2.96.0` しか無いためドリフト説は帰属未検証（仮説として明示）。
7. **修正時の連鎖**: 配布 10 コピーの再生成（`bun run promote:self` / `bun scripts/package.ts` + `dist:check` / `promote:self:check`）、`:179-235` への行挿入による allowlist 行ピン 5 件の stale 化（cid:code-generation:allowlist-line-pin-stale、同一 PR で更新）、落ちる実証は `t272:61` の注入面（cid:code-generation:injection-surface-verify — 実 `gh` 形式 fixture の追加それ自体が修正前コードで赤になる）。

## センサー不適用と代替検証

RE ステージが宣言する3センサー（`required-sections` / `upstream-coverage` / `answer-evidence`）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**であり発火不能である（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わない。**

代替として以下を実施した。

**(a) H2 見出し数の機械確認（`grep -c '^## '`、H2 ≥ 2 を要件とする）**

| 成果物 | H2 数 | 判定 |
| --- | --- | --- |
| `reverse-engineering-timestamp.md` | 62 | PASS |
| `architecture.md` | 46 | PASS |
| `code-structure.md` | 45 | PASS |
| `code-quality-assessment.md` | 49 | PASS |
| `component-inventory.md` | 33 | PASS |
| `api-documentation.md` | 22 | PASS |
| `dependencies.md` | 18 | PASS |
| `business-overview.md` | 16 | PASS |
| `technology-stack.md` | 16 | PASS |
| `re-scans/260726-mirror-envelope-lf.md`（本ファイル） | 6 | PASS |

**(b) 上流入力への実参照の確認** — 更新9成果物および本ファイルの本文に上流入力への参照が実在することを `grep -c 'scan-notes'` で機械確認した（出力転記）: `reverse-engineering-timestamp.md` 19 / `architecture.md` 9 / `code-structure.md` 22 / `code-quality-assessment.md` 17 / `component-inventory.md` 4 / `api-documentation.md` 3 / `dependencies.md` 3 / `business-overview.md` 3 / `technology-stack.md` 3 / 本ファイル 3 — 全件 1 以上。いずれも装飾トークンではなく本文の依拠箇所からの参照である（cid:code-generation:artifact-upstream-inputs-header の趣旨に従う）。

**(c) 旧「現在」マーカーの降格確認** — `grep -n '^## .*現在' amadeus/spaces/default/codekb/amadeus/*.md` を実行し、intent マーカーを含む残存ヒットが本 intent `260726-mirror-envelope-lf` の **5 節のみ**（`reverse-engineering-timestamp.md:3` / `architecture.md:3` / `code-structure.md:3` / `code-quality-assessment.md:3` / `component-inventory.md:3`）であることを機械確認した。前 intent `260726-crossreviewed-bug-batch` の H2 5 件はすべて「履歴」へ降格済み（cid:reverse-engineering:c3-relabel）。なお同 grep は `architecture.md:1052` `## 現在の全体構造` と `business-overview.md:106` `## 現在の業務境界` にもヒットするが、これらは intent マーカーを持たない恒常見出しであり降格対象ではない。

（(a)(b)(c) の数値はいずれもコマンド出力からの転記。測定 ref: observed `e39402224`。）

## Delivery boundary

本 scan の成果物は codekb 9 成果物の差分更新と本 per-intent 記録のみ。患部コード（`amadeus-mirror-gateway.ts` およびその配布 10 コピー）・テスト fixture・coverage allowlist・GitHub Issue の操作・intent record / state / audit・生成配布物への書込は一切行っていない。修正方式（単一系の LF/CRLF 両対応、find の interleave 対応 vs `--slurp` 撤去、過去 record `security-design.md:37` の誤宣言の扱い）は後続の requirements-analysis 以降で裁定する。
