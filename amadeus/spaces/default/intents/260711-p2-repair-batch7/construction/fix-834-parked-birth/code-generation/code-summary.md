# code-generation サマリ — fix-834-parked-birth(Issue #834)

## 対象欠陥

`packages/framework/core/tools/amadeus-orchestrate.ts` の Branch 2.5(PARKED 短絡ガード)に `!flags.newIntent` の除外が欠落していた。active-intent cursor が parked intent を指すと `next --new-intent` が `{"kind":"parked"}` に飲み込まれ、`--new-intent` 処理の Branch 4a(birth print)へ到達できず新 intent を birth できなかった。#750(latch 面、#832 で修正済み)の姉妹欠陥・別コードパス。

## 修正内容(file:line)

- `packages/framework/core/tools/amadeus-orchestrate.ts`(修正正本) Branch 2.5 のガード条件に `!flags.newIntent &&` を追加(現行 `:1254`)。あわせて自己無効化条件のコメントに #834 の根拠を追記。
- ブランチベース HEAD: `37ad36a97fe850c4724bc45200eb4456c921d495`

修正は 1 行の実行文追加(+ コメント)。`--new-intent` を明示除外リストに加え、`--resume` / `--stage` / `--phase` と同様に「意図的な再エントリ」として parked 短絡を素通りさせる。挙動契約:

- parked cursor 下でも `next --new-intent` は birth print(`intent-birth`)へ到達。
- `--new-intent` なしの parked 挙動(parked directive 返却)は不変。
- #750/#832 の latch 面テスト・挙動に退行なし。

## RED → GREEN 実測

新規テスト `tests/unit/t213-orchestrate-parked-new-intent.test.ts`(spawn 駆動の verbatim #834 再現 + in-process seam の lcov 登録)。

- 修正前(dist 未再生成、旧バグコード): `--new-intent` の 2 ケースが RED。受領: `{"kind":"parked","reason":"Workflow parked at \"feasibility\". ...","stage":"feasibility"}`。control 2 ケース(plain parked)は PASS。→ `2 pass / 2 fail`。
- 修正 + dist 再生成後: `4 pass / 0 fail`。

`handleNext` は既に export 済み(#750/#832 batch3 seam の precedent)のため、判定部の新規 export 化は不要。既存の `t-batch3-orchestrate-seam.test.ts` の `captureRun` + dist import 様式を再利用した。テスト番号は指示どおり **t213** 系(t211/t212 との衝突回避)。coverage registry への追記は不要(本 seam テストは registry 対象の spawner 宇宙を変えない)。

## 検証(全 exit code)

| 検証 | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0 |
| `bun test t213`(新規) | 0(4 pass) |
| `bun test t114 / t-batch3-seam / t179 / t176 / t213`(退行) | 0(53 pass) |
| `bun test tests/unit/complexity-gate.test.ts` | 0(35 pass) |

## dist 7 面同期

`bun scripts/package.ts` + `bun run promote:self` を実行し、同一コミットへ含める。変更 orchestrate.ts の 7 面:
`packages/framework/core`(正本) / `dist/claude` / `dist/codex` / `dist/kiro` / `dist/kiro-ide` / `.claude`(self-install) / `.codex`(self-install)。

## complexity-gate ラチェットの申し送り(要レビュー確認)

本修正は Branch 2.5 のガードに 1 個の判定項(`&&`)を追加するため、lizard 計測上 `handleNext` の CCN が **38 → 39** に増加する。complexity-gate は「down のみラチェット」だが、これは正当なバグ修正に必須の guard 追加による不可避な +1 である。`tests/.complexity-baseline.json` の `handleNext` エントリを **38 → 39** に単一値バンプした(他エントリ不変)。

補足(既存の計測アーティファクト・本修正のスコープ外): lizard の TypeScript パーサは `handleNext` 内の Branch 2.5 の `(getField(...) ?? "").trim().length > 0`(nullish 合体 + メソッドチェーン)で関数境界を誤認し、関数を `1113-1251` の断片として打ち切って計測している。このため baseline の 38(および今回の 39)は関数全体ではなく断片の CCN であり、full parse 時の真の CCN は約 101。この過小計測の是正や 101-CCN 関数の分割は bugs-only スコープ外(別 Issue 相当)。当初 seam 抽出(predicate をヘルパー化)も試したが、抽出が lizard の打ち切り点を除去して full parse(101)を露出させ、baseline を過大にインフレさせるため撤回し、最小 1 行修正 + 単一値バンプに倒した。

## 同根棚卸し(#750→#834 クラス「フラグ除外リスト漏れ」の全数確認)

`flags.newIntent` を検査すべき短絡ガードを `grep` で全数確認(修正はスコープ外、記録のみ)。Branch 4a(`:1369` 相当、`--new-intent` の birth 分岐)より前に位置し、`--new-intent` を飲み込みうる短絡は以下:

- **Branch 0(read-only latch、`:1129-1131`)** — 既に `!flags.newIntent` を含む(#750/#832 で修正済み)。漏れなし。
- **Branch 2.5(parked 短絡、`:1249-1256`)** — 本修正で `!flags.newIntent` を追加。**これが #834 の残り半分**。
- **Branch 2.6(unpark-on-resume、`:1274` 相当)** — 発火条件が `flags.resume` を必須とするため、`--new-intent` 単独では到達不能。除外漏れではない。
- scope validation 各分岐(`:1301` / `:1316` / `:1327` 相当) — 不正 scope は `--new-intent` 有無に関わらずエラーにすべき正当な分岐。除外不要。
- compose 分岐(`:1346` 相当) — `flags.compose/newScope/report` を必須とする別系統。本クラスの対象外。

結論: 本クラス(フラグ除外リスト漏れ)の残存は Branch 0 と Branch 2.5 の 2 箇所のみで、Branch 0 は #832 で、Branch 2.5 は本修正で塞がった。他に同型の除外漏れは無し。

## lcov(push 前 diff 追加行カバレッジ)

`bun test --coverage --coverage-reporter=lcov` を t213 に対して実行。diff 追加の実行文は `!flags.newIntent &&` の 1 行のみ(残りはコメントで非実行)。

- dist(`dist/claude/.claude/tools/amadeus-orchestrate.ts:1254`)で `DA:1254,21`(21 回被覆)。
- codecov.yml の `fixes`(`dist/claude/.claude/:: packages/framework/core/`、行番号一致)により、この dist 被覆が core の同一行へリマップされる(`ignore: dist/**`)。
- 追加実行行の未カバー = 0。

## 閉包実測(#834 再現手順の verbatim 再適用)

repo 外 scratch workspace + `CLAUDE_PROJECT_DIR` 明示で dist CLI を直接駆動:

- `next --new-intent --scope bugfix`(parked cursor) → `{"kind":"print","message":"Run \`bun .claude/tools/amadeus-utility.ts intent-birth --scope bugfix\` ..."}`(birth 到達、#834 閉包)。
- control `next`(フラグなし) → `{"kind":"parked","reason":"Workflow parked at \"feasibility\". ...","stage":"feasibility"}`(不変)。

## ノルム申し送り: `cid:parked-intent-birth-workaround` の失効

`project.md`(Corrections)/`team.md` の運用知識 `<!-- cid:requirements-analysis:parked-intent-birth-workaround -->`(PM3-7、「active-intent cursor が parked intent を指すと `next --new-intent` が `{"kind":"parked"}` で握りつぶされ新 intent を birth できない → 機械ローカルの active-intent ファイルを削除して回避」)は、本修正(#834)の main 反映により **回避策不要=失効** となる。§13 学習選定または次回ノルム整理で Archived への移動を提案する。

## E-L20 再接地(batch6 #867/#869 着地後)

batch6 の #867(`841751ad7`、`tryEmitSwarm` の swarm バッチ修正、`handleNext` 内 `:1640`/`:2687` 領域を編集)と #869 が origin/main へ着地したため、bolt/834-parked-birth を `git rebase origin/main` で再接地した。

- 旧 merge-base `37ad36a9` → 新 merge-base `aac1869e`(origin/main HEAD)。
- **競合解消内訳**: 競合ゼロ(clean rebase)。#867 の orchestrate 編集(`:1640-2708`)は本修正(`:1254`)と非交差。dist 7 面は rebase の 3-way マージ後 `package.ts`/`promote:self` 再生成で正規化し、`git status` クリーン(drift なし)。
- **complexity-baseline**: origin/main の `handleNext` は依然 `38`(#867 は baseline 未変更 — その編集は lizard 打ち切り点 `~1251` より後方のため断片 CCN 不変)。本ブランチの `38→39` バンプは自分側のみの変更で **競合せず**。再接地後の実測 = lizard `handleNext` CCN **39**(span 1113-1258)、baseline `39` と一致。値の変化: **38 → 39(up、+1)**。
- **CI 赤の根因**(#875 = 本 PR): 本ブランチは pre-#867 の main(`37ad36a9`)基底だった。GitHub は PR を「新 main へのマージコミット」として CI にかけるため、生成物 `dist/` の自動 3-way マージが #867 の overlapping な `handleNext` 編集と噛み合わず、committed dist が `package.ts --check` の決定的再生成と不一致 → **drift fail**、そこから typecheck/tests へ波及した。決定的再接地(rebase + `package.ts` + `promote:self`)で解消。
- **PM1-12(integration-registry-regen)**: 新規 spawner テスト t213(orchestrate/state を spawn)により `gen-coverage-registry.test.ts` の `EXPECTED_NONE_TO_CLI` 宇宙が変化し FRESHNESS 赤。同リストへ `unit/t213-orchestrate-parked-new-intent.test.ts` を追記して解消(registry データ 3 ファイルは `covers:` クレーム無しのため無変更、`--check` OK)。
- **local lcov 再実測**: guard 行は再接地後も core/dist ともに `:1254`。dist `:1254` で `DA:1254,21`、codecov `fixes` により core へリマップ、追加実行行未カバー = 0。
- 全検証再実行(全 exit 0): typecheck / lint / dist:check / promote:self:check / complexity-gate --check / gen-coverage-registry --check / `run-tests.sh --unit`(RESULT: PASS)/ t213(4 pass)/ 退行 60 pass。
