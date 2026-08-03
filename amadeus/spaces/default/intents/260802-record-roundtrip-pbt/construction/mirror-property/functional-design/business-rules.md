# Business Rules — unit `mirror-property`(U7・Could)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: business-logic-model.md と同じ **worktree HEAD `c8702be09`**(AD 測定 ref `5a6f79727` との対象パス差分は空)。

---

## 0. Could unit であることと着手判断

本 unit は requirements.md **FR-7a**(「余力がある場合のみ」「未実施でも本 intent は完了とする」)に対応し、unit-of-work.md の Unit 一覧でも `**mirror-property**(Could)` / 「未実施でも intent 完了(FR-7a)」と明記されている。したがって以下のルールは**着手した場合にのみ**拘束力を持つ。

### BR-MP-1(着手判断)

Construction 時、本 unit へ着手してよいのは次の3条件がすべて成立するときに限る。判断は conductor が行い、結果(着手 / 見送り)を bolt-plan.md に1行で記録する。

| 条件 | 判定手段(機械) |
| --- | --- |
| (a) Must unit がすべて着地済み | unit-of-work-dependency.md の `depends_on` 到達順で、`election-readpath` / `state-pbt` / `cast-guard` / `pbt-deep-ci` / `scope-ledger` の各 PR が MERGED(`gh pr view --json state`) |
| (b) 余力がある | 本 unit の着手が Must 側の収束(レビュー返答・CI 修復・承認待ち処理)を遅らせないこと。遅らせるなら見送る |
| (c) 交差が保たれている | `t274-amadeus-mirror-state-codec.test.ts` と `tests/helpers/arbitraries/` の新規ファイルに、他 Bolt の未着地変更が無いこと(`git log origin/main -- <2 パス>` で着地面を実測) |

**見送りは失敗ではない** — (a)〜(c) のいずれかが崩れた場合は bolt-plan.md に見送りと理由を記録し、intent は完了扱いとする(FR-7a)。着手した場合も、本 unit の赤は Must unit のマージをブロックしない(`depends_on: []` かつ被依存ゼロ — unit-of-work-dependency.md の YAML edge block とグラフのテキストフォールバック「scope-ledger / mirror-property は独立(エッジなし)」)。

## 1. 変更面のルール

### BR-MP-2(触ってよい面 — 閉集合)

変更してよいのは次の2パスのみ。他のいかなるファイルも触らない(プロダクションコードは0行)。

1. `tests/unit/t274-amadeus-mirror-state-codec.test.ts` — **追記のみ**
2. `tests/helpers/arbitraries/mirror-snapshot.ts` — 新規

合否: PR の `git diff --name-only origin/main...HEAD` が上記2パス(+ 工程記録)以外を含まないこと。components.md U7 の所在(「`tests/unit/t274-…`(既存ファイルへの追記)+ `tests/helpers/arbitraries/`」)と一致する。

### BR-MP-3(既存資産の不改変)

t274 の既存テストは1つも改変・削除しない。とくに `describe("property: arbitrary surrounding bytes round-trip", …)`(`:341`)は**そのまま残す**。

合否: `git diff origin/main...HEAD -- tests/unit/t274-…` の削除行(`^-`、ヘッダ行を除く)が **0 行**であること。

補足(射程外の記録): 既存 `:342` の property は固定 seed も DEEP 階層も持たない(`:360` 実文 `      { numRuns: 200 },` のみ)。これは requirements.md FR-4c の4項規約に照らすと未充足だが、その遡及是正は本 unit の射程外(FR-7a は追加のみ)であり、**改変しない**。新規プロパティ側のみ4項を充足する(BR-MP-5)。

### BR-MP-4(import 流儀 — ADR-1)

新規 arbitrary とプロパティが参照する実装は `packages/framework/core/tools/` の正本から import する。dist 出荷コピー(`dist/<harness>/…`)は import しない。

合否: 追加行の import 元がすべて `../../packages/framework/core/tools/` 始まりであること(`grep -n "^import\|from \"" tests/helpers/arbitraries/mirror-snapshot.ts`)。decisions.md ADR-1 の Decision 文(「新規 PBT(U2 / U3 / U7)と新規 arbitrary(U8)は `packages/framework/core/tools/` の正本を import する」)に U7 が明示的に含まれる。既存 t274 も `:12` / `:13` / `:22` が core 正本 import であり、ファイル内で流儀が割れない。

## 2. プロパティのルール

### BR-MP-5(PBT 規約4項の全充足)

component-methods.md「全メソッド共通の規約(FR-4c)」に従い、新規プロパティは canonical(`tests/unit/t204-audit-escape.pbt.test.ts:16-28`)の4項を満たす。t274 は PBT 専用ファイルではないため、規約ヘッダは**新規プロパティの `describe` 直上のコメントブロック**として置く(ファイル冒頭の既存ヘッダ `:1-4` は改変しない — BR-MP-3)。

| 項 | 充足形 | 合否 |
| --- | --- | --- |
| 1. 固定 seed + 既定 numRuns(100) | `const MIRROR_PBT_SEED = <値>;` と `fc.assert(…, OPTS)` | `grep` で seed 定数と `fc.assert` の第2引数が実在 |
| 2. 失敗出力 | fast-check 既定(追加配線なし) | 落ちる実測時に seed / replay / 縮小反例が出ること |
| 3. 縮小反例のピン | 反例を得たら example-based テストとして同ファイルへ固定 | 反例発生時のみ |
| 4. DEEP 階層 | `const DEEP = process.env.AMADEUS_PBT_DEEP === "1" \|\| process.env.AMADEUS_PBT_DEEP === "true";` と `numRuns: 50_000` 分岐 | `grep -n "AMADEUS_PBT_DEEP" tests/unit/t274-…` が 1 件以上 |

seed 値は既存と重複させない。HEAD 実測の既存 6 値は `0x5e_6970`(`tests/unit/setup-semver.pbt.test.ts:41` と `tests/unit/setup-manifest.pbt.test.ts:29`)/ `0x5e_706c`(`tests/unit/setup-plan-decisions.test.ts:32`)/ `0xa0_d17`(`tests/unit/t204-audit-escape.pbt.test.ts:38`)/ `16280702`(`tests/unit/t352-journal-codec.pbt.test.ts:25`)/ `26072903`(`tests/integration/t364-journal-v2.pbt.test.ts:41`)(測定コマンド: `grep -rn "PBT_SEED = " tests/`)。設計提案値は `0x27_4d17`(= t274 + codec、10進 2_575_639)。**実装時に同コマンドを再実行し、重複ゼロを実測してから固定する**(cid:code-generation:swarm-test-number-reservation と同趣旨の採番衝突回避)。

### BR-MP-6(判定は2点のみ・構造比較の禁止)

P-MR1 の assertion は (i) `parsed.kind === "ok"`、(ii) `renderMirrorStateJson(parsed.snapshot) === renderMirrorStateJson(s)` の2点に限る。`toEqual` / `toStrictEqual` による snapshot 構造の直接比較を書いてはならない。

根拠: business-logic-model.md §4 のとおり、`MirrorStateSnapshot`(`amadeus-mirror-types.ts:201-217`)の optional-with-null 規約により「キー不在」と `null` が等価に扱われ、構造比較は偽の赤になる。既存 example(`t274:68`)も同じ理由で render 同値を採っている。

合否: 追加行に `toEqual(` / `toStrictEqual(` が 0 件(`grep -c`)。

### BR-MP-7(重複被覆の禁止 — 「外側」は既存へ委譲)

新規プロパティは **snapshot 空間のみ**を振る。周辺バイト(prefix / suffix)は振らない。

- `renderMirrorStateBlock`(codec `:1927`)を単体で使い、t274 のローカルヘルパ `wrap`(`:39`)は**使わない**。
- ブロック外バイトの保存契約は既存 `:342` の property が担う(business-logic-model.md §5 の直交2軸表)。
- 棄却契約(`describe("codec rejection")` `:72-313` の example 16 件)の property 化は本 unit の射程外。requirements.md FR-4a が要求する fail-closed プロパティは state / election 境界(unit `state-pbt` / `election-readpath`)で充足済みであり、mirror 境界での重ね張りは requirements.md Out of scope「mirror / audit のコーデック層の再被覆(既存 t274 / t204 / t352 / t364 の内側)」に抵触する。

合否: 追加行に `wrap(` の呼び出しが 0 件、かつ `fc.string`/`fc.stringMatching` による prefix/suffix 生成が 0 件。

### BR-MP-8(生成器は正本関数で妥当値を作る — 相殺の回避)

arbitrary は「妥当な値を作る」ことに徹し、**棄却規則をテスト側で再実装しない**(requirements.md FR-4a、`cid:build-and-test:pbt-oracle-cancellation`)。

- 受理: `mirrorEventKey`(`amadeus-mirror-policy.ts:111`)など**正本の関数を呼んで**キーを構成する。
- 禁止: base64url 符号化やタイムスタンプ文法の**自前再実装**、および「この値は妥当か」をテスト側で判定する述語の新設。
- 禁止: 生成後に `parseMirrorStateDocument` を呼んで妥当だったものだけを通す `fc.pre` 的な絞り込み(被検側を妥当性フィルタに使うと、生成器の欠陥が無音で被覆低下に化ける)。

合否: 追加行に `Buffer.from(` / `base64url` / 独自 RFC3339 正規表現が 0 件。生成器が `parseMirrorStateDocument` を import していないこと。

### BR-MP-9(受理ドメインの絞り込みを明示する)

Could unit の規模上限(components.md U7 = **60〜90 行**)に収めるため、v1 の arbitrary は受理ドメインの一部のみを覆う。覆う範囲と覆わない範囲は domain-entities.md §3 の表に列挙し、**覆わない部分は「未被覆」と明記する**(「検証済み」と読ませない)。

合否: domain-entities.md §3 の表に「対象 / 非対象」列が実在し、非対象側に理由が付いていること。

## 3. 実行・出荷のルール

### BR-MP-10(実行 tier と時間予算)

- 層は `tests/unit/`(既存 t274 の層をそのまま維持 — `:4` 実文 `// size: small`)。実 FS を触らないため `cid:code-generation:fs-tests-integration-first` に抵触しない。requirements.md FR-4b の「純関数層は `tests/unit/`」に一致する。
- `test:ci`(= smoke+unit+integration)に自動的に載る。新規ランナー・新規 CI 面は作らない(深掘り面は unit `pbt-deep-ci` の射程 — unit-of-work.md の Unit 一覧)。
- 時間予算: requirements.md **NFR-4** の上限(新規 PBT ファイル群の直接実行合計 **2 秒以内**)を共有する。合否 = `bun test tests/unit/t274-amadeus-mirror-state-codec.test.ts` の実測値を PR 本文へ転記し、追加前後の差が予算内であること(数値はコマンド出力からの転記のみ)。

### BR-MP-11(出荷ゲート)

本 unit は `packages/framework/core/` を触らないため、requirements.md NFR-1 の dist 7ハーネス再生成は**発生しない**(unit-of-work.md「全 Unit 共通の実装制約」が「election-readpath のみ `packages/framework/core/` を触る」と明記)。それ以外の現行ブロッキング集合(NFR-5: coverage / complexity / dist・self-install drift / plugin-conformance-e2e)は従来どおり全緑を維持する。

合否: PR の変更ファイルに `packages/` / `dist/` が含まれないこと(BR-MP-2 と同一の実測で足りる)。

### BR-MP-12(TDD の適用)

requirements.md C-1 の TDD 既定に対する本 unit の位置づけ: 追加するのは**テストのみ**で実行時の振る舞いを変えないため、「実装前に失敗テストを1件」という vertical slice の形は取らない。代わりに次の2点で健全性を実測する。

1. 新規プロパティが**現行実装で緑**であること(round-trip は既に成立しているはずの契約 — 赤なら実バグの発見であり、その場合は BR-MP-5 の第3項に従い反例を example としてピンし、修正方針を conductor へ申告して停止する)。
2. プロパティが**空回りしていない**こと(vacuity の否定): 生成器を1箇所だけ壊した版(例: receipts の map key を canonical でない文字列にする)をローカルで一時適用して**赤を実測**し、revert までを不可分1セットで行う(`cid:code-generation:falling-proof-injection-one-set`)。注入面は実行時に消費される行に限る(`cid:code-generation:inject-runtime-consumed-lines`)。

合否: 上記2の赤の実測出力(失敗メッセージと縮小反例)を PR 本文または code-summary へ転記し、revert 済みであることを `git diff` で示す。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段6(t274 example-based round-trip の property 一般化)に対応する。
- services.md との関係: 本 unit は S1/S2 に非関与。S2 の深掘り対象は「新規 PBT ファイル群」であり、本 unit が着手された場合はその集合に加わる(未着手なら加わらない — Could)。
