# Reliability Design — unit `mirror-property`(U7・Could)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(明記): 同 unit の business-rules.md(BR-MP-3 / BR-MP-5 / BR-MP-6 / BR-MP-8 / BR-MP-12)、domain-entities.md(§2 / §3)。

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(FD 群の ref `c8702be09` との対象パス差分は空。測定コマンドの出力は §2 に転記)。

---

## 1. 本 unit における「信頼性」の定義

プロダクションの可用性・リトライ・フェイルオーバは非適用(変更面が 0 行 — business-logic-model.md §1、security-design.md 参照)。本 unit の信頼性は **テスト自身が信頼できること** の1点に還元され、次の3面に分解する。

| 面 | 失敗の形 | 担保機構 |
| --- | --- | --- |
| R-1 決定性 | 同一コードで run ごとに結果が変わる(flake) | 固定 seed(§2) |
| R-2 非空回り | 常に緑になり欠陥を検出しない(vacuity) | 落ちる実証(§3) |
| R-3 偽赤の不在 | 実装が正しいのにテストが赤くなる | 等式の形の選択(§4) |

## 2. R-1 決定性 — seed の固定と**非重複確認規律**

business-rules.md BR-MP-5 第1項が `const MIRROR_PBT_SEED = <値>;` の設置と `fc.assert` 第2引数への引き渡しを義務づける。本書はその **値の選び方と確認手順** を設計として確定する。

### 手順(実装時に必ずこの順で実行する)

1. `grep -rn "PBT_SEED = " tests/` を実行し、既存 seed の**全数**を出力から転記する(記憶で書かない — `cid:requirements-analysis:numbers-from-command-output-only`)。
2. 提案値が既存値と重複しないことを確認する。10 進表記と 16 進表記が混在するため、**両表記で検索する**(`grep -rn "0x27_4d17\|0x274d17\|2575639" tests/ | wc -l` が 0)。表記違いは目視照合では素通りするため、機械検査を必須とする。
3. 重複ゼロを実測してから定数を固定する。重複があった場合は提案値を変更し、1 からやり直す。
4. 実測出力(手順1と2)を code-summary へ転記する。

### 本書執筆時点の実測(測定 ref 上記、コマンド出力の転記)

`grep -rn "PBT_SEED = " tests/` = **6 件**(`grep -rn "PBT_SEED = " tests/ | wc -l` = 6):

| 所在 | 値 |
| --- | --- |
| `tests/unit/setup-semver.pbt.test.ts:41` | `0x5e_6970` |
| `tests/unit/setup-manifest.pbt.test.ts:29` | `0x5e_6970` |
| `tests/unit/t204-audit-escape.pbt.test.ts:38` | `0xa0_d17` |
| `tests/unit/setup-plan-decisions.test.ts:32` | `0x5e_706c` |
| `tests/unit/t352-journal-codec.pbt.test.ts:25` | `16280702` |
| `tests/integration/t364-journal-v2.pbt.test.ts:41` | `26072903` |

提案値 `0x27_4d17`(10 進 2,575,639)の重複検査: `grep -rn "0x27_4d17\|0x274d17\|2575639" tests/ | wc -l` = **0**。

### なぜ重複を避けるのか(設計上の理由)

seed が同一でも arbitrary が異なれば入力列は異なるため、重複は機能的な誤りを直接は生まない。避ける理由は**診断可能性**である: 失敗報告に seed 値しか残らない場面(CI ログの断片、再現指示の口頭伝達)で、値が一意ならどのプロパティの話か一意に決まる。既に `0x5e_6970` が2ファイルで重複している実測(上表)がこの曖昧さの現存例であり、新規追加でこれを増やさない。この規律は `cid:code-generation:swarm-test-number-reservation`(採番衝突回避)と同趣旨である。

### 決定性を壊す既知の経路(禁止)

- `Date.now()` / `Math.random()` / 環境依存値を生成器へ持ち込まない。タイムスタンプは domain-entities.md §3 のとおり**構成的**に作る(年 2020〜2030 / 日 1〜28 / 末尾 `Z` 固定)。
- `fc.pre` による事後絞り込みを使わない(BR-MP-8)。絞り込みは run 数と入力分布を実行時条件に依存させる。
- 既存 `:341` の property が持つ skip 分岐(`:352` 実文 `          if (parsed.kind !== "ok") return true; // marker collision in random text: skip`)を新プロパティへ持ち込まない — P-MR1 では `kind === "ok"` が契約そのものであり、skip は契約違反の見逃しになる(business-logic-model.md §5)。

## 3. R-2 非空回り — 落ちる実証

BR-MP-12 第2項が定める vacuity 否定を、本書では**注入面**まで確定する。

- 注入対象: 生成器の1箇所のみ(例: `receipts` の map key を `mirrorEventKey(event)` ではない文字列にする)。これは実行時に消費される行であり `cid:code-generation:inject-runtime-consumed-lines` に適合する(型注釈・コメントへの注入では赤にならない)。
- 実施形: 注入 → 赤の実測(失敗メッセージ+縮小反例)→ revert を**不可分の1セット**で行う(`cid:code-generation:falling-proof-injection-one-set`)。注入を head に乗せたまま報告・待機しない。
- 記録: 赤の出力を code-summary または PR 本文へ転記し、revert 済みを `git diff` で示す(BR-MP-12 合否)。

補足: 「新規プロパティが現行実装で緑」であること(BR-MP-12 第1項)は非空回りの証拠にはならない — 空回りしていても緑になるため。緑の確認と赤の実証は別の検査であり、両方必要である。

## 4. R-3 偽赤の不在 — 等式の形が信頼性機構である

business-logic-model.md §4 が選んだ等式 `render ∘ parse ∘ render = render`(正規形同値)は、性能でも簡便さでもなく**偽赤の回避**という信頼性上の理由で選ばれている。実読根拠: `MirrorStateSnapshot`(`amadeus-mirror-types.ts:201-217`)の optional-with-null 規約により「キー不在」と `null` が等価に扱われ、`EMPTY_MIRROR_STATE`(codec `:1643-1652`)は `expectedPrompt` キーを持たないのにその正規形は `"expectedPrompt":null` を含む(t274:46 の golden 実文)。構造比較(`toEqual` / `toStrictEqual`)はここで実装が正しくても赤くなる。

したがって BR-MP-6 の「構造比較の禁止」は様式の好みではなく、R-3 の担保機構そのものである。合否は追加行に `toEqual(` / `toStrictEqual(` が 0 件(`grep -c`)。

## 5. 既存資産の非退行

- BR-MP-3 により既存テストは1つも改変・削除しない。合否は `git diff origin/main...HEAD -- tests/unit/t274-…` の削除行(ヘッダ行を除く)が **0 行**。
- 既存 `:341` の property は固定 seed も DEEP 階層も持たない(`:360` 実文 `      { numRuns: 200 },` のみ)が、その遡及是正は本 unit の射程外(BR-MP-3 補足)。**新規側のみ4項を充足する**という非対称を、意図的な設計として記録する — 沈黙で放置しない。
- Git 管理資産の二重保持禁止(`cid:nfr-design:c3`): 生成器は正本(`packages/framework/core/tools/`)を import し、型定義・キー導出・タイムスタンプ文法のいずれもテスト側へ複製しない(BR-MP-4 / BR-MP-8、domain-entities.md §2 の所有表)。複製は正本改訂時に無音で乖離する負債になる。

## 6. 失敗時の停止規律

P-MR1 が現行実装で赤になった場合、それは**実バグの発見**である(round-trip は既に成立しているはずの契約 — BR-MP-12 第1項)。この場合、実装者はプロダクションコードを修正せず、次の順で停止する。

1. 縮小反例を example-based テストとして同ファイルへピンする(BR-MP-5 第3項)。
2. 修正方針を conductor へ申告して停止する。プロダクション改修は本 unit の変更面(BR-MP-2 の閉集合)の外であり、実装者単独で踏み越えない(`cid:requirements-analysis:implementation-deviation-election`)。
