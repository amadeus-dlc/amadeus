# Reverse Engineering スキャンノート — #1081(teamup-resume wall-clock drift)

- **手法**: diff-refresh(cid:reverse-engineering:c1)
- **base**: `6495e03a12d9e7149c2e80b59f171a90607a2d2c`(祖先性 `git merge-base --is-ancestor` exit 0・距離 86 コミット、rescan-base-ancestry 準拠)
- **observed(現 HEAD)**: `5761e65ce73a82b055590a50f483161e5df2abca`(`git rev-parse HEAD` 実測)
- 全 file:line は observed HEAD の実コード直読で確定(mechanism-cite-verify)。

## フォーカス面ごとの実測

### 1. 対象テスト `tests/integration/t-team-up-codex-resume.test.ts`

- **`// size:` 宣言の不在**: `grep -c '// size:'` = **0**(実測)。static signal 分類(`classifyTestSize`)が唯一の有効 size となり、spawn(`Bun.spawnSync` :29)+ fs(`node:fs` :3-10)で **medium**。これが実測 31〜32s(large 下限 30s)を下回る宣言帯として drift を発現させる。
- **`// covers:` ヘッダも不在**: `grep -n 'covers:'` = 0 件。ファイル先頭(:1)は `import { afterEach, describe, expect, test } from "bun:test";` で、**先頭コメントブロックが一切存在しない**。→ #1077/t224 の「covers 直後へ挿入」配置は本ファイルにそのまま適用できない(covers 行が無い)。宣言を置くなら**ファイル最上部(現 :1 の import より前)へ新規行として**追加する形になる(`parseSizeAnnotation` は先頭 40 行を走査し `^\s*(?:\/\/|#)\s*size:` を先頭一致で拾うため、import 前の :1 に置けば有効)。
- **テスト数**: `test(`/`it(` 相当 37 件(`grep -c` 実測。e4 のクリーン再現「37 pass」と一致)。
- **直近の書き換えとの関係**: 区間内で本ファイルを触ったのは `789a9d799`(#1050、team-up herdr 一本化、tmux backend 廃止で +139/-18)の1コミットのみ(下表)。ファイル自体の**新規追加は #928(`74469ad4d`、2026-07-12)で base より前**のため区間差分には現れない(e4 補正コメントと整合)。→ 帰属は「ファイルは #928 由来、30s 超の drift 発現は #1050 増強後に観測」。#1050 以前版が 30s 超だったかは未実測。
- **1行結論**: 宣言不在ゆえ static=medium が有効宣言となり実測 large 帯を下回る、covers ヘッダも無い新規テスト — 修正は最上部への `// size:` 1行宣言。

### 2. size 機構 `tests/lib/test-size.ts`

- **`WALL_CLOCK_BANDS`(:89)**: `{ smallMaxSeconds: 1, largeMinSeconds: 30 }`。lower-inclusive / upper-exclusive。
- **`sizeFloorFromDuration`(:95-99)**: ≥30s → large、≥1s → medium、else small(:96-97)。31.99s → large 確定。
- **`detectWallClockDrift`(:113-121)**: `SIZE_ORDER[dynamicFloor] > SIZE_ORDER[effectiveDeclared]` の**strictly-larger 上方向専用**(:117)。measured(dynamicFloor=large)> declared(medium)で `kind:"wall-clock"` を構築。逆方向・同値は `none`。→ 宣言を large に上げれば `large > large` は偽で drift 消滅。
- **`parseSizeAnnotation`(:279-291)**: 先頭 **40 行**を走査(:280、「mirrors where `// covers:` lives」:278)、regex `^\s*(?:\/\/|#)\s*size:\s*(\S+)/i`(:282)、**先頭一致 wins**(:281 loop で最初のヒットを return)。有効宣言の条件 = 値が `SIZE_VALUES`(small/medium/large :25)に含まれること(:285)。範囲外は `{declared:null, invalidValue}`(:288、drift guard が別途拒否)。
- **`buildMeasuredRecord`(:141-161)**: `effectiveDeclared = annotation.declared ?? classification.size`(:149)。**宣言があればそれ、無ければ static**。宣言不在の本ファイルは static=medium が effectiveDeclared になる。
- **1行結論**: 宣言を `large` にすると effectiveDeclared=large となり detectWallClockDrift が `none` を返す — これが修正の効く機序。

### 3. drift 報告経路 `tests/run-tests.ts`

- **観測専用・exit 非影響(:915-923)**: `printSummary` 内 `// Observability only — MUST NOT affect the process exit code (t112 pins exit == failed-file count)`(:915-916)、`try { printSizeMatrix(); reportDynamicSizes(collector); } catch {}`(:917-923)で全吞み込み。→ **drift は表示のみ、CI exit に影響しない**(S4-MINOR 見立ての根拠)。
- **drift 行出力(:973-979)**: `reportDynamicSizes`(:942 起点)が `wall-clock drift: N file(s)`(:973)を出力し、`r.drift.kind === "wall-clock"` の各レコードで `  <file>: declared=X measured=Y (Zs)`(:975-979)を出力。durations は `collector.durations`(:96 定義、:792 で `measuredSeconds` を set、:943 で反復)。
- **1行結論**: drift は run-tests.ts の観測専用出力で exit-code 契約から隔離済み — 修正の受け入れ実証は「drift 行が 0 file(s) になる」ことで足りる(赤/緑ゲートは介在しない)。

### 4. 前例形 #1077(t224、`29bb97f45`)

- **実 diff**: `tests/integration/t224-upstream-v2-migration-cli.test.ts` に **1 insertion のみ**。`// covers:` 行(:1)の**直後 :2 に `// size: large` を挿入**(`@@ -1,4 +1,5 @@` で covers→size→`//`→ 本文)。付随するテスト本体・他ファイルの変更は**無し**(`--stat` = 1 file changed, 1 insertion)。
- **コミットメッセージ**: `test(t224): declare size: large to close wall-clock drift (#1077)` + `Refs #1059`。t224 は 35.75〜46.03s(30s large floor に対し恒常マージン厚)。
- **本件との差**: t224 は **covers ヘッダを持つ**ため「covers 直後」が自然。本件 #1081 のファイルは covers 無しのため配置が異なる(→ フォーカス面1参照)。文言 `// size: large` と「1行・本体不変」の型は踏襲可能。
- **1行結論**: 型(1行宣言・本体不変・`Refs`)は流用可、ただし挿入位置は covers 不在ゆえ最上部へ変える必要がある。

### 5. size ゲートのテスト `tests/unit/t-test-size-drift.test.ts`(指定パスは integration だが実在は unit/)

- **検査対象と落ちる実証の設計材料**:
  - **on-disk drift guard(:122-134)**: 全 `*.test.ts` を走査し、`declared !== null` かつ `SIZE_ORDER[declared] < SIZE_ORDER[measured(static)]` を **violation**(:129)。→ **`// size: small` を spawn/fs ファイルに注入すると赤くなる**(guard predicate 単体テスト :96-103 が同じ比較を固定)。これが「落ちる実証」の注入点。
  - **invalid 値ガード(:113-120)**: `// size: tiny` 等は `invalidValue` で赤(:117-119)。
  - **layer×size purity(:180-224)**: scope ごとの max size を **static measured** で判定(:192-195、integration max=medium :164)。→ **本件で `// size: large` を宣言しても purity は static measured(=medium)を見るため無関係**、赤化しない。allowlist(unit×non-Small ラチェット :198-217)も unit 限定で本 integration ファイルに無関係。
  - `size: large ≥ static medium` なので drift guard(declared<measured)にも触れない。→ **`// size: large` 追加はどのゲートも赤化させない**(ゲートは declared が measured を**下回る**方向のみ罰する)。
- **1行結論**: guard は「宣言 < static measured」方向専用。large 宣言は全ゲート緑を維持し、落ちる実証は別途 `// size: small` 注入で drift-guard 赤を確認できる。

### 6. 区間差分 base..HEAD(86 コミット)

| フォーカス面ファイル | base..HEAD で触れたコミット | 件数 |
|---|---|---|
| `tests/integration/t-team-up-codex-resume.test.ts` | `789a9d799`(#1050、herdr 一本化 +139/-18) | 1 |
| `tests/lib/test-size.ts` | (なし) | 0 |
| `tests/run-tests.ts` | (なし) | 0 |
| `tests/unit/t-test-size-drift.test.ts` | (なし) | 0 |

→ size 機構(test-size.ts / run-tests.ts / drift-guard)は区間内で**不変**。変わったのは対象テスト本体のみ(#1050)。file:line 引用は現 HEAD で有効。

## 実測データ(3実行系、恒常性)

| 実行系 | 条件 | 実測 duration | 判定 |
|---|---|---|---|
| e2(起票 #1081) | coverage あり scratch(PR #1077 head f05373e89) | 31.989682s | large |
| e3(クロスレビュー1人目) | macOS coverage なし単独、cpu 63% | 32.530s(exit 0) | large |
| e4(クロスレビュー2人目) | origin/main a6f7a5595 clean scratch、`run-tests.sh --integration --filter` | 31.299009s(37 pass) | large |

- 3系すべて large 帯(≥30s)到達 → drift の恒常性を支持。ただし全系が 30s 下限から **約1.3〜2.5s** のマージン(t224 の 35.75〜46.03s より薄い)。境界近傍のため、宣言値確定は修正時の複数回実測で(単発断定を避ける)。e4 は「宣言でなくテスト分割・高速化も比較対象」と留保 → E-1081-FIX 裁定 C は「`// size: large` 宣言 + 短縮の別 Issue 起票」で両立(citation-reservation-preservation: 留保を要件へ保存すること)。

## codekb 更新判定

**diff-refresh 対象なし(churn 回避)**。理由:
- codekb に test-size / wall-clock drift の専用節は不在(`grep -rln 'test-size\|WALL_CLOCK\|wall-clock drift' codekb/` = 0 件)。
- size 機構ファイル(test-size.ts / run-tests.ts / drift-guard)は区間内不変(フォーカス面6)、codekb の既存構造記述に影響なし。
- 本 intent は 1 テストファイルへの 1 行宣言追加の bugfix(生産コード不変)。codekb の構造・依存・品質記述を動かす変更ではない。
→ 本 scan-notes が後続ステージ(requirements/code-generation)の必要情報を全て保持しており、codekb への追記は不要。

## Architect 合成(実装可能性判定)

- **再検証(独立再照合 7 点、全一致)**: test-size.ts:89 `WALL_CLOCK_BANDS={smallMaxSeconds:1,largeMinSeconds:30}`、:95-99 `sizeFloorFromDuration`(≥30→large)、:113-121 `detectWallClockDrift`(:117 strictly-larger)、:141-161 `buildMeasuredRecord`(:149 `effectiveDeclared = annotation.declared ?? classification.size`)、:279-291 `parseSizeAnnotation`(:280 先頭40行・:285 SIZE_VALUES 判定)、run-tests.ts:915-923(observability-only try/catch)+:973-979(drift 行)、t-test-size-drift.test.ts:113-120(invalid guard)+:122-134(:129 `declared<measured` violation)。scan-notes の引用に訂正不要。
- **(a) 修正の効く機序(1段論証)**: ファイル最上部へ `// size: large` を置く → parseSizeAnnotation が `declared="large"` を返す(先頭40行内・SIZE_VALUES 適合)→ buildMeasuredRecord で `effectiveDeclared="large"`(:149)→ detectWallClockDrift(:117)の `SIZE_ORDER[large] > SIZE_ORDER[large]` は偽 → `{kind:"none"}`。drift 消滅。
- **(b) 配置の確定根拠**: 本ファイルは `covers:`/先頭コメントブロックともに不在(フォーカス面1 grep 実測)、かつ parseSizeAnnotation は先頭40行を走査し先頭一致で拾う(:280-285)。よって現 :1 の import より前に新規1行として挿入すれば有効。#1077/t224 の「covers 直後」型は本ファイルに適用不可。
- **(c) 落ちる実証の手順列**: (1) 最上部に `// size: small` を注入 → t-test-size-drift.test.ts:122-134 の on-disk drift guard が `SIZE_ORDER[small] < SIZE_ORDER[medium(static)]` で violation → 赤化を確認(guard の反応を実証)。(2) `// size: small` を除去し正の `// size: large` へ差し替え → 全 size ゲート緑(purity は static=medium 判定で無関係、フォーカス面5)。(3) 対象テストを実走行し run-tests.ts:973 の `wall-clock drift: 0 file(s)` を実測 → drift 0 閉包(ruling-premise-closure-verification)。
- **リスク**: 実測マージンが 30s 下限から約1.3〜2.5s と薄く(t224 より薄い)、境界近傍。宣言値 large の妥当性は修正時の複数回実測で裏取りし単発断定を避ける。短縮案は E-1081-FIX 裁定 C に従い別 Issue で並走(留保保存)。それ以外に実装リスクなし(生産コード不変・1行追加・ゲート隔離済み)。
