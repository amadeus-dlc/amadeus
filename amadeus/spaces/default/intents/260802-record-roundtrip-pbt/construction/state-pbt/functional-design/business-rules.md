# Business Rules — unit `state-pbt` (#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09`**。business-logic-model.md と同一断面。

本書は unit `state-pbt` のルールを `BR-ST-N` 形式で固定する。各ルールは検証手段(コマンド・述語)を持ち、合否が機械的に判定できる形で書く。ルールの出典は requirements.md の FR / A / NFR / C、および application-design(components.md U3・U8、component-methods.md「U3」「U8」「全メソッド共通の規約」、decisions.md ADR-1)であり、**本書は新しい仕様を作らない**。

## 対象境界のルール(層 A: 構造フィールド)

| ID | ルール | 出典 | 検証(合否の取り方) |
| --- | --- | --- | --- |
| **BR-ST-1** | 層 A の round-trip は `parse ∘ serialize` の向きのみで張る。逆向き `serialize ∘ parse = id` は**張らない** | requirements.md FR-2a、component-methods.md P-ST1 | `tests/unit/t418-state-receipts-codec.pbt.test.ts` に `serialize(parse(...))` を主張するプロパティが存在しないこと(実読 + `grep -n "serializeMirrorBoundaryReceipts(parse" tests/unit/t418-*.ts` が 0 件) |
| **BR-ST-2** | P-ST1 の等価判定はキー順非依存の深い等価(`toEqual`)で行い、シリアライズ文字列のバイト比較では行わない | component-methods.md P-ST1「正規化後の同値」、`amadeus-state.ts:281-285` の正規化書き手 | P-ST1 の assertion が `toEqual` であること。挿入順を入れ替えた receipts が生成され得ること(`receiptsArb` が phase 部分集合を順序自由に構成する) |
| **BR-ST-3** | P-ST2 の assertion は `expect(() => parse(s)).toThrow()` の1点に限る。エラーメッセージ文言・分岐種別で判定しない | component-methods.md P-ST2「メッセージ文言では判定しない」、`cid:build-and-test:pbt-oracle-cancellation` | P-ST2 の `toThrow` 呼び出しが引数を取らないこと(実読) |
| **BR-ST-4** | `nonConformingReceiptsTextArb` は5つのコンストラクタを持ち、各コンストラクタが `parseMirrorBoundaryReceipts` の5 throw 分岐(`:248` / `:257` / `:261` / `:266` / `:270`)のちょうど1つへ到達する | component-methods.md P-ST2、business-logic-model.md §3 | 生成器の各コンストラクタを単体で呼び、throw メッセージが期待分岐のものであることを実測(この照合は**生成器の自己検査**であり、P-ST2 のプロパティ本体には持ち込まない) |
| **BR-ST-5** | `nonConformingReceiptsTextArb` は `null`・空文字列・空白のみの文字列を生成しない(`:242` の早期 return は棄却ではない) | `amadeus-state.ts:242`、business-logic-model.md §3 表の順序0 | 生成器の実装に当該除外があること + P-ST2 が緑であること(除外漏れがあれば P-ST2 が赤になる) |
| **BR-ST-6** | 5分岐すべての到達を lcov の DA で実測してから完了とする。プロパティの緑だけでは分岐到達の証拠にしない | component-methods.md P-ST2「到達実測は lcov の DA で確認する」、`cid:build-and-test:error-path-reach-lcov` | `amadeus-state.ts` の `:248` `:257` `:261` `:266` `:270` の DA が 0 でないことを lcov から確認 |
| **BR-ST-7** | 既存 `tests/unit/t265-engine-boundary.test.ts` は変更しない(重複する example を削除しない・移設しない) | unit-of-work-dependency.md batch 2 の非交差宣言、`cid:code-generation:c2`(worktree 隔離の書込面限定) | 本 Bolt の diff に `t265-engine-boundary.test.ts` が現れないこと(`git diff --name-only` 実測) |

## 対象境界のルール(層 B: テキストフィールド)

| ID | ルール | 出典 | 検証(合否の取り方) |
| --- | --- | --- | --- |
| **BR-ST-8** | `fieldValueArb` の受理ドメインは「行終端子4種(LF / CR / U+2028 / U+2029)を含まず、かつ `$` を1文字も含まない文字列」。空文字列・前後空白・タブ・非 ASCII は**含める** | component-methods.md P-ST3「生成器の側で改行を除外する」+ business-logic-model.md §5 の実測による精密化 | 生成器の filter 述語が上記2条件であること。P-ST3 が既定 numRuns で緑であること |
| **BR-ST-9** | P-ST3 の受理ドメインは `fieldExists(content, field) === true` に限定する。前提を満たさない入力は `fc.pre` ではなく**生成器で構成的に満たす**(`stateContentWithFieldArb` が field を必ず含む content を組み立てる) | component-methods.md P-ST3「受理ドメインの明示」、components.md U3「受理ドメインを『フィールドが実在する content』に限定」 | 生成器が content と field を同時に返す形であること。P-ST3 に `fc.pre` による事後フィルタが無いこと(前提充足率の低下による実効実行数の目減りを避ける) |
| **BR-ST-10** | P-ST3 の期待値は `value.trim()`。`setField` / `getField` のどちらの意味論も**変更提案しない**。`setField` の不在時サイレント no-op は P-ST4 として明示的に固定する | requirements.md FR-2b / A-2、component-methods.md P-ST3 / P-ST4 | P-ST3 の右辺が `value.trim()` であること。P-ST4 がバイト同一(`toBe(content)`)を主張すること。`packages/framework/core/` の diff が空であること |

## 実装プロセスのルール

| ID | ルール | 出典 | 検証(合否の取り方) |
| --- | --- | --- | --- |
| **BR-ST-11** | 各プロパティ(P-ST1〜P-ST4)について、**pre-fix 面切替による実効性の実証**を1回ずつ行う。対象実装を一時的に壊した状態で当該プロパティが赤くなることを実測し、赤の実測 → 復元までを不可分1セットで実施する。切替は `git checkout <ref> -- <path>` 相当の対象ファイル限定で行い、`git stash` は使わない | requirements.md C-1(TDD 既定の本 unit への適用形 — business-logic-model.md §7)、org.md Mandated「落ちる実証」、`cid:code-generation:falling-proof-no-stash` / `cid:code-generation:falling-proof-injection-one-set` | 4プロパティ分の赤の実測ログ(コマンドと出力)が code-generation の成果物に残ること。復元後に全プロパティが緑であること |
| **BR-ST-12** | 新規テスト番号(tNNN)は Bolt 着手時に予約し、再接地したときは**固定 base SHA の `tests/` 実測**で再確認する。衝突時は自 Bolt 側を改番し、tNNN の全参照(ファイル名・テスト名・record・PR 本文)を全域 grep で更新して残存 0 を確認する | unit-of-work.md「全 Unit 共通の実装制約」、`cid:code-generation:swarm-test-number-reservation` / `cid:code-generation:c1-tnnn-collision-on-regrounding` | 着手時と再接地時に `ls tests/unit tests/integration \| grep -oE '^t[0-9]+' \| sed 's/^t//' \| sort -n \| tail -1` を実行し出力を記録。本書起草時点の最大は **t415**(同コマンドの実測)。予約値は `t418` / `t419`(Bolt 1 = election-readpath が unit / integration の2本で `t416` / `t417` を使う想定を空ける) |
| **BR-ST-13** | `PBT_SEED` はファイルごとに固定し、既存 PBT ファイルの seed 値と重複させない | component-methods.md「全メソッド共通の規約」末尾 | 着手時に `grep -rn "PBT_SEED = " tests/` を実行し重複がないことを確認。本書起草時点の既存宣言は6箇所・相異なる値は5種(`setup-semver.pbt.test.ts` と `setup-manifest.pbt.test.ts` が同値)(`setup-semver.pbt.test.ts:41` = `0x5e_6970` / `setup-manifest.pbt.test.ts:29` = `0x5e_6970` / `setup-plan-decisions.test.ts:32` = `0x5e_706c` / `t204-audit-escape.pbt.test.ts:38` = `0xa0_d17` / `t352-journal-codec.pbt.test.ts:25` = `16280702` / `t364-journal-v2.pbt.test.ts:41` = `26072903`) |
| **BR-ST-14** | 両テストファイルの冒頭に PBT 規約4項ヘッダを置き、4項すべてを充足する。第4項は `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };` の形で実装する | requirements.md FR-4c、component-methods.md「全メソッド共通の規約」、canonical = `tests/unit/t204-audit-escape.pbt.test.ts:16-28` / `:38-41` | 両ファイルの冒頭を実読して4項の記載を確認。`AMADEUS_PBT_DEEP=1` を付けた実行で numRuns が上がることを1回実測 |
| **BR-ST-15** | import は `packages/framework/core/tools/` の正本のみ。`dist/` 配下からの import を書かない | decisions.md ADR-1 | `grep -n "dist/" tests/unit/t418-*.ts tests/unit/t419-*.ts tests/helpers/arbitraries/state-*.ts` が 0 件 |
| **BR-ST-16** | 両テストファイルは `// size: small` を宣言し、自身のソースに filesystem / spawn / network / timer シグナルを含めない | requirements.md FR-4b(`cid:code-generation:fs-tests-integration-first`)、`tests/lib/test-size.ts:35-40` の SIGNAL_PATTERNS と `:49` `classifyTestSize` | test-size drift guard(`t-test-size-drift`)が緑であること |
| **BR-ST-17** | 本 unit は `packages/framework/core/` を1行も変更しない。したがって dist 再生成・`promote:self` は本 Bolt では発生しない | unit-of-work.md「全 Unit 共通の実装制約」(「election-readpath のみ `packages/framework/core/` を触る」)、components.md U3「プロダクション改修を伴わない純追加」 | `git diff --name-only <base>..HEAD -- packages/ dist/` が空。もし空でなければ前提が破れた合図として実装を止め、conductor へ申告する |
| **BR-ST-18** | 本 Bolt の書込面は `tests/unit/`(新規2ファイル)と `tests/helpers/arbitraries/`(新規2ファイル)に限る。ci.yml / fixture / 既存テストには触れない | unit-of-work-dependency.md「batch 2(並行可)… 相互にファイル非交差」 | `git diff --name-only` が上記4ファイル(+ record)のみであること |

## 出力契約(検証の合否表現)

本 unit は CLI を新設しないため、出力契約は **テストランナーの verdict** そのものである。

| 状況 | 出力 | exit code |
| --- | --- | --- |
| 全プロパティ緑 | bun test の pass 行(`Ran N tests across M files.`) | 0 |
| いずれかのプロパティが反例を発見 | fast-check が **seed / replay パス / 縮小反例** をジョブログへ出力(規約第2項) | 非 0(ランナーが失敗を伝播) |
| 深掘り実行(`AMADEUS_PBT_DEEP=1`) | 同上。失敗 seed がログに残る | 同上 |

失敗時の seed 可視化は requirements.md FR-5a が後続 Bolt(pbt-deep-ci)へ課す要件の前提条件であり、BR-ST-14 の規約第2項充足によって本 unit 側で満たされる。

## 完了条件(本 unit)

1. BR-ST-1 〜 BR-ST-18 のすべてが上記の検証で充足。
2. 新規4ファイルが実在し、行数合計が unit-of-work.md の割当(200〜280 行)に収まる。
3. 新規 PBT 2ファイルの `bun test` 直接実行(既定 numRuns)の合計が **2 秒以内**(requirements.md NFR-4)。測定は当該2ファイルのみを指定した実行の出力から転記する。
4. `bash tests/run-tests.sh --ci` を含む現行ブロッキング集合が全緑(requirements.md NFR-5)。
5. BR-ST-11 の落ちる実証4件の記録が残っている。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段2(state 2層の write⇔read 非対称の常時監視)に対応する。
- services.md との関係: 本 unit は S1/S2 の実装に非関与だが、S2(pbt-deep-ci)のジョブ契約が本 unit の PBT を深掘り対象に含むため、AMADEUS_PBT_DEEP 階層の実装は services.md S2 の実行コマンド契約と整合させる。
