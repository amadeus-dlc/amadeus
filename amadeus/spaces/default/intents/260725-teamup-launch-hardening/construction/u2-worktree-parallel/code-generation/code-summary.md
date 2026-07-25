# Code Summary — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/domain-entities.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-design/performance-design.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-design/security-design.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`（`deployment-architecture` は本 intent に成果物が存在せず N/A）

- `business-rules.md` — BR-P1〜BR-P20 の充足状況を下表で1件ずつ対応づけた。
- `business-logic-model.md` — 4a〜4d のフローが実装のどの行に落ちたかを示した。
- `domain-entities.md` — INV-P2〜INV-P5 の成立を、テストの観測点として引いた。
- `performance-design.md` — D-P1 / D-P2 / D-P4 を、実測値と定数コメントで確認した。
- `security-design.md` — D-S1 の3層限定が実装のどの行かを対応づけ、層2を落とす注入で実効を確認した。
- `unit-of-work.md` — U2 の完了の定義5項目を、達成状況の節で1件ずつ照合した。
- `requirements.md` — FR-6〜FR-8 / NFR-1 / NFR-4〜NFR-7 の充足を、検証の実測 exit code で示した。

実装コミット: `1f4e82257`（親 `07962180a`）。

## 変更ファイル

| ファイル | 種別 |
|---|---|
| `packages/framework/core/tools/team-up.sh` | 正本 |
| `tests/integration/t295-team-up-worktree-parallel.test.ts` | 新規テスト |
| `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/…/tools/team-up.sh` | 生成物（6面） |
| `{.claude,.codex,.cursor,.opencode}/tools/team-up.sh` | self-install（4面） |

正本 +73 / −14、テスト +273。合計11コピーが同期済み（BR-P19）。（測定: `git show --numstat 1f4e82257 -- packages/framework/core/tools/team-up.sh` → `73	14`。当初 +87 と記載したのは `--stat` の合算値 73+14 を挿入行数と取り違えたもの。§12a レビュー Major-1 で捕捉・是正）

## 実装の所在（最終行番号）

| 実装 | 行 |
|---|---|
| `WORKTREE_PARALLELISM=4`（実測コメント `:123-128`） | `:129` |
| 並列バッチループ | `:1351-1377` |
| 完了照合（git 登録） | `:1379-1395` |
| `rollback_prepared_run` の3層限定走査 | `:1273-1300` |
| 末尾の無条件 `rm -rf`（不変） | `:1299` |

## ルールの充足

| ID | 状況 | 根拠 |
|---|---|---|
| BR-P1 | 充足 | `:1371-1375` のカウンタ + `wait`。t295「concurrency never exceeds」が実測 peak ≤ 4 かつ > 1 を確認 |
| BR-P2 | 充足 | `:123-128` に実測表をコメント。t295 が値 4 とコメント文字列の双方を assert |
| BR-P3 | 充足 | t295「all 7 members」で 7/7 の git 登録を確認 |
| BR-P4 | 充足 | `:1367-1369` がサブシェル内。t295 が全メンバーの `path` / `branch` を確認 |
| BR-P5 | 充足 | 実測 直列 7.77秒 → 並列 3.60 / 3.55 / 5.81秒（下記） |
| BR-P6 | 充足 | `grep -rn "CREATED_MEMBERS"` が 0 件（下記） |
| BR-P7 | 充足 | 着手時に grep を再実行し3件を出力から転記して確定 |
| BR-P8 | 充足 | `:1283-1296` の `RUN_ROOT` 走査。子→親の共有機構を新設せず |
| BR-P9 | 充足 | `:1288-1291` の `members_for` 照合。層2を落とす注入で t295 が赤化 |
| BR-P10 | **充足（失敗注入で実証）** | 下記「失敗注入」 |
| BR-P11 | 充足 | `:1299` を維持。t295「husk is removed too」 |
| BR-P12 | 充足 | t295 が `RUN_ROOT` / `RUN_RECORD` の不在を確認 |
| BR-P13 | 充足 | `:1364` の1行報告。t295 がメンバー名 + パスの完全一致を確認 |
| BR-P14 | 充足 | `:1392-1394` の `return 1` |
| BR-P15 | 充足 | 失敗報告が1行に自己完結（`:1361-1364` のコメントに理由を明記） |
| BR-P16 | 充足 | 手順1〜3 は無改変（diff の範囲） |
| BR-P17 | 充足 | `handle_exit` 無改変 |
| BR-P18 | 充足 | U1 の関数群に触れていない |
| BR-P19 | 充足 | `dist:check` / `promote:self:check` が exit 0 |
| BR-P20 | 充足 | 行番号を実ファイルで再解決（plan 参照）。定数ブロックの conflict は不発生 |

## 検証結果

| コマンド | exit code |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bash tests/run-tests.sh --ci` | 0（547ファイル / 失敗0。t295 の PASS を実文で確認） |

## 落ちる実証

対象ファイル限定の `git checkout <sha> -- packages/framework/core/tools/team-up.sh` で切替（stash 不使用）。注入面は t295 が実際に読む正本パス（`cid:code-generation:injection-surface-verify`）。

**是正後の値を記録している。** 初回の測定（8/8 赤）は、`CREATED_MEMBERS` が lib シーム下で未束縛（`set -u`）になる測定アーティファクトを含んでいたため、環境で束縛して測り直した。

### (1) 全面 revert（`1f4e82257~1`、`CREATED_MEMBERS=""` を束縛）

4 fail / 4 pass。赤化したのは新しい振る舞いを直接見る4件:

| 赤化したテスト | 検出内容 |
|---|---|
| BR-P2 定数 | `WORKTREE_PARALLELISM` 不在 |
| BR-P1 並列度 | peak = 1（直列のまま） |
| BR-P13/P14 失敗報告 | メンバー名付きの報告行が出ない |
| D-R4 husk | stderr が空（**無音失敗** — FR-8 が塞ぐギャップそのもの） |

残る4件（happy path と3つのロールバック）は旧実装でも通る。旧実装の直列ループでは台帳が正しく維持されるため当然であり、これらは退行防止のピンとして機能する。**ただしそれでは BR-P10 / BR-P9 の実効が示せないため、下の的を絞った注入を追加した。**

### (2) 的を絞った注入 — 並列ループ + 旧台帳ロールバック

設計が「壊れる」と述べた組み合わせ（`rollback_prepared_run` だけ台帳読取に戻す）:

- **2 fail / 6 pass** — BR-P10/P12（部分失敗のロールバック）と BR-P9/D-S1 が赤化。サブシェルの台帳が親へ届かず worktree とブランチが取り残される。
- BR-P11（husk）は緑のまま。`:1299` の無条件 `rm -rf` が別の面を守っているためで、正しい挙動。

### (3) 的を絞った注入 — D-S1 層2（名前照合）の除去

`case "$members" in …` を削除:

- **1 fail / 7 pass** — BR-P9/D-S1 のみ赤化。非メンバー名の worktree に対して `worktree remove --force` / `branch -D` が走り、ブランチが消える。

## 失敗注入によるロールバック実証（BR-P10、RAID R-4）

feasibility では失敗が発生せず未観測だった面を、PATH 上の `git` shim による注入で実証した（本番コードにテスト用の分岐を持ち込まない — `construction.md` のテストダブル規律）。

| 注入 | 結果 |
|---|---|
| `engineer-2` の `add` を失敗させる | `create_run` が非ゼロ。stderr に `ERROR: worktree add failed for engineer-2: <path>` と `worktree creation incomplete`。`rollback_prepared_run` 後、`RUN_ROOT` / `RUN_RECORD` が不在、`team/testrun/*` ブランチが 0 件、git 登録に `/runs/testrun/` が残らない |
| `engineer-3` のディレクトリだけ作って失敗させる（D-R4 の偽陽性ケース） | ディレクトリは実在するが git 未登録。完了照合が正しく `missing` と判定し非ゼロ。ロールバック後 `RUN_ROOT` 不在 |
| `RUN_ROOT` 内に非メンバー名の worktree を登録 | そのブランチは生存。メンバーのブランチのみ全消去 |

## 性能実測（BR-P5、NFR-1）

本リポジトリの `--local` クローン（tracked 11,159ファイル）で7メンバー構成を測定:

| 並列度 | 所要時間 |
|---|---|
| 1（直列） | 7.77秒 |
| 4 | 3.60 / 3.55 / **5.81**秒 |

設計値（直列 7.39秒 → 3.3秒前後）と整合する。3回目の 5.81秒 は測定時のホスト負荷による外れ値で、そのまま記録する（丸めない）。

## `CREATED_MEMBERS` 消費者の是正

着手時の grep（出力からの転記、既存表を信用しない — `cid:functional-design:inventory-from-grep-each-time`）:

```
packages/framework/core/tools/team-up.sh:1269:  for m in $CREATED_MEMBERS; do
packages/framework/core/tools/team-up.sh:1331:    CREATED_MEMBERS="$CREATED_MEMBERS $m"
packages/framework/core/tools/team-up.sh:1417:CREATED_MEMBERS=""
```

3件すべて除去。実装後の再実行は 1 件で、内訳は `tests/integration/t295-team-up-worktree-parallel.test.ts:3` の**歴史的経緯を説明するコメント**のみ。実行コードからの参照（機能的消費者）は 0 件で、`team-up.sh` に `CREATED_MEMBERS` は完全に不在。`scripts/` `docs/` はヒットなし。（当初「0 件（exit 1）」と記載したが、BR-P6/BR-P7 が指定する grep コマンドをそのまま実行した実測は 1 hit。§12a レビュー Minor-1 で捕捉・是正）互換のための別名・フォールバックは残していない（BR-P6、`org.md` Forbidden）。

## 完了の定義の照合（`unit-of-work.md`）

| 項目 | 状況 |
|---|---|
| 7個の作成が 3.3秒前後 | 充足（3.60 / 3.55秒） |
| 同時実行数が4を超えない | 充足（t295 実測 peak = 4） |
| 部分失敗時に全巻き戻し（失敗注入で実証） | 充足 |
| 失敗メンバーが一意に特定できる | 充足 |
| 検証5コマンドが exit 0 | 充足 |

## 実装上の注記

### `wait` の終了コードを見ない理由

`set -euo pipefail` 下で引数なし `wait` は常に 0 を返す（scratch で実測）。よって失敗は `wait` を通らず、抑止（`|| true`）も不要である。失敗検知の唯一の権威は完了照合であり、D-R4 が選択肢 (a) を却下して (c) を採った設計と一致する。

### パス比較の物理パス正規化

`git worktree list --porcelain` は物理パスを返すため、照合側も `cd … && pwd -P` で揃えてから完全一致を取る。macOS の `/var` → `/private/var` のような symlink 差で偽の不一致が出るのを避けるためで、設計の照合方針を変えるものではない。

## 逸脱

なし。設計成果物の指示（並列度4の固定値、バッチ方式、git 登録による照合、3層限定、台帳の完全廃止、外部ユーティリティ不使用）をすべてそのまま実装した。

## §13 学習候補

| # | 候補 | 根拠 |
|---|---|---|
| 1 | シェルの引数位置に依存するテスト用 shim は、対象コマンドの argv を実測してから位置指定を書く。位置がずれても *たまたま同じ文字列* を掴んで緑に見えることがある | t295 の shim で `$7`（branch）を worktree パスと取り違えた。branch の basename もメンバー名だったため失敗注入テストは緑のまま通り、husk テストだけが落ちて発覚した。加えてリポジトリ直下に `team/testrun/engineer-3` を作る副作用も出た（検出・除去済み） |
| 2 | 落ちる実証の全面 revert が「全件赤」になったら、赤の原因が振る舞いの差か測定アーティファクトかを1件ずつ実文で確かめる。`set -u` 下では、旧実装が新しいテストシームで単に起動できないだけでも全件赤になる | 初回 8/8 赤の実体は `CREATED_MEMBERS` 未束縛（初期化が `TEAM_UP_LIB_ONLY` の早期 return より後）。束縛して測り直すと 4/4 で、赤の意味が変わった |
| 3 | リファクタの落ちる実証は全面 revert だけで完結しない。振る舞いを保つことが要件の面（本件のロールバック）は revert しても緑のままなので、設計が「壊れる」と名指しした組み合わせを注入して初めて実効が示せる | 全面 revert ではロールバック3件が緑。並列ループ + 旧台帳の注入で2件、層2除去の注入で1件が赤化し、初めて BR-P10 / BR-P9 の実効が示せた |

## 実 launch による受け入れ検証（conductor 実測、2026-07-25）

実装者の検証（静的テスト・落ちる実証・失敗注入）に加え、conductor が隔離インスタンスで実 launch を行い受け入れ基準を実測した。

### 7人構成（U1 + U2 両方適用、instance `bench5`）

| マイルストーン | 実測 |
|---|---|
| **アタッチ到達（run record 確定。利用者が作業を開始できる時点）** | **T+11.80秒** |
| スクリプト終了（watcher 検証の完了まで） | T+123.12秒 |
| 終了コード | **0** |
| ready sentinel | **7/7 生成** |

### 本 intent 全体での変化（7人構成）

| 段階 | アタッチ到達 | 備考 |
|---|---|---|
| 本 intent 着手前（main、PR #1477 適用済み） | 約12.6秒（推定） | worktree 直列 7.39秒 + ペイン生成等。watcher 検証はスキップされ #1384 の保護は不在 |
| U1 のみ | 実測せず | 検証が機能するが worktree は直列のまま |
| **U1 + U2** | **11.80秒** | worktree 並列化で短縮、かつ **#1384 の保護が機能**（sentinel 7/7、exit 0） |

**本 intent の成果は「速くなった」ことより「保護が効くようになった」ことにある。** 前 intent（PR #1477）が 200.85秒 → 5.87秒（3人構成）を達成した時点で、起動レイテンシは既に解消していた。本 intent はそこに **#1384 の保護を実際に機能させ、かつ起動をさらに速くした**。

### 3人構成との対比

| 構成 | アタッチ到達 |
|---|---|
| 3人（U1 のみ、instance `bench4`） | 6.02秒 |
| 7人（U1 + U2、instance `bench5`） | 11.80秒 |

7人構成でも worktree 並列化により、メンバー数が2.3倍でアタッチ到達は2.0倍に留まっている。

### 実測環境の撤去

隔離インスタンス `bench5` で実施し完全に撤去した。

- `git worktree list` が計測前後とも 32件で一致
- agmsg team 登録（`amadeus-bench5`）残留 0、sentinel / actas ロック残留 0
- herdr セッション削除済み
- 実装者が作業中に作った stray（`team/testrun/engineer-3`）も不在を確認

### 残る未検証事項

| 項目 | 状態 |
|---|---|
| resume（`-c`）でのロック残存 | **未実測**。build-and-test で扱う |
| R-3（actas の受信範囲制限が配送を壊さないか） | **未実測**。7人起動の成功は傍証だが、実際のメッセージ配送は試していない |
| Linux CI 上の並列度特性（RAID R-6） | **未実測**。上限設計で吸収する方針 |
