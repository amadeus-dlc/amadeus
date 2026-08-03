# Reliability Design — unit `state-pbt` (#1980)

上流入力(consumes 全数): business-logic-model.md(§3 棄却規則の判定順序、§4 P-ST1〜P-ST4、§5 受理ドメインの実測確定、§7 C-1 の適用形、§8 R-1/R-2)(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(同 unit の FD 兄弟成果物): business-rules.md(BR-ST-1〜BR-ST-18)、domain-entities.md(§1 型の所有、§4 検証・正規化の所有マップ)

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**。performance-design.md §5 の再確認表と同一断面。

---

## 1. 本 unit における「信頼性」の定義

本 unit はプロダクション改修ゼロ(business-logic-model.md §1、business-rules.md BR-ST-17)であり、可用性・耐障害性・リカバリを持つ実行時コンポーネントを出荷しない。したがって信頼性設計の対象は **検証装置そのものの信頼性** — すなわち次の2点に限られる。

| 面 | 意味 | 破れたときの害 |
| --- | --- | --- |
| **決定性(再現性)** | 同じ入力(seed)に対し、緑/赤・反例・縮小結果が毎回同一 | flake。赤が再現しないと修正できず、やがてテストが無視される |
| **fail-closed の忠実さ** | プロパティが緑であることが、被検実装の性質が成立していることを実際に意味する | **偽の緑**。org.md Forbidden の「検証劇場」— 偽の信頼を生む分だけゲート不在より悪い |

以下、この2面をモジュール層別に設計する(一枚岩の「構造的保証」断定は置かない — `cid:nfr-design:c4`。層ごとの保証機構は logical-components.md §3 に配置し、本書はその保証がどの故障モードを閉じるかを扱う)。

---

## 2. 決定性の設計

### 2.1 決定性の実測(本ステージ、代理実装)

FD の P-ST3 と同型の代理プロパティを、**受理ドメインの除外をわざと外した(壊れた)状態**で scratch 実行し、同一 seed で2回走らせた。

```
run 1: { seed: 334462, path: "60:2:0:10", endOnFailure: true }
       Counterexample: ["$&"]
       Shrunk 3 time(s)
run 2: { seed: 334462, path: "60:2:0:10", endOnFailure: true }
       Counterexample: ["$&"]
       Shrunk 3 time(s)
```

seed・replay path・縮小反例・縮小回数のすべてが完全一致した。**固定 seed による決定的再現は実測で成立している**(requirements.md NFR-4 の決定性要件、business-rules.md BR-ST-14 規約第1項・第2項)。

この実測は副次的に2つを示す。

1. 反例 `"$&"` は business-logic-model.md §5 が実測で確定した除外クラス(`String.prototype.replace` の置換パターン)の実在を独立に再現する。受理ドメインの精密化は**必要**であり、過剰な除外ではない。
2. 規約第2項(失敗時に seed・replay パス・縮小反例が出力される)は追加の配線なしに成立する。business-rules.md「出力契約」表の2行目・3行目はこの出力で満たされる。

### 2.2 決定性を壊しうる経路と、その封鎖

| 故障モード | 本設計での封鎖 | 検証 |
| --- | --- | --- |
| seed 未固定・実行ごとに変わる seed | `PBT_SEED` をファイル定数として固定(BR-ST-13)。`OPTS` は `{ seed: PBT_SEED }`(既定 numRuns)/ DEEP 時のみ `numRuns` を上乗せ(BR-ST-14) | 両ファイル冒頭の実読 |
| 既存ファイルとの seed 衝突により「ファイルごとに固定」の意図が薄れる | 着手時に `grep -rn "PBT_SEED = " tests/` で重複確認(BR-ST-13) | 本ステージ実測(HEAD `26fc7ddb2`): 宣言 **6箇所**・相異なる値 **5種**(`setup-semver.pbt.test.ts` = `0x5e_6970` / `setup-manifest.pbt.test.ts` = `0x5e_6970` / `setup-plan-decisions.test.ts` = `0x5e_706c` / `t204-audit-escape.pbt.test.ts` = `0xa0_d17` / `t352-journal-codec.pbt.test.ts` = `16280702` / `t364-journal-v2.pbt.test.ts` = `26072903`)。`t418` / `t419` は上記5種と異なる値を選ぶ |
| `fc.pre` による事後フィルタで前提充足率が変動し、実効実行数が入力分布に依存して揺れる | **`fc.pre` を使わない**。受理ドメインは生成器が構成的に満たす(BR-ST-9、domain-entities.md §2 の `stateContentWithFieldArb` / `stateContentWithoutFieldArb`) | プロパティ本体に `fc.pre` が現れないことを実読 |
| 時刻・環境変数・乱数・FS・ネットワーク・spawn への依存 | 対象4関数はいずれも純関数(domain-entities.md §1 の所有マップ)。テストファイル自身も `// size: small` を宣言し SIGNAL_PATTERNS 非一致を維持(BR-ST-16) | test-size drift guard。`tests/lib/test-size.ts:49` の `classifyTestSize` が**当該ファイルのソーステキスト**を走査する(実文 `export function classifyTestSize(source: string): SizeClassification {`) |
| 実行順序・共有可変状態への依存 | 生成器モジュールはトップレベルで `fc.Arbitrary` 値を export するのみ。可変状態・キャッシュ・メモ化を持たない(performance-design.md §6 の禁止事項と同一) | 生成器2ファイルの実読 |
| 環境変数 `AMADEUS_PBT_DEEP` の値が実行間で不定 | DEEP は numRuns を**増やす**方向にのみ効き、seed は不変。PR CI 階層(未設定)と深掘り階層のどちらも、それぞれの内部では決定的 | BR-ST-14 の1回実測(`AMADEUS_PBT_DEEP=1` で numRuns が上がること) |

### 2.3 決定性と「実行時間の予算」の関係

performance-design.md §3.3 の派生値のとおり PR CI 階層の実行時間は固定費支配であり、**決定性を守るための選択(fc.pre 不使用・キャッシュ不使用)が予算を圧迫することはない**。信頼性と性能はここではトレードオフになっていない。

---

## 3. fail-closed の忠実さ(偽の緑を作らない設計)

### 3.1 二重保持の禁止 — 正本は core 側の1定義

`cid:nfr-design:c3`(Git 管理資産では埋め込み fallback を二重保持せず単一ソースへ寄せる)を、本 unit の文脈へ写す。**テスト側に「もう1つの仕様」を持たせない。**

| 二重保持しうる知識 | 正本(core) | テスト側の扱い | 二重保持したときの害 |
| --- | --- | --- | --- |
| phase の語彙と正準順序 | `MIRROR_BOUNDARY_PHASES`(`amadeus-state.ts:225`) | `fc.constantFrom(...MIRROR_BOUNDARY_PHASES)` で**引く**。テスト側で3値を再宣言しない(domain-entities.md §1) | 語彙が増えたとき、テストだけ古い語彙で緑を出し続ける |
| status の2語彙 | `MirrorBoundaryReceiptStatus`(`:234`) | 同上 | 同上 |
| 直列化の正規化規則(順序付け・未定義 phase の脱落) | `serializeMirrorBoundaryReceipts`(`:278`、正規化書き手 `:281-285`) | **再実装しない**。P-ST1 はキー順非依存の深い等価で判定(BR-ST-2) | 正規化のバグをテスト側の同じバグが打ち消す(オラクル相殺) |
| 5つの棄却規則 | `parseMirrorBoundaryReceipts`(`:239`、分岐 `:248` `:257` `:261` `:266` `:270`) | **再実装しない**。P-ST2 は `expect(() => ...).toThrow()` の1点のみ、メッセージ文言で判定しない(BR-ST-3) | `cid:build-and-test:pbt-oracle-cancellation` の相殺。棄却規則の欠陥がテスト側の同じ判定で覆い隠される |
| 「フィールドが存在する」の定義 | `fieldExists` / `fieldLineRegex`(`amadeus-lib.ts:5263` / `:5255`) | 受理ドメイン判定にそのまま使う。テスト側で行頭マッチャを書かない(BR-ST-9) | `setFieldStrict` と `fieldExists` の drift を防ぐために core が1定義へ寄せた設計(`:5251-5253` のコメント)を、テストが第3の定義を持って崩す |
| `getField` の `.trim()` 意味論 | `getField`(`:5189`) | 期待値の右辺 `value.trim()` に反映するだけ。意味変更を提案しない(BR-ST-10、requirements.md A-2) | 仕様変更の無申告実施 |

**唯一テスト側が新規に所有する定義**は生成器の受理ドメイン(`fieldValueArb` の除外集合)であり、これは仕様ではなく**実装意味論の記述**である(domain-entities.md §4 最終行)。

### 3.2 偽の緑を作る具体的経路と封鎖

| 偽の緑の様式 | 機序 | 封鎖 | 検証 |
| --- | --- | --- | --- |
| **F-1: P-ST2 が実質1分岐しか検査しない** | `nonConformingReceiptsTextArb` の各コンストラクタが、意図した分岐より手前の分岐へ吸い込まれる(business-logic-model.md §3 の直列判定順序)。とくに分岐1(重複 phase)は**生テキストの正規表現走査**(`:245`)のため、他コンストラクタの生成文字列に `"<phase>":` 相当が混ざると全て分岐1へ落ちる | (a) 生成アルファベットから `"` と `:` を除外(domain-entities.md §2) (b) 各コンストラクタが1分岐へ到達することを**生成器の自己検査**として実測(BR-ST-4) (c) 到達の最終確認は lcov の DA(BR-ST-6、`cid:build-and-test:error-path-reach-lcov`) | §3.3 の実測 + 実装後の lcov |
| **F-2: P-ST1 が空 receipts しか生成せず自明に緑** | `receiptsArb` が実質 `{}` に偏る | 部分集合を空集合含みで生成し、キー挿入順を自由にする(domain-entities.md §2)。BR-ST-11 の落ちる実証で、正規化を壊したときに赤くなることを実測 | 落ちる実証(§4) |
| **F-3: P-ST3 の受理ドメインが狭すぎて空洞化** | 除外を増やしすぎ、無害な短い ASCII しか生成しない | 除外は**行終端子4種と `$` のみ**。空文字列・前後空白・タブ・非 ASCII は残す(BR-ST-8、business-logic-model.md R-2) | 生成器の filter 述語の実読(2条件のみであること) |
| **F-4: P-ST4 が「setField が何もしないこと」ではなく「content が変わらないこと」を偶然主張** | `stateContentWithoutFieldArb` が、実は field を含む content を返す | `fieldExists` による自己検査(判定の正本は `fieldExists`)。似た名前(前後に文字を足した名前)を混ぜて部分一致の誤検出も同時に押さえる(domain-entities.md §2) | 生成器の自己検査 + 落ちる実証 |
| **F-5: テストが緑なのは実装が正しいからではなく、プロパティが何も主張していないから** | `expect` が実行されない経路、常に真の述語 | 落ちる実証(BR-ST-11)を4プロパティ全てに対し1回ずつ行う。org.md Mandated「新設のゲート・検証は失敗ケースを注入して実際に赤くなることを実証してから完成扱いにする」 | §4 |

### 3.3 5分岐到達性の事前実測(本ステージ)

domain-entities.md §2 が定めた5コンストラクタの代表値を repo 外 scratch から直接 `parseMirrorBoundaryReceipts` へ通し、**それぞれが意図した分岐のメッセージで throw する**ことを実測した(read-only)。

```
C1-dup       -> Mirror Boundary Receipts has duplicate phase "ideation"
C2-badjson   -> Mirror Boundary Receipts is invalid JSON: JSON Parse error: Expected '}'
C3-nonobj    -> Mirror Boundary Receipts must be a JSON object
C4-unknown   -> Mirror Boundary Receipts has unknown phase "operation"
C5-badstatus -> Mirror Boundary Receipts has invalid status for "ideation"
```

5分岐すべてが単一欠陥入力で到達可能(business-logic-model.md §3 の実測を HEAD `26fc7ddb2` で再現)。

**重要な限定**: この実測は代表値1点ずつであり、**生成器が全域でその分岐に留まることの証明ではない**。生成器実装後に (a) 各コンストラクタの自己検査(BR-ST-4)と (b) lcov DA(BR-ST-6)の両方を取る。**この事前実測を BR-ST-6 の充足根拠に流用しない。**

なお business-logic-model.md §3 が指摘するとおり、分岐3(非オブジェクト、`:261`)は既存 example が存在しない唯一の分岐であり、本 unit の P-ST2 が**未被覆分岐の補完**として効く箇所である。

---

## 4. 落ちる実証(BR-ST-11)の実施設計

business-logic-model.md §7 が確定したとおり、本 unit の対象は既に正しい実装であるため「実装前に赤いテストを書く」形の TDD は成立しない。代わりに **各プロパティの実効性を pre-fix 面切替で1回ずつ実測する**(requirements.md C-1 の本 unit への適用形)。

| プロパティ | 壊す面(一時) | 期待される赤 |
| --- | --- | --- |
| P-ST1 | `serializeMirrorBoundaryReceipts` の正規化ループ(`:281-285`)を素の代入へ置換 | 未定義 phase の混入 / 順序依存で `toEqual` が落ちる |
| P-ST2 | 5分岐のいずれか1つの `throw` を除去 | 当該コンストラクタが生成した入力で `toThrow` が落ちる(5分岐それぞれで1回ずつ行う必要はない — 到達性は BR-ST-6 の lcov で取る) |
| P-ST3 | `getField` の `.trim()` を除去、または `setField` の置換を no-op 化 | 期待値 `value.trim()` との不一致 |
| P-ST4 | `setField` の不在時 `return content;`(`:5248`)を「末尾追記」へ変更 | バイト同一(`toBe(content)`)が落ちる |

**手続き規範(逸脱不可)**:

- 面切替は `git checkout <ref> -- <path>` 相当の**対象ファイル限定**で行い、`git stash` を使わない(`cid:code-generation:falling-proof-no-stash`)。
- 切替は **fix コミット後にのみ**実施し、復元 ref は当該コミット SHA を明示する(同 cid 追補 — 未コミット時の `checkout HEAD` は作業自体を消す)。
- 「赤の実測 → 復元 push 完了」までを不可分の1セットとして実施し、注入が head に乗ったまま報告・待機しない(`cid:code-generation:falling-proof-injection-one-set`)。
- 注入面は**テストが実際に読む面**である `packages/framework/core/tools/`(BR-ST-15 の import 先)へ行う(`cid:code-generation:injection-surface-verify`)。dist 側へ注入しても本 unit のテストは読まない。
- 注入は**実行時に消費される行**へ行う。型注釈・型 union の変更は TypeScript の実行時消去により赤くならない(`cid:code-generation:inject-runtime-consumed-lines`)。上表の注入対象はすべて実行文である。
- 実証4件のコマンドと出力を code-generation の成果物へ残す(BR-ST-11 の検証欄)。

**注意(BR-ST-17 との整合)**: 落ちる実証は `packages/framework/core/` を一時的に壊すが、**復元後の diff は空**でなければならない。`git diff --name-only <base>..HEAD -- packages/ dist/` が空であることは BR-ST-17 の合否そのものであり、実証の後に必ず取る。

---

## 5. 退行検出マトリクス — 何が壊れたら何が赤くなるか

本 unit が常駐させる検証装置の「守備範囲」を明示する。**守備範囲外を守っていると読ませない**ための表である。

| 将来の変更 | 赤くなるか | どのプロパティ |
| --- | --- | --- |
| `serializeMirrorBoundaryReceipts` が phase 順を変える | **ならない**(意図的) | P-ST1 はキー順非依存の深い等価。バイト等価では張らない(BR-ST-2) |
| `serializeMirrorBoundaryReceipts` が未定義 phase を落とさなくなる | なる | P-ST1 |
| `parseMirrorBoundaryReceipts` の棄却分岐がどれか1つ消える | なる | P-ST2(該当コンストラクタ) |
| 新しい棄却規則が追加される | **ならない** | P-ST2 は否定側のみ。新規則で棄却されるべき入力は生成されない。追加規則の被覆は将来の unit の帰属 |
| `MIRROR_BOUNDARY_PHASES` に phase が追加される | ならない(かつ**追随する**) | 生成器が語彙を core から引くため、追加語彙が自動的に生成対象へ入る(§3.1) |
| `setField` がフィールド不在時に追記するよう変わる | なる | P-ST4(requirements.md A-2 の現行挙動固定。**仕様変更の禁止ではなく無音の変更の禁止** — business-logic-model.md §4 P-ST4) |
| `getField` の `.trim()` が消える | なる | P-ST3 |
| `setField` の正規表現が行終端子を跨ぐようになる | **ならない** | 受理ドメインが行終端子を除外しているため。挙動改善は検知されない(意図的な非対称 — 除外は round-trip が成立しない現行意味論の記述であって、改善を禁じるものではない) |
| `escapeRegex` が壊れ、メタ文字を含むフィールド名が誤マッチする | なる可能性が高い | P-ST3 / P-ST4(生成器がメタ文字を含む名前を生成する — domain-entities.md §2) |
| election / mirror / audit 境界の退行 | **ならない** | 他 unit(`election-readpath` / `mirror-property`)の帰属 |

---

## 6. 隔離と手続きの信頼性(実装工程side)

| 事項 | 規律 | 根拠 |
| --- | --- | --- |
| 書込面 | `tests/unit/` 新規2ファイル + `tests/helpers/arbitraries/` 新規2ファイルのみ。`ci.yml` / fixture / 既存テストに触れない | BR-ST-18、unit-of-work-dependency.md batch 2 の非交差宣言 |
| 既存 example の温存 | `tests/unit/t265-engine-boundary.test.ts` を変更しない(重複する example を削除・移設しない) | BR-ST-7。本 unit の P-ST2 は既存 example の**一般化かつ未被覆分岐の補完**であり置換ではない(business-logic-model.md §3) |
| worktree 隔離 | 割当 worktree 外での git 状態変更を行わない。本線絶対パスをプロンプト・スクリプトへ混入させない | `cid:code-generation:c2` |
| tNNN 採番 | 着手時に予約し、再接地時は**固定 base SHA** の `tests/` 実測で再確認。衝突時は自 Bolt 側を改番し全参照を grep 更新 | BR-ST-12、`cid:code-generation:swarm-test-number-reservation` / `cid:code-generation:c1-tnnn-collision-on-regrounding`。本ステージ実測(HEAD `26fc7ddb2`、`ls tests/unit tests/integration \| grep -oE '^t[0-9]+' \| sed 's/^t//' \| sort -n \| tail -1`)= **415**。予約 `t418` / `t419` は現時点で未使用 |
| 前提が破れた場合 | `packages/` / `dist/` に diff が出たら「純追加という前提が破れた合図」として実装を止め conductor へ申告 | BR-ST-17、business-logic-model.md §7 |

---

## 7. 未実測として残す項目(受け入れ基準に使わない)

| 項目 | 状態 | 理由 |
| --- | --- | --- |
| 5分岐の lcov DA(BR-ST-6) | **未実測** | 生成器実装後にしか取れない。coverage 実行は単独所有者による直列化が必要(`cid:code-generation:c1-coverage-single-owner`) |
| 落ちる実証4件(BR-ST-11) | **未実施** | code-generation の帰属。本書は実施設計(§4)のみを固定 |
| `AMADEUS_PBT_DEEP=1` での numRuns 上昇の1回実測(BR-ST-14) | **未実施** | 実ファイル実装後 |
| 生成器コンストラクタの分岐到達自己検査(BR-ST-4) | **未実施** | §3.3 の代表値実測は代替にならない(§3.3 の限定を参照) |
