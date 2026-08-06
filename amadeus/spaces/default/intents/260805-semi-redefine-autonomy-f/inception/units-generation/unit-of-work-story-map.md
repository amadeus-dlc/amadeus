# Unit of Work Story Map — semi 再定義と `--autonomy` 起動宣言(#2253)

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md

本文書は上記6成果物を次のとおり実参照する。`requirements.md` の FR 31 件 / NFR 7 件と Intent analysis 1〜4 をストーリー相当の単位として扱い(§ストーリー相当の単位・§FR の割当)、`components.md` の C1〜C18 の充足 FR 列を FR → Unit 写像の一次根拠とし(§FR の割当)、`component-methods.md` の各節「充足 AC」を Unit 内の実装順序の根拠とし(§Unit 内の実装順序)、`services.md` の §信頼境界 を横断 NFR の検収面の根拠とし(§NFR の割当)、`component-dependency.md` の §Unit 分割の示唆 と §非対称な依存 を Unit を跨ぐストーリーの識別に用い(§Unit を跨ぐ関心)、`decisions.md` の ADR-1〜13 を各 Unit の設計制約として引く(§Unit 内の実装順序)。

**`stories.md` は存在しない** — user-stories ステージが SKIP のためである(実測: `ls .../inception/user-stories` → `No such file or directory`)。したがって本文書は「ユーザーストーリー → Unit」の写像を、`requirements.md` の **Intent analysis(ゴール)→ FR → Unit** の3層写像として構成する。この読み替えが本文書における「ストーリー」の定義である。

測定 ref: worktree HEAD `d5ca7b4c1100ae4bf28eb7810c1f88fb20b8545a`。FR 31 件 / NFR 7 件は `grep -oE '\*\*FR-[A-Z]+-[0-9]+\(' requirements.md | sort -u | wc -l` → `31` / NFR 版 → `7` の出力からの転記。

---

## ストーリー相当の単位

`requirements.md` §Intent analysis の4ゴールを最上位のストーリーとし、`intent-backlog.md` の proto-Unit P1〜P7 を中間層として置く。

| ゴール(Intent analysis) | 利用者価値 | 対応 proto-Unit | 実装する Unit |
| --- | --- | --- | --- |
| G1 「起動の一手で走行水準を宣言し、そのまま無人で回したい」 | `claude -p`・夜間・CI といった非対話起動で走行水準が決定的な契約になる | P4 | `launch-autonomy-flag` |
| G2 「全部止まる」と「全部任せる」の間の実用的な中間点がほしい | semi で日常判断が自動裁定に載り、節目だけ人間へ戻る | P1 / P2 / P3 | `semi-authorization-core` / `stop-question-carveout` / `semi-policy-carrier` |
| G3 「任せた結果を後から検収できる」状態を保ちたい | 無人裁定が `unreviewed` として積まれ、節目でまとめて検収できる | P1 / P2(受け皿は既存 S11、無改訂) | `semi-authorization-core` |
| G4 「人間ターンを要求する隠れた関門で headless 走行が切れない」 | pending advisory 1件で `run-stage` が差し替わらない | P7 | `advisory-auto-resolution` |
| (横断)表示の同一語彙 | 現在地が statusline と `--status` の同一語彙で読める | P5 | `autonomy-statusline` / `semi-policy-carrier` |
| (横断)記述と実態の一致 | docs / 正本知識が実際の semi 定義を述べる | P6 | `semi-docs-revision` |

**ゴールでないもの**(`requirements.md` §Intent analysis 末尾の誤読防止): 本 intent は「semi で phase を必ず完走できる」ことを主張しない。主張は「**質問で止まらない**」に限定する(FR-LAD-6)。この限定は `stop-question-carveout`(構造面 — `:422` のみ開く)と `semi-docs-revision`(記述面 — docs へ「phase 完走の保証」と書かない)の2 Unit が守る。

---

## FR の割当(全 31 件)

`components.md` §コンポーネント一覧 の「充足 FR」列と `component-methods.md` 各節の「充足 AC」からの写像。1つの FR が複数 Unit にまたがる場合は主担当を太字で示す。

| FR | 内容(要旨) | 実装する Unit |
| --- | --- | --- |
| FR-AUTH-1 | semi 専用 authorization 型(3責務限定)の新設 | **`semi-authorization-core`** |
| FR-AUTH-2 | 梯子入口を認可基体の単一述語へ | **`semi-authorization-core`** |
| FR-AUTH-3 | semi は current grant = null を維持 | **`semi-authorization-core`**(不変条件)/ `semi-policy-carrier`(`set-mode` へ `full` を追加しないことの維持) |
| FR-LAD-1 | 第1関門の semi 分岐改訂(provenance 要求は維持) | **`semi-authorization-core`** |
| FR-LAD-2 | 第2関門ルーティング(semi の question を梯子へ) | **`semi-authorization-core`** |
| FR-LAD-3 | `createGateAutoDecision` の throw を単純除去しない | **`semi-authorization-core`** |
| FR-LAD-4 | 5段すべてを使い、後段2段は `unreviewed` | **`semi-authorization-core`**(0 段目での解決は `semi-policy-carrier` 着地後) |
| FR-LAD-5 | 節目は人間裁定のまま(効果側の安全弁を緩めない) | **`semi-authorization-core`** |
| FR-LAD-6 | 走行単位の主張を「質問で止まらない」に限定 | **`stop-question-carveout`**(構造面)/ `semi-docs-revision`(記述面) |
| FR-STOP-1 | 述語の分割と呼び出し点の限定(`:422` のみ) | **`stop-question-carveout`** |
| FR-STOP-2 | cap と budget mode は不変 | **`stop-question-carveout`**(両行が diff に現れないことの確認) |
| FR-POL-1 | `set-mode` へ policies を載せる | **`semi-policy-carrier`** |
| FR-POL-2 | 非 full の確認 digest を方針込みへ拡張 | **`semi-policy-carrier`** |
| FR-POL-3 | `--mode none --policies-file` の loud 化 | **`semi-policy-carrier`** |
| FR-CLI-1 | `--autonomy` 3値・値の consume | **`launch-autonomy-flag`** |
| FR-CLI-2 | `none` の受理条件と不正値・値省略の loud | **`launch-autonomy-flag`** |
| FR-CLI-3 | 再宣言の意味論(判別子は `modeProvenance`) | **`launch-autonomy-flag`** |
| FR-CLI-4 | `full` の fail-closed(grant 不在時 preview 停止) | **`launch-autonomy-flag`** |
| FR-CLI-5 | provenance の出所(フラグは provenance にならない) | **`launch-autonomy-flag`** |
| FR-DISP-1 | statusline への Autonomy 表示 | **`autonomy-statusline`** |
| FR-DISP-2 | `--status` の Policies 行の grant 非依存化 | **`semi-policy-carrier`** |
| FR-ADV-1 | 第2 receipt 経路の新設 | **`advisory-auto-resolution`** |
| FR-ADV-2 | fail-closed の固定(認可不成立時は人間経路) | **`advisory-auto-resolution`** |
| FR-ADV-3 | 並存でなく置換(provenance 判別ユニオン) | **`advisory-auto-resolution`** |
| FR-ADV-4 | `run_required: true` は強制実行 | **`advisory-auto-resolution`** |
| FR-ADV-5 | plugin 非依存の射程は hold 判定の面に限る | **`advisory-auto-resolution`**(記述面は `semi-docs-revision` も遵守) |
| FR-PIN-1 | `t431` の test 2分割(walking-skeleton ピンを保存、質問封鎖ピンを反転) | **`semi-authorization-core`** |
| FR-PIN-2 | `t121:1138-1150` のピン反転 | **`stop-question-carveout`** |
| FR-PIN-3 | 既存グリーン維持 AC の射程限定(反転対象2箇所を除く) | **横断** — `semi-authorization-core` と `stop-question-carveout` が自 Unit の反転範囲を宣言し、他 Unit は semi 関与テスト(実測 13 ファイル)の無改変 green を維持 |
| FR-DOC-1 | docs 22 ファイル(11 対訳ペア)の同時改訂 | **`semi-docs-revision`** |
| FR-DOC-2 | 正本知識 `stage-protocol.md` の 9 行の改訂 | **`semi-docs-revision`** |

**カバレッジ検証**: FR は AUTH 3 + LAD 6 + STOP 2 + POL 3 + CLI 5 + DISP 2 + ADV 5 + PIN 3 + DOC 2 = **31 件**であり、上表の行数と一致する(`requirements.md` の実測 31 件 — §測定 ref)。未割当の FR は 0 件。逆向きに、7 Unit のうち FR を1件も持たない Unit も 0 件である(§FR の割当 表の太字=主担当からの機械再計算: `semi-authorization-core` 9 件 / `semi-policy-carrier` 4 件 / `stop-question-carveout` 4 件 / `launch-autonomy-flag` 5 件 / `autonomy-statusline` 1 件 / `advisory-auto-resolution` 5 件 / `semi-docs-revision` 2 件 = 30 件 + 横断 FR-PIN-3 の 1 件 = **31 件**。§12a iteration 1 の指摘により当初の誤計(合計 33)を列挙からの再導出で訂正 — `cid:requirements-analysis:ledger-count-mechanical-recalc`)。

---

## NFR の割当(全 7 件)

| NFR | 内容(要旨) | 検収する Unit |
| --- | --- | --- |
| NFR-1 | fail-closed の実証可能性(注入 → 赤 → 復元の1セット) | **横断**。対象5ゲートは `semi-authorization-core`(FR-AUTH-1 / FR-STOP-1 の維持側の一部)/ `stop-question-carveout`(FR-STOP-1)/ `launch-autonomy-flag`(FR-CLI-4)/ `semi-policy-carrier`(FR-POL-3)/ `advisory-auto-resolution`(FR-ADV-2)へ配分される |
| NFR-2 | 監査追跡性(`AUTO_DECIDED` + replay 復元) | `semi-authorization-core`(裁定の記録)/ `semi-policy-carrier`(方針を含む projection の replay 復元) |
| NFR-3 | 起動フラグの実行コスト(parse 段の FS I/O ゼロ) | `launch-autonomy-flag` |
| NFR-4 | TDD 既定(Red の実測 → 最小実装 → Green) | 全 Unit |
| NFR-5 | 生成物ドリフトゼロ(`bun run build` 後に追跡ファイル不変) | 全 Unit |
| NFR-6 | provenance の偽装不能性 | `launch-autonomy-flag`(HUMAN_TURN 不在での停止)/ `advisory-auto-resolution`(`isGroundedHumanTurn` の維持) |
| NFR-7 | 既存ブロッキング検査集合の維持 | 全 Unit(PR CI が正 — `cid:code-generation:local-lcov-pre-push`) |

`services.md` §信頼境界 の7境界のうち、本 intent が新設・改訂するのは「mode 適用」(`launch-autonomy-flag`)、「semi 裁定」「semi 効果適用」(`semi-authorization-core`)、「advisory receipt(無人)」(`advisory-auto-resolution`)の4つである。残る3境界(grant 発行 / grant 取消 / advisory receipt(人間))は**どの Unit も変更しない**。

---

## Unit 内の実装順序

各 Unit 内での順序。Unit **間**の順序は本文書も `unit-of-work-dependency.md` も定めない(2.8 の経済判断)。

### `semi-authorization-core`

1. `SemiAuthority` / `SemiAuthorityScope` / `SEMI_ROUTINE_INTERACTIONS` の型とスマートコンストラクタ(C1)、`AutonomyProjection.semiPolicies?` の宣言と `semiPoliciesOf`、`assertLegalAutonomyProjection` の片方向不変条件
2. `DecisionAuthority` と `decisionAuthorityOf` のオーバーロード2本(C2)。`full-grant` 認可の payload へ `scope` / `policies` を追加(`component-methods.md` §C2)
3. `authorizeInteraction` の semi 分岐(C3)と `semi-mode-gate` の削除(ADR-1 の置換)
4. `selectDecision` の型絞り込みとルーティング(C6)、`createGateAutoDecision` の basisFingerprint 差し替え(C5)
5. `resolveAutoDecision` の入口単一述語化と `resolveConfirmedPolicy` の引数差し替え(C4)
6. `applySemiDecision` の効果認可委譲(C7)
7. FR-PIN-1(`t431:307-313` の分割・反転)と U-4 / D の2キー棚卸し、FR-AUTH-2 の落ちる実証(`resolveAutoDecision` の直接呼び出し — 引き取り項目 B)

順序の根拠: 2 は 1 の型を、3〜6 は 2 の型を参照する(`component-methods.md` の各シグネチャ)。7 は挙動が確定してからでなければ反転後の assert を書けない。

### `semi-policy-carrier`

1. `HumanAutonomyCommand` の `set-mode` / `revoke-full` への `policies` 追加と既存呼び出し点の同期(C8 書き側)
2. `planHumanAutonomyCommand` の `after.semiPolicies` 設定(`component-methods.md` §C8 の入力→出力表)
3. `nonFullCommandDisplayDigest` の1定義化と `prepareNonFullCommand` の policies 受け取り(C9、ADR-5)。U-1(照合点を加えるか)をここで確定
4. `handleSetAutonomy` の loud 化(C10)
5. `policyCount` の envelope 追加と `--status` の行差し替え(C15)

### `stop-question-carveout`

1. 述語の分割と命名(U-5 / OQ-3 の確定)
2. 呼び出し点3箇所への割当(`:422` = carve-out、`:457` / `:716` = full 限定)
3. FR-STOP-1 受け入れ基準(2)の落ちる実証(無条件共有へ戻すと赤)
4. FR-PIN-2(`t121:1138-1150` の反転)
5. `tests/.coverage-patch-allowlist.json:5268` / `tests/unit/t147-kiro-hook-adapter.test.ts:723` の同期(U-5)

### `launch-autonomy-flag`

1. `parseNextFlags` の `--autonomy` 分岐と値省略捕捉分岐(C12)
2. `readLaunchAutonomyContext`(projection を1回読む基体、ADR-12 / ADR-13)
3. `applyLaunchAutonomyDeclaration` の判定 1〜8(C13)
4. FR-CLI-2(4)/ FR-CLI-3 / FR-CLI-4 の落ちる実証(`grant` を無条件 `"absent"` に / `declared` を無条件 `true` または `false` に差し替えると赤)

### `autonomy-statusline`

1. `autonomySegment(stateContent)` の実装(C14)
2. 3 mode それぞれの語彙を assert するユニットテスト(FR-DISP-1)

### `advisory-auto-resolution`

1. `AdvisoryChoiceProvenance` の判別ユニオンと `recordAdvisoryChoice` への置換、store `schema: 2` 昇格(C17、ADR-9)
2. `resolveAdvisoryChoiceAutonomously` の occurrence 写像と effect registry(C16、ADR-6 / ADR-11)。引き取り項目 C(`quality-waiver` 収載の assert)をここで置く
3. `applyPendingAdvisoryGuard` の改訂(2分岐のみ — `resolved` なら元 directive、それ以外は `await-advisory-choice`)
4. U-3(`withAuditLock` 再入)の実測、U-7(`formalCheckRoute` の実行担い手)の確定
5. FR-ADV-2 の落ちる実証(認可判定を無条件 true に差し替えると赤)

順序の根拠: 1 が receipt の型と受理関数を確定してからでないと 2 が書けない(`component-methods.md` §C16 の手順 3〜4 が受理関数を呼ぶ)。

### `semi-docs-revision`

1. 改訂対象の実測(`docs/` 22 ファイルの該当行の全数、引き取り項目 A)
2. `stage-protocol.md:33` / `:131` の反転、`:125` の同期、`:105` / `:808` の保存(FR-DOC-2)
3. `docs/` 22 ファイルの改訂(日英ペアを同一変更で)
4. FR-DOC-1 の受け入れ確認(`docs/` 限定 grep で旧定義 0 件)と FR-LAD-6 の記述面確認

---

## Unit を跨ぐ関心(cross-cutting)

| 関心 | 関わる Unit | 扱い |
| --- | --- | --- |
| FR-LAD-6(走行単位の主張の限定) | `stop-question-carveout`(構造)/ `semi-docs-revision`(記述) | 構造面は「開くのは `:422` の質問面のみ」、記述面は「phase 完走の保証を書かない」。両面が揃って初めて主張が守られる |
| FR-PIN-3(既存グリーン維持の射程) | `semi-authorization-core` / `stop-question-carveout` / 他の全 Unit | 反転対象は `t431:313` 相当と `t121:1138-1150` 相当の2箇所のみ。他の semi 関与テスト(実測 13 ファイル — `requirements.md` A-3)は無改変 green を維持する |
| `tests/.coverage-patch-allowlist.json` の行ピン(U-6) | 行を挿入する4 Unit | 共有台帳。各 Unit が自 PR で機械 remap し、span 膨張(straddle)を別途検査する(`cid:code-generation:cg-allowlist-straddle-swell`) |
| `amadeus-orchestrate.ts` の2領域 | `launch-autonomy-flag`(`:1044-1074` + `handleNext`)/ `advisory-auto-resolution`(`:781-800`) | 依存辺の無い2 Unit が同一ファイルを触る唯一の組。後着側が base 前進後に実 diff で再評価する(`unit-of-work-dependency.md` §ファイル交差) |
| ADR-4 の読み口規則 | `semi-authorization-core`(宣言と総関数)/ `semi-policy-carrier`(書き手と `policyCount`) | `projection.semiPolicies` の直読を作らない。件数取得(`.length`)にも例外を設けない |
| C-3(directive 値域の非同一視) | `launch-autonomy-flag`(書き込まない)/ 全 Unit(`amadeus-directive.ts` 無改訂) | `amadeus-directive.ts:97` / `:606` がどの Unit の diff にも現れないことを各 Unit の受け入れ確認に含める |
| ユーザー裁定を要する未確定(U-2) | `advisory-auto-resolution` | ADR-6 の3段縮退が実運用で許容できない場合、Option B への変更は FR-ADV-1 逐語の改訂であり、エスカレーション正準リスト(4)によりユーザー裁定を要する。Unit 内でも Bolt 内でも単独決定しない |

---

## カバレッジ検証

| 検証 | 結果 |
| --- | --- |
| すべての FR が Unit へ割り当てられているか | **31 / 31**(§FR の割当。未割当 0 件) |
| すべての NFR が検収 Unit を持つか | **7 / 7**(§NFR の割当) |
| すべての Unit が少なくとも1つの FR を持つか | **7 / 7**(§FR の割当 のカバレッジ検証) |
| すべてのゴール(Intent analysis 1〜4)が Unit へ到達するか | **4 / 4**(§ストーリー相当の単位。G1→`launch-autonomy-flag`、G2→`semi-authorization-core` ほか2、G3→`semi-authorization-core`、G4→`advisory-auto-resolution`) |
| proto-Unit P1〜P7 がすべて写像されているか | **7 / 7**(P1→`semi-authorization-core`、P2→`semi-authorization-core` + `stop-question-carveout`、P3→`semi-policy-carrier`、P4→`launch-autonomy-flag`、P5→`autonomy-statusline` + `semi-policy-carrier`、P6→`semi-docs-revision`、P7→`advisory-auto-resolution`) |
| `decisions.md` の未確定事項が引き取り先を持つか | **U-1〜U-7 の 7 件 + 是正後の申し送り 4 件 = 11 件すべて**(`unit-of-work.md` §未確定事項の引き取り) |
| `stories.md` の不在が明示されているか | 明示済み(§冒頭。user-stories ステージ SKIP、`ls` の実測出力を根拠として記載) |
