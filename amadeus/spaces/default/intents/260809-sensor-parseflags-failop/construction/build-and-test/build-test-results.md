# Build & Test Results — 260809-sensor-parseflags-failop

上流入力(consumes 全数): code-generation-plan.md(実装ステップと検証手順の宣言元)/ code-summary.md(実装面・検証実測の正本)。

測定 ref: origin/main = `cc2187b0e`(PR #2756 squash 着地後)。実行者: conductor(本線ツリー、build 再生成後)。

## 結果表

| 検証 | 結果 | exit | 備考 |
|---|---|---:|---|
| bun install --frozen-lockfile | PASS | 0 | |
| bun run build + porcelain | PASS | 0 | 追跡 drift なし(porcelain 残は本 record の未コミット成果物のみ) |
| bun run lint | PASS | 0 | error 0 |
| 対象6ファイル(t520/t521/t488/t514/t519/t517) | **PASS 211 / 0 fail** | 0 | 512 assertions |
| tests/smoke/t-pi-dist-structure | PASS(再実測) | 0 | 初回赤は**最終 pull 後の build 未実行による stale dist** — 再生成後 33 expect 全 green(環境起因・コード無関係) |
| bash tests/run-tests.sh --ci(フル) | ローカル FAIL 1 file / **main push CI = success** | 1 | 下記帰属 |
| PR #2756 CI(pre-merge) | PASS 13 / 0 fail | - | MERGEABLE/CLEAN で着地 |
| bun run typecheck | **FAIL(ベースライン)** | 2 | 下記帰属 — 本変更外 |

## 赤の帰属(assertion 実文まで読んで確定 — local-ci-red-assertion-verbatim)

1. **typecheck: t523-config-scope-change-lock-seam** — `has no exported member named 'handleConfigChange'`。t523 は **#2749**(`50d9059cc`、本 intent のマージ直前に他セッションが着地)由来で、本 PR の変更ファイルと交差ゼロ(`gh pr view 2756 --json files` に t523 なし)。祖先関係実測: `git merge-base --is-ancestor 50d9059cc cc2187b0e` = yes(ベースライン)。**他セッションの進行中作業のため本 intent では修正しない**(交差回避)— loud にフラグし、当該セッション未対応なら Issue 起票をユーザーへ回付
2. **book-pack-verify.serial 3件** — 全て timeout(210s 超・SIGTERM・`spawnSync bash ETIMEDOUT`)。本 PR は book-pack 面と交差ゼロ。solo 再実行(--timeout 300000)でも同一3件が赤(747秒)だが、**同一コミットの main push CI は success**(クリーンランナーで全 green)— ローカルマシンの高負荷(本日並行セッション多数)起因の環境失敗と帰属。コードの欠陥ではない

## 検証した面 / していない面(verdict-names-unverified-facets)

- 検証済み: 7センサーの strict parse(両アーム負例+正当列)、FR-7 不変(numstat 0)、契約改訂2本の green、patch gate(allowlist 追加なし)、全ハーネス dist 投影の再現性(PR CI の Reproducible build pass)
- 未検証(AC 外): dispatcher 実発火経路での strict parse の悪影響有無は「argv 構成が構造的に対 push」の実装事実+t517 の dispatcher 供給テスト green で担保(実運用での長期観測は通常運用に委ねる)

## 総合判定

**READY(無条件)** — 受け入れ基準(FR-1〜7・NFR)は全て充足し実測済み。未検証面2件はいずれも AC 外(c2-unconditional-ready-boundary)。ローカル赤2種は環境/ベースライン起因で本変更に非帰属(main push CI success が決定的証拠)。
