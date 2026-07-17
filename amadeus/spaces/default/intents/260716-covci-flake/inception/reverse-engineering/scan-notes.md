# RE Scan Notes — 260716-covci-flake(Issue #1085)

## 上流入力(consumes 全数)

Issue #1085(e2 起票+e1/e3 クロスレビュー — e3 の機構矛盾指摘が未切り分け)、leader 割当指示(柱3本)、codekb `code-structure.md`(テストランナー観測面)。`business-overview.md` / `architecture.md` はランナー内部機構のみの bugfix と非交差につき参照非該当。

## Base 選定と到達可能性(rescan-base-ancestry)

- base = `fb1fe079032`(直前 re-scan `260716-diary-ensure-exists.md` の observed)— `git merge-base --is-ancestor` exit 0、距離13で候補中最小(main 側最新 observed `5761e65ce` は自 HEAD の非祖先につき除外 — 非祖先 observed の除外則)
- observed = 本スキャン時 HEAD(commit は record コミットで確定)
- 区間13コミットは record/audit+#1088 ミラーのみ — run-tests 面の変更ゼロ

## フォーカススキャン(失敗計上機構 — 柱(1)の file:line 確定)

### プロファイルと e2e の関係(e3 指摘の裏取り)

- `coverage:ci` = `bun tests/run-tests.ts --ci --coverage --coverage-dir coverage`(package.json:16)
- `--ci` = smoke+unit+integration のみ(run-tests.ts:187-192 — `runE2e` を立てない)。e2e 実行は `--e2e`/`--release` のみ(:183-185、:1167-1199)
- **確定: --ci プロファイルで e2e ディレクトリのファイルは実行されない** — 「e2e 2 fail」が本物の失敗ファイルなら機構上不成立(e3 指摘は正)

### 失敗計上の一次機構

- 各テストファイルの結果は `.meta` ファイルとして `resultsDir` へ書かれ(:439)、`aggregateTierResults()`(:465-479)が読み取り `row.status === "FAIL"` で `failedFiles += 1`(:475)
- `resultsDir = join(logDir, "_results")`(:327)。**非 verbose の logDir は `mkdtempSync`(:323)= run ごとに一意** — 並行 run 間・入れ子 run 間で .meta の交差汚染は構造上起きない(入れ子 spawn の子は自分の mkdtemp を持つ)
- `RESULT: FAIL/PASS` は `failedFiles > 0`(:924)、プロセス exit = failedFiles(:1207、t112 ピン)

### 「unit 1 + e2e 2」表示の候補面(重要 — サマリに per-scope 失敗表は存在しない)

stdout の SUMMARY(:900-925)は Test files / Failed files / assertions の**総数のみ**で、scope 別の失敗内訳を印字しない。size matrix(printSizeMatrix、scope×size の件数表)は**失敗と無関係**。したがって「unit 1+e2e 2」というスコープ帰属は runner の失敗集計出力からは出得ず、出所候補は:

1. **ログ/出力の grep 集計における planted 失敗行の誤計上(未確定仮説)** — reviewer 実読により精密化: t05 系の入れ子 spawn は子出力を pipe キャプチャするのみで親 stdout へ自動では流れない(t05 に console.log 皆無)。親 stdout への条件付きエコー機構は runSpawnCapture の debugPrefix 分岐(run-tests.ts:673、**--debug 限定** — coverage:ci には非適用)。ただし per-file ログ(bun test の出力)には planted の `--- FAIL:`/`RESULT: FAIL`/`PROJECT COVERAGE GATE FAILED` 文字列が正当に含まれ(私の 08:42Z #1057 **CI ジョブログ**精査で同文字列の偽陽性 grep を実測 — CI はログ全文を表示する環境)、ローカルでもログ全文を tee/grep する読み方だと誤計上しうる。**「unit 1+e2e 2」の出所は本仮説を含め未確定** — 能動再現フェーズで (i) 実伝播経路の特定または除外 (ii) Failed files 実数値と実ファイル名の捕捉を必須確認事項とする
2. verbose 時のみの summary.txt Per-file 表(:1060-1067)/ failures.txt(:1079-)— 当該 run は非 verbose につき対象外
3. 実際に Failed files: 3 だった場合の実ファイル名 — 未捕捉(Issue 記載どおり)

### 能動再現ハーネス(柱(2)の設計入力)

- 負荷生成: 別プロセスで CPU/IO 負荷(既存テスト並列 or stress ツール)を並走 → `bun run coverage:ci 2>&1 | tee <scratch>/covci-$(date).log` を反復
- 判定は tee 全文から: `Failed files:` の実数値+`--- FAIL:` 行の実ファイル名(入れ子 planted 行はコンテキスト(=== START/DONE ブロック)で除外)
- 負荷敏感の既知類: t163-reaper-steal-race(e3 が #1085 unit 1 候補として追記済み — Issue コメント)、E-L71 の t05 系入れ子 spawn timeout

## 1行結論

--ci は e2e を実行しない(:187-192)ため「e2e 2」は実失敗なら機構上不成立 — 出所は未確定(planted 行の grep 誤計上は未確定仮説 — reviewer 実読で自動ストリーム経路は非実在と判明、--debug 限定エコーのみ)であり、.meta 集計(mkdtemp 隔離)への交差汚染経路は不在。真の Failed files>0 の実体は tee 捕捉+意図的負荷の能動再現で特定する(unit 1 の最有力は t163 系の負荷敏感)。
