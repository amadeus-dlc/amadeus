# re-scan: 260726-crossreviewed-bug-batch

上流入力（consumes 全数）: Developer スキャン結果 `amadeus/spaces/default/intents/260726-crossreviewed-bug-batch/inception/reverse-engineering/scan-notes.md`

## スキャン諸元

| 項目 | 値 |
| --- | --- |
| intent | `260726-crossreviewed-bug-batch`（クロスレビュー済みバグ7件バッチ） |
| Scope | `amadeus-bugfix`、Brownfield、単一 repo `amadeus` |
| Base commit | `e12259ba78b8c56bf3572c9bfd44a7bdf84d681c`（前 intent `260726-grant-scope-gate` の observed） |
| 祖先性 | `git merge-base --is-ancestor e12259ba7 HEAD` **exit 0**、`git rev-list --count e12259ba7..HEAD` = **2**（cid:reverse-engineering:rescan-base-ancestry） |
| Observed commit | `1673c433209c74820881c75a0816bbce3fb2d512`（= 現 HEAD、ブランチ `worktree-bugfix`） |
| 区間規模 | `git diff --shortstat e12259ba7 HEAD` = **52 files changed, 3024 insertions(+), 48 deletions(-)** |
| 正本実装の変更 | `git diff --stat e12259ba7 HEAD -- packages/framework/core/` = **`amadeus-lib.ts` 1ファイル、35 insertions(+) / 3 deletions(-)** |
| 方式 | 差分リフレッシュ（フルスキャン不実施、cid:reverse-engineering:c1） |

区間の内訳（`git log --oneline e12259ba7..HEAD` 全2件）:

- `10d8bcfbb` — [PR #1499](https://github.com/amadeus-dlc/amadeus/pull/1499) / [Issue #1497](https://github.com/amadeus-dlc/amadeus/issues/1497)。`standingGrantSatisfiesGate` の scope 解決を stage frontmatter 直読から scope-grid 由来解決へ差し替え。
- `1673c4332` — record snapshot のみ、コード面の変更なし。

## 患部の現存判定（observed `1673c4332`）

| Issue | P/S | 現存判定 | 主患部 |
| --- | --- | --- | --- |
| [#1489](https://github.com/amadeus-dlc/amadeus/issues/1489) | P2/S3 | 現存 | `scripts/mirror-distribution-benchmark-aggregate.ts:20, 32, 33-35, 61-62` |
| [#1457](https://github.com/amadeus-dlc/amadeus/issues/1457) | P2/S3 | 現存 | `amadeus-election.ts:486, 494, 503` / `amadeus-election-record.ts:186, 193, 196` |
| [#1377](https://github.com/amadeus-dlc/amadeus/issues/1377) | P3/S3 | 現存（`amadeus-log` 経由の emitter のみ封鎖済み） | `amadeus-lib.ts:3313-3316, 3326-3328` / `amadeus-audit.ts:258-262` |
| [#1459](https://github.com/amadeus-dlc/amadeus/issues/1459) | P3/S3 | 現存 | `amadeus-election-model.ts:62, 81-82, 449, 456` |
| [#1462](https://github.com/amadeus-dlc/amadeus/issues/1462) | P3/S4 | 現存（`:1795` → `:1823-1824` へ行シフト） | `amadeus-graph.ts:1823-1824`（対照ガードは `:1828`） |
| [#1458](https://github.com/amadeus-dlc/amadeus/issues/1458) | P3/S4 | 現存 | `amadeus-election.ts:293, 326, 582` / `amadeus-election-transport.ts:173, 183` |
| [#1388](https://github.com/amadeus-dlc/amadeus/issues/1388) | P3/S4 | 要精査（構造は現存、検証除外は FR-6 既決） | `team-up.sh:998, 1061-1062, 1098-1099, 1116-1117`（`scripts/` → `packages/framework/core/tools/` へ移動済み） |

**区間内で対象7件のいずれも修正されていない。** 区間の正本 diff が `amadeus-lib.ts` の #1497 修正のみであることを `git diff --stat` の出力で機械確認した。

## Architect 段の独立再検証で検出した訂正

上流 scan-notes の file:line を observed で直読照合した結果、**1件の行番号訂正**を検出した（cid:reverse-engineering:cite-shift-vs-nonshift-separation — 一括シフト補正では救えない単発の off-by-two）。

| 対象 | scan-notes の記載 | observed 実測 | 確認手段 |
| --- | --- | --- | --- |
| `if (minimum <= 0) return true;` | `scripts/mirror-distribution-benchmark-aggregate.ts:30` | **`:32`** | `grep -n "minimum <= 0"` 出力 |

他の照合対象（`amadeus-lib.ts:3313-3316` / `:3326-3328` / `:4126-4128`、`amadeus-graph.ts:1823-1824` / `:1828`、`amadeus-election-model.ts:81-82`、`amadeus-election.ts:326` / `:582`、`amadeus-election-record.ts:186` / `:193` / `:196`、`amadeus-election-transport.ts:183`、`team-up.sh:998` / `:1116-1117`、`amadeus-audit.ts:258-262`、`mirror-distribution-benchmark-aggregate.ts:20` / `:33-35` / `:61-62`）はすべて一致を確認した。

配布コピー数も再実測し、scan-notes の「増幅面の要約」と一致することを確認した（`git ls-files "*/<file>" | grep -v '^packages/' | wc -l` の出力転記、測定 ref `1673c4332`）: `amadeus-election.ts` / `amadeus-election-record.ts` / `amadeus-election-model.ts` / `amadeus-election-transport.ts` / `amadeus-graph.ts` / `amadeus-lib.ts` / `amadeus-audit.ts` / `team-up.sh` = 各 **10**、`mirror-distribution-benchmark-aggregate.ts` = **1**（配布対象外）。

## 合成上の主要な確定事項

1. **7件中6件は対操作の非対称に還元できる**（cid:requirements-analysis:symmetric-pair-review）— fail-closed 側が実在するのに対操作が fail-open、あるいは doc コメントが宣言する設計に配線が追随していない。詳細は `architecture.md` の本 intent 節の対応表。
2. **#1457 は org.md Forbidden の「検証劇場」に直接該当**。ただし実効カバー（`checkGoaLine`、`tally` 再計算、timeline 単調性）が併存するため、未ガードは「ledger 件数 vs materialize 件数」の乖離のみに限定される。
3. **#1457 / #1458 の原因の所在は実装（配線）**。`amadeus-election-record.ts:182-185` と `amadeus-election-transport.ts:165-167` の doc コメントが正しい設計を明言している。
4. **#1388 は性格判定が先決** — 検証除外は `team-up.sh:1098-1099` の "Codex is out of scope (FR-6)" として既決。修正対象か、既決設計を根拠にクローズかで扱いが分岐し、前者なら仕様変更に当たりうる。
5. **election サブシステム3件の交差** — #1457 と #1458 が `amadeus-election.ts` で交差。直列化か、ファイル内スコープの非交差切り分けの判断が要る（判定は静的目録でなく実 diff で、cid:code-generation:c6）。
6. **#1489 以外の6件は配布同期が必須** — `bun scripts/package.ts` / `bun run promote:self` の再生成と `dist:check` / `promote:self:check`。

## センサー不適用と代替検証

RE ステージが宣言する3センサー（`required-sections` / `upstream-coverage` / `answer-evidence`）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**であり発火不能である（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わない。**

代替として以下2点を実施した。

**(a) H2 見出し数の機械確認（`grep -c '^## '`、H2 ≥ 2 を要件とする）**

| 成果物 | H2 数 | 判定 |
| --- | --- | --- |
| `reverse-engineering-timestamp.md` | 59 | PASS |
| `architecture.md` | 43 | PASS |
| `component-inventory.md` | 30 | PASS |
| `code-structure.md` | 42 | PASS |
| `code-quality-assessment.md` | 46 | PASS |
| `api-documentation.md` | 22 | PASS |
| `dependencies.md` | 18 | PASS |
| `business-overview.md` | 16 | PASS |
| `technology-stack.md` | 16 | PASS |
| `re-scans/260726-crossreviewed-bug-batch.md`（本ファイル） | 6 | PASS |

値は `grep -c '^## '` の出力からの転記（cid:requirements-analysis:numbers-from-command-output-only）。全10件が H2 ≥ 2 を充足。

**(b) 上流入力（`scan-notes.md`）への実参照の確認** — 更新した9成果物および本ファイルの本文に `scan-notes` への参照が実在することを `grep -c 'scan-notes'` で機械確認した（出力転記）: `reverse-engineering-timestamp.md` 17 / `architecture.md` 6 / `component-inventory.md` 3 / `code-structure.md` 20 / `code-quality-assessment.md` 16 / `api-documentation.md` 2 / `dependencies.md` 2 / `business-overview.md` 2 / `technology-stack.md` 2 / 本ファイル 5 — 全件 1 以上。装飾トークンではなく、いずれも本文の依拠箇所からの参照である（cid:code-generation:artifact-upstream-inputs-header の趣旨に従い、実参照のみを記載）。

**(c) 旧「現在」マーカーの降格確認** — `grep -rn "、現在、\|（現在:" amadeus/spaces/default/codekb/amadeus/` を実行し、**H2 見出しに現れる残存ヒットは本 intent `260726-crossreviewed-bug-batch` の5節のみ**（`architecture.md:3` / `component-inventory.md:3` / `code-structure.md:3` / `code-quality-assessment.md:3` / `reverse-engineering-timestamp.md:3`）であることを機械確認した。前 intent `260726-grant-scope-gate` の H2 は5件すべて「、履歴、」へ降格済み。見出し以外の残存ヒット（`reverse-engineering-timestamp.md:16` / `:32`、`re-scans/*.md` の該当行）は、いずれも**この grep パターン自体を引用する散文**であり降格対象ではない（cid:reverse-engineering:c3-relabel）。

## Delivery boundary

本 scan の成果物は codekb 9 成果物の差分更新と本 per-intent 記録のみ。患部コードへの修正、GitHub Issue の操作、intent record / state / audit / 生成配布物への書込は一切行っていない。7件の修正可否・方式（特に #1388 の性格判定と #1458 の2案）は後続の requirements-analysis 以降で確定する。
