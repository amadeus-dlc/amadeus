# Build & Test Results — 260801-open-bug-batch-5

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- 各 unit の code-generation-plan.md / code-summary.md が宣言・記録した検証集合(CR-4)に対し、統合断面での再実測を行った(bt-20260730-1: per-unit の焦点スイート+本線での full baseline = Comprehensive 執行)。

## 統合断面の full baseline(実測 2026-08-01、tree = origin/main `8d41cb19f` 系譜+record コミット)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bash tests/run-tests.sh --ci` | 0(**RESULT: PASS**) |

- サイズ注記3件(t-solo-standing-grant-opencode-mint / t225 / t05 の declared vs measured)は既存の drift 報告面で本 intent 由来ではない(いずれも本バッチ非接触ファイル)。

## Bolt 別 CI・着地(全てユーザー承認スカッシュマージ、merge-base --is-ancestor 実測)

| Bolt | PR | merge | 着地検証 |
|---|---|---|---|
| 1 mirror(#1838+#1860) | #1876 | `7249da09e` | policy sync 対称化・coordinator 無条件分岐 0 hit・reducer prepared 受理を grep 確認 |
| 2 engine(#1846+#1849) | #1873 | `2dff3440f` | scaffold フィールド 2 hit・resyncStateToStageGraph 実在 |
| 3 OTel(#1856+#1857) | #1886 | `8d41cb19f` | logger-provider の latch ガード 3 hit・session-end 直呼び 0 hit |
| 4 drift(#1863+#1864) | #1877 | `a5b62bf68` | mergeComposedScopes の GC 消滅・CI compile --check 実在・:1838 エントリ 0 件 |
| 5 metrics(#1861) | #1885 | `997beb2c5` | RemoteBranchLoad 実在 |

各 PR の CI は全チェック green(builder 報告+conductor の CI Success 実測)。coverage は各 worktree 単独所有で patch gate uncovered 0 を全 Bolt で実測(Bolt 1: 76/76、Bolt 2: 163 added/160 covered/3 allowlisted、Bolt 3: 51/51、Bolt 4: added 1/covered 1、Bolt 5: 29/29)。

## 実環境閉包(AC-2c — 検証面の書き分け: verdict-names-unverified-facets)

- **検証済み**: 本 intent の mirror に対する `manual sync` boundary が重複 create なしで完了(`{"kind":"completed","operation":"sync","issueNumber":1872}` — #1838 修正の本番実証)。mirror state は issueNumber 1872 / phase-verified create succeeded / manual sync succeeded。
- **書き分け**: intent-initialized の safety-blocked receipt は歴史的痕跡として残存(warnings 2 件込み)— これは #1871(title 由来の 422)の痕跡であり、#1860 の prepared 滞留クラスではない。completion boundary の close は workflow 完了時に実測される(PENDING、閉包条件 = complete-workflow 時の close settled)。
- **FR-4r 検証**: 260729-otel-upstream の skew 修復後、Total 19 = Completed 19 = EXECUTE 行 19 を機械照合で確認(audit 無改変)。

## FR-10(#1871、追加編入分)— 確定

- クロスレビュー2名成立(S3 降格執行)・既存 title 共存許容のユーザー裁定 → Bolt 6 = PR [#1895](https://github.com/amadeus-dlc/amadeus/pull/1895)(merge `a6e9e506b`、祖先実測)で着地。title = intent dir ベース(実例 47B)+200B バイトクランプ、sync の title 非送信契約を t272 で pin、t281 に新 title 形式5テスト。test:ci PASS(722 files)、patch gate 13/13、CodeRabbit Major は fixture 前提の誤りとして反証・解決。着地面 grep 5 hit。#1871 クローズ済み(計 **10 Issue / 6 Bolt / 6 PR**)。
- Bolt 6 builder の申告事故1件(実害なし): 共有 stash の pop 誤適用 — 競合failで stash エントリは保持され、自ツリーは原状回復を実測確認済み(stash-discipline 違反として §13 の実例記録へ)。

## Issue クローズ(close-after-landing-verification 全数実施)

#1838 / #1846 / #1849 / #1856 / #1857 / #1860 / #1861 / #1863 / #1864 — 9件すべて着地面 grep+merge-base 実測のうえクローズ済み。同根起票 3 件(#1874 / #1875 / #1878)は open(本バッチ対象外)。
