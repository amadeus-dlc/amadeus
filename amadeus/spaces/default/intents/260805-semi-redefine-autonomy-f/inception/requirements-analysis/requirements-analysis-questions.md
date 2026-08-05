# Requirements Analysis — 明確化質問(#2253 semi 再定義と `--autonomy` 起動宣言)

上流入力(consumes 全数): intent-statement.md / scope-document.md / business-overview.md / architecture.md / code-structure.md

> **E-OC1 判定**: 本ファイルは裁定前の起草である。以下6問はいずれも**未裁定**であり、`[Answer]:` はすべて空欄のまま提出する(`cid:requirements-analysis:election-answer-after-ruling`)。裁定を受領した後に conductor が記入し、§「裁定の記録」に E-code・票数・GoA・承認タイムスタンプを転記する。
>
> **引用の測定 ref**: 本ファイルの file:line はすべて worktree HEAD `17a1a7422` での実測(`grep -n` / `sed -n` の出力からの転記)。codekb 現在節の observed `2f255bc69` と同一値であることを患部6ファイルについて確認した。verbatim 断片は引用元から逐語転記している(`cid:requirements-analysis:verbatim-quote-with-cite`)。

## 前提(質問にしない既決事項)

`intent-statement.md` の Success Metrics、`scope-document.md` の In/Out と承認系譜、および Issue #2253 本文で既に確定しているため、以下は質問にしない(`cid:requirements-analysis:no-election-for-decided-norms` / `cid:intent-capture:c1`)。

- semi = full − {Intent 終端 / phase 境界 / walking skeleton / grant}(ユーザー裁定 2026-08-05、`scope-document.md` Out 冒頭)
- 後方互換なし。旧 semi 挙動の互換モード・フォールバック・移行シムを作らない(`scope-document.md` Out、org.md Forbidden)
- FR-GRT-004(semi は current grant = null)は維持(`scope-document.md` Out)
- `--autonomy full` は grant 実在時のみ走行、不在時は preview 表示で fail-closed 停止。FR-GRT-006 は緩めない(`scope-document.md` In-2)
- `AUTONOMOUS_BLOCK_CAP` の値そのものは変更しない(`scope-document.md` Out。実測 `packages/framework/core/hooks/amadeus-stop.ts:153` — `const AUTONOMOUS_BLOCK_CAP = 8;`)
- advisory の無人解決は **plugin 非依存の一般形**で要件化する(`scope-document.md` In-7)。`guardAdvisoryChoices`(`amadeus-advisory-choice.ts:592-597`)が `advisories: readonly Advisory[]` を受けるだけで `advisory.plugin` を分岐条件に使わない実測に基づく
- 無人解決の段数は **5段**(`architecture.md` 現在節「無人裁定梯子は5段(4段ではない)」— confirmed-policy / norm / history / solo-election / agent-recommendation。`amadeus-intent-autonomy.ts:699-744` 実測)
- statusline への Autonomy 表示追加は射程内(`scope-document.md` In-4。`packages/framework/core/hooks/amadeus-statusline.ts` の autonomy grep 0 hit を実測)

---

## Q1. `semi` の grant 非依存な認可基体を何が担うか

`architecture.md` 現在節「semi を梯子へ載せるときの最小介入点」が指摘するとおり、`resolveAutoDecision` の先頭1行が mode と grant を同時に見ている(`packages/framework/core/tools/amadeus-intent-autonomy.ts:702`、verbatim):

```
  if (projection.mode !== "full" || grant === null) return { kind: "invalid", reason: "full-grant-required" };
```

一方 `code-structure.md` 現在節が主患部と名指す同ファイルでは、`semi` は grant を持てない(`:251` verbatim — `| { readonly kind: "set-mode"; readonly mode: "none" | "semi" }`、`:257` の `revoke-full` も `targetMode` は同値域)。full grant のみが `scopeAllows`(`:497-498`)で `allowedInteractionKinds` を検査し、`scopeFingerprint`(`:530`)を裁定へ供給している。したがって semi を梯子へ載せるには、scope 認可・effect 認可・basisFingerprint を **grant 以外の何か**が担う必要がある。

- **A. `modeProvenance`(`kind: "human-command"`)を認可基体へ拡張する。** `authorizeInteraction:512` が既に `projection.modeProvenance.kind !== "human-command"` を要求している既存軸を拡張し、semi の許可 occurrence 集合と effect 境界を projection 側の導出値として持つ。`:702` は「mode 別の認可基体が解決できるか」に置き換わる。新しい型を増やさず既存の provenance 経路に載るが、provenance は本来「誰が mode を設定したか」の記録であり、認可の器としては意味を拡張することになる。
- **B. semi 専用の軽量 authorization レコードを新設する。** grant と並ぶ第2の認可基体(scope・effect 境界・fingerprint を持つが TTL・発行儀式なし)を型として追加し、`DecisionAuthorization` の判別ユニオンへ載せる。grant 経路は無改変で済み FR-GRT-004 とも衝突しないが、認可基体が2種になり `assertLegalAutonomyProjection` と replay 面(`amadeus-intent-autonomy-replay.ts`)の不変条件が増える。
- **C. semi にも grant を発行する(semi grant)。** 既存の grant 機構をそのまま再利用でき `:702` は `grant === null` の判定だけ残る。ただし `scope-document.md` Out の「FR-GRT-004 の変更(semi は current grant = null)」に真正面から矛盾するため、採るなら Out 境界の改訂をユーザー裁定で先に得る必要がある。
- **D. 認可基体を新設せず、`:702` を mode 非依存にして scope・effect 判定を後段へ委ねる。** 実際の安全弁は `applySemiDecision`(`amadeus-intent-autonomy-runtime.ts:546-554`、verbatim `effect.classification !== "workflow-reversible"` … `return { kind: "human-required", reason: "semi-gate-effect-not-authorized", result: null };`)が既に持っている。介入は最小になるが、梯子の入口が「誰の権限で回っているか」を fingerprint として持たなくなり、`AUTO_DECIDED` の basis 追跡性が落ちる。
- **E. semi projection を full 相当の projection へ写像するアダプタを置く。** 梯子側は無改変で済むが、実体は「semi を full に見せかける」互換レイヤであり、org.md Forbidden(要求されない互換レイヤ・二重実装の禁止)に抵触する読みが強い。
- **X. Other (please specify)**

推奨(agent recommendation): **B** — grant の意味論(発行儀式・TTL・revoke)を semi へ持ち込まずに scope/effect/fingerprint の3責務だけを型で明示でき、`:702` の緩和が「認可基体が解決できたか」という単一述語に閉じるため。A は provenance の意味拡張、D は追跡性の欠落、C は Out 境界との矛盾がそれぞれ残る。

[Answer]: B — semi 専用 authorization 型を新設し scope / effect 認可 / basisFingerprint の3責務だけを型で明示する。grant の意味論(発行儀式・TTL・revoke)は持ち込まない。FR-GRT-004(semi は current grant = null)は維持。 decision: auto-decision-38bb995e8eca9b35268e8de996297b6c(decider: solo-election、reviewState: unreviewed)

留保(subagent-2): 選択肢 A の欠点記述「modeProvenance は認可の器としては意味を拡張することになる」は過大評価である — `modeProvenance` は既に semi の認可述語(`amadeus-intent-autonomy.ts:512` の `projection.modeProvenance.kind !== "human-command"`、`:516` の `kind: "semi-mode-gate"`)かつ裁定 principal の供給元(`:602-604`)として機能している。B を採る理由は「A が不可能だから」ではなく「3責務を単一の型で明示でき `:702` の緩和が単一述語に閉じるから」と書き直すこと。

## Q2. `semi` の事前裁定方針の担体と確認 digest をどう定めるか

`architecture.md` 現在節「`--policies-file` の無音破棄」が指摘する構造を実測で確認した。`handleSetAutonomy` は mode に依存せず policies を読む(`packages/framework/core/tools/amadeus-bolt.ts:1067`、verbatim):

```
        policies: readDecisionPolicyInputs(flags["policies-file"]),
```

しかし `applyProductionAutonomyMode`(`amadeus-intent-autonomy-production.ts:407`)は `input.mode === "full"` のときだけ `prepareFullGrantCommand` へ policies を渡し、非 full は `prepareNonFullCommand(before, input.mode)`(`:382-395`)へ進む。この関数は policies 引数を**取らない**ため、`--mode semi --policies-file <json>` は警告なく破棄される。非 full の確認 digest も `autonomyDigest({ intentUuid: before.intentUuid, mode })`(`:394`、verbatim)で方針を含まない。semi が confirmed-policy 段(`:706-707`)を使うなら、この破棄はそのまま欠陥になる。

- **A. `set-mode` コマンドに `policies` を持たせ、非 full digest を方針込みへ拡張する。** `HumanAutonomyCommand` の `set-mode` 分岐(`amadeus-intent-autonomy.ts:251`)へ `policies` を追加し、`prepareNonFullCommand` へ policies を通し、digest を `autonomyDigest({ intentUuid, mode, policySetDigest })` 相当へ拡張する(full 側の `grantIssuanceDisplayDigest:337` と同じ合成形)。`--mode none --policies-file` は loud エラーにする。判別ユニオンと digest 形が同時に変わるため replay 互換の検討が要る。
- **B. `set-policies` を別コマンドとして新設する。** mode 設定と方針設定を分離し、それぞれ独立の確認 digest を持つ。`set-mode` の既存形を触らずに済むが、人間の操作が2手になり「起動時に1手で宣言する」という `--autonomy` の狙いと噛み合わない。
- **C. semi でも policies を受けるが確認 digest は課さない。** 方針は任意入力なので即時適用とし、`--status` に方針要旨を表示して事後確認に委ねる。実装は最小だが、full 側が確認儀式を課している非対称が残り、「表示→明示確認」を求める Issue #2253 の完了条件(1)と衝突する。
- **D. semi では policies を受け付けない(confirmed-policy 段を semi では無効化し4段で回す)。** `--policies-file` は非 full で loud エラーにするだけで済み、担体・digest の設計自体が不要になる。ただし Issue #2253 の対応表 #6 が semi ToBe を ○ としているため、完了条件の縮小に当たる。
- **E. 方針を record 側の別ファイルに置き、mode コマンドは参照パスと内容 digest のみを持つ。** 大きな方針集合を扱いやすいが、正本が state/audit の外に出るため replay 由来の canonical 永続化(`amadeus-intent-autonomy-replay.ts`)の外側に方針が置かれる。
- **X. Other (please specify)**

推奨(agent recommendation): **A** — full 側の digest 合成形をそのまま非 full へ写せるため確認儀式の意味論が1つに保たれ、`--policies-file` の loud 化(In-3 の明示要求)も同じ変更点に収まるため。

[Answer]: A — `set-mode` に policies と方針込みの確認 digest を載せ、full 側の digest 合成形を非 full へそのまま写す。`--policies-file` の非 full 無音破棄(`amadeus-bolt.ts:1067` が mode 非依存で読み、`amadeus-intent-autonomy-production.ts:417` の分岐で `prepareNonFullCommand:382-395` が受け取らない)を loud 化する。 decision: auto-decision-91288e3cb95002015b20a617c8aac978(decider: solo-election、reviewState: unreviewed)

## Q3. 走行単位の主張をどこまでに限定し、`semi` が使える梯子は何段か

`architecture.md` 現在節「stop hook 側の非対称」の指摘を実測で確認した。`packages/framework/core/hooks/amadeus-stop.ts` では cap の軸で semi は既に自律側(`:149-151` — `mode === "semi" || mode === "full" ? AUTONOMOUS_BLOCK_CAP : INTERACTIVE_BLOCK_CAP`)である一方、質問 carve-out の軸では非自律側である(`:171` verbatim — `if (intentAutonomyMode(stateContent) !== "full") return false;`、続く `:172-174` が `projection.currentGrant?.state === "active"` も要求)。budget mode は `:159`(verbatim `return mode === "full" ? "autonomous" : mode === "semi" ? "gated" : "interactive";`)で3値に分かれている。

同時に、梯子の後段2段だけが `reviewState: "unreviewed"` になる(`amadeus-intent-autonomy.ts` の solo-election `:726-735` / agent-recommendation `:736-744`、分岐は `:605-607`)。semi 利用者が「節目で人間が見るから安全」と考える一方、未レビュー裁定が phase 内で積み上がる構図をどう扱うかが裁定点である(`business-overview.md` 現在節「安全性の非対称」)。

- **A. 全5段を使う。主張は「質問で止まらない」に限定し、cap 8・budget mode `gated` は不変。** 後段2段の unreviewed は phase 境界の人間裁定時にまとめて検収する(Issue #2253 完了条件の「その裁定時に unreviewed 自動裁定の検収を提示する」に整合)。要件文言は「phase 完走の保証ではない」と明記する。
- **B. 全5段を使い、`stopBudgetMode` の semi も `autonomous` へ揃える。** 質問の軸と budget の軸の非対称が完全に解消され語彙が単調になるが、`gated` に依存する既存消費側(`--status` 表示・互換投影 `Construction Autonomy Mode`)の棚卸しが追加で必要になる。
- **C. semi は前段3段(confirmed-policy / norm / history)のみ。solo-election・agent-recommendation は human-required で park。** semi 下では unreviewed が構造的に発生せず「節目で見れば足りる」という利用者の期待と完全に一致するが、決定的根拠がない質問では毎回止まるため走行単位が再び不定形へ寄る。
- **D. semi は4段(前段3段+solo-election)。agent-recommendation のみ除外。** 「合議による裁定は許すが単独 agent の推奨は許さない」という線引き。unreviewed は発生するが根拠が選挙記録に残る。段数が full と1段だけ違うという非単調な差が残る。
- **E. 段数を unreviewed 累積件数の閾値で動的に決める(閾値超過で前段のみへ縮退)。** 未検収の積み上がりを構造的に抑えられるが、新しい閾値定数と縮退状態の可視化が要り、`scope-document.md` の In に無い機構を増やす。
- **X. Other (please specify)**

推奨(agent recommendation): **A** — Issue #2253 対応表の semi ToBe(#6/#7/#9 のみ ○ 化、他9行不変)と最も素直に一致し、budget mode を触らないぶん消費側棚卸しが増えないため。C/D は「semi = full − 節目」という単調な段階付けを崩す。

[Answer]: A — semi は全5段を使う。`AUTONOMOUS_BLOCK_CAP`(`amadeus-stop.ts:153` = 8)と budget mode(`:159` の3値)は不変。走行単位の主張は「質問で止まらない」に限定する。 decision: auto-decision-b49384017fd47dee6dfc1a1e6e2b63e3(decider: solo-election、reviewState: unreviewed)

留保(subagent-1): 承認済み上流(`scope-document.md:11` と `intent-statement.md:20`)がともに逐語「無人解決4段(方針なしは3段縮退)」と書いており、5段は RE の実測訂正(`inception/reverse-engineering/memory.md:8`)に基づく**訂正**である。requirements にこの訂正申告段落を置かないと無申告逸脱になる。 / 留保(subagent-1): In-1 が名指す `isFullyAutonomousIntent`(`amadeus-stop.ts:167-176`)は質問 carve-out(`:422`)だけでなく compose stop(`:457`)・conversational stop(`:716`)からも共有されており、無条件の書き換えは Q3=A が「不変」と主張する範囲外まで semi へ開く。**変更する呼び出し点を要件で列挙すること**。

## Q4. advisory choice を full/semi でどう無人解決するか(plugin 非依存の一般形)

`scope-document.md` In-7(ユーザー裁定 2026-08-05T06:03Z による追加)の対象。実測で構造を確認した。`applyPendingAdvisoryGuard`(`packages/framework/core/tools/amadeus-orchestrate.ts:781-800`)は pending が1件でもあれば `run-stage` / `dispatch-subagent` を `await-advisory-choice` へ差し替える(`:793` verbatim — `kind: "await-advisory-choice",`)。判定を行う `guardAdvisoryChoices`(`amadeus-advisory-choice.ts:592-597`)は `advisories: readonly Advisory[]` を受けるのみで `advisory.plugin` は記録フィールド(`:610`、`:636`)にすぎず、autonomy 参照は同ファイル全域で 0 hit である。代わりに受理側 `recordProtectedAdvisoryChoice`(`:864-868`)が `humanTurn: HumanTurnProvenance` を必須引数に取り、`isGroundedHumanTurn`(`:852-861`)で監査シャードの実 `HUMAN_TURN` ブロックとの timestamp・digest 一致を照合する。選択肢は2値(`:25-28` — `run-now` / `defer-with-risk`)、`run_required` は `formalChecks.length > 0` から導出される(`:730`)。

- **A. guard の hold を返す前に autonomy 認可を通し、梯子の裁定結果を engine provenance の receipt として記録する。** `applyPendingAdvisoryGuard` が hold を得た時点で question 相当の occurrence を組み、full/semi では梯子で選択肢を決める。`recordProtectedAdvisoryChoice` は人間経路として残し、自動裁定用の第2経路(`humanTurn` の代わりに `AUTO_DECIDED` の basisFingerprint を provenance とする)を新設する。`run_required: true` の advisory は強制実行のまま(`defer-with-risk` を自動選択させない)。介入は2ファイルに閉じるが receipt の provenance が2種になる。
- **B. A と同じ経路だが、`run_required: true` の advisory も無人で `defer-with-risk` を選べるようにする。** headless の完走性は最大になるが、「実行が必要と判定された形式検査を AI 判断で延期する」ことになり、`defer-with-risk` のラベル(「リスクを承知して延期する」`:27`)が指す責任主体が消える。
- **C. advisory を occurrence の一級市民にする。** `InteractionKind` に `advisory-choice` を追加し、grant の `allowedInteractionKinds`(`amadeus-intent-autonomy.ts:79`、検査は `:498`)と Q1 の semi 認可基体の両方で scope 認可する。autonomy の既存語彙に完全に載り将来の advisory 種別にも一般化するが、`InteractionKind` の追加は scopeFingerprint の合成対象を変えるため既存 grant の互換影響を棚卸しする必要がある。
- **D. full のみ無人化し、semi は従来どおり人間が選ぶ。** 変更面が最小で semi の安全側に倒れるが、「semi = full − 節目」の定義下で advisory を節目とみなす根拠が要る(advisory は phase 境界に紐づかない)。
- **E. autonomy とは独立に、advisory 側の設定(既定選択ポリシー)で自動選択する。** autonomy 認可基体を触らずに済むが、無人裁定の入口が autonomy 以外にもう1つでき、`AUTO_DECIDED` 監査・unreviewed queue の外側で選択が起きる。
- **X. Other (please specify)**

推奨(agent recommendation): **A**(`run_required: true` は強制実行のまま維持)— 既存の receipt 構造と2値選択肢をそのまま使い、無人裁定の記録先を `AUTO_DECIDED` + unreviewed queue に一本化できるため。C は構造的にはより整うが scopeFingerprint 互換の棚卸しが本 intent の射程を広げる。

[Answer]: A — guard hold の前に autonomy 認可 + engine provenance receipt の第2経路を置き、無人裁定の記録先を `AUTO_DECIDED` + unreviewed queue へ一本化する。`run_required: true` の advisory は強制実行のまま維持する。 decision: auto-decision-f88cc77faea16ecfc79f6bd38f277d41(decider: solo-election、reviewState: unreviewed)

留保(subagent-1): 第2 receipt 経路は fail-closed を受け入れ基準で固定すること — 現行の人間経路保証(`amadeus-advisory-choice.ts:864-868` の humanTurn 必須 + `:852-861` の監査 HUMAN_TURN 照合)を autonomy 認可成立時のみ `AUTO_DECIDED` basisFingerprint で代替し、**認可不成立時に第2経路へ落ちない**ことを落ちる実証込みで要求する。 / 留保(subagent-2): 重複排除キー(`:875-878`)と提示照合(`:889`)も humanTurn 依存であり「2ファイルに閉じる」は過小評価。並存させると org.md Forbidden の二重実装に抵触するため**置換**とすること。 / 留保(subagent-2): `run_required: true` の「強制実行のまま維持」は現行コードの追認ではない — `runRequired` は `:730` の `runRequired: formalChecks.length > 0` から導出され、`amadeus-directive.ts:684-688` は非空 `formal_checks` を要求するのみで defer-with-risk を禁じる強制は現行コードに無い。**新規要件化事項**として要件文へ明示すること。 / 留保(subagent-2): `formalCheckRoute:685` が `plugins/formal-model-check/tools/run-model-check.ts` をハードコードするため、`run_required` 経路は plugin 非依存でない。In-7 の plugin 非依存主張は **hold 判定の面に限る**と射程を明記すること。

## Q5. `--autonomy` の CLI 契約の細目をどう固定するか

`architecture.md` 現在節「`--autonomy` 起動フラグの結線余地」の指摘を実測で確認した。flag parser の if/else ladder(`packages/framework/core/tools/amadeus-orchestrate.ts:1044-1074`)には `--scope` `--stage` `--phase` `--depth` `--test-strategy` `--report` のみが値付きフラグとして並び、末尾の `} else if (!a.startsWith("--")) { intentWords.push(a); }`(`:1072-1073`)により**未認識フラグの値は intent 自由文へ流れ込む**。`--report` がわざわざ値を consume する理由はコメントに残っている(`:1068-1069`、verbatim):

```
      // CONSUME the value: an unrecognized valued flag would leak its value
      // into the freeform intent text (the path would read as intent words).
```

既決事項(semi 即時設定 / full は grant 実在時走行・不在時 fail-closed 停止)を前提に、以下が未決である。なお `READ_ONLY_FLAGS`(`:1014` で絶対優先処理)へは入れられない — autonomy は監査済みの状態変更だからである。

- **A. `semi|full` の2値のみ受け、値は必ず consume。不正値と `none` は loud エラーで停止。既設定 intent への再宣言は同値なら no-op、異値なら loud エラーで `amadeus-bolt set-autonomy` を案内。** 値の漏れが構造的に塞がれ、起動フラグが既存 mode を無言で書き換えることもない。downgrade/upgrade は明示コマンド経由に一本化される。
- **B. `none` も含む3値を受け、再宣言は常に上書き。** `amadeus-directive.ts:97`(verbatim `intent_autonomy_mode?: "semi" | "full";`)と `:606` の値域が2値であるため、directive 面との語彙差が生じる。起動時に `none` へ戻せる利便はある。
- **C. `semi|full` の2値だが再宣言は常に上書き(downgrade も可)。** headless の再起動で mode を張り替えられるが、`--autonomy semi` を打った起動が既存の full grant を暗黙に revoke しうる(`prepareNonFullCommand:386-390` が `revoke-full` を組む経路が実在する)ため、不可逆に近い副作用が1フラグに載る。
- **D. フラグは状態を変えず、`amadeus-bolt set-autonomy` を名指しする print directive に留める。** 既存流儀(`birthPrintDirective`、`:1097` に定義)と完全に整合し監査 provenance の問題も起きないが、`claude -p` の1コマンド起動では conductor の追加ターンが要るため、headless 宣言という当初の動機を満たさない。
- **E. 値を省略した `--autonomy` は対話プロンプトを出す。** 対話では親切だが headless では停止するため、動機と逆方向に働く。
- **X. Other (please specify)**

推奨(agent recommendation): **A** — 値の漏れ(`:1072-1073`)を確実に塞ぎ、mode の書き換えという不可逆寄りの操作を「明示コマンド経由のみ」に保てるため。あわせて HUMAN_TURN provenance の出所(`applyProductionAutonomyMode:409-411` が `latestHumanTurnId` を要求し、null なら `PROVENANCE_REQUIRED`)は要件で固定し、フラグ自体を provenance とみなさないことを明記する。

[Answer]: A — `--autonomy` は `semi|full` の2値。値を必ず consume する(`amadeus-orchestrate.ts:1072-1073` の intent 自由文流入を塞ぐ)。`none` と不正値は loud に拒否。再宣言は同値 no-op / 異値 loud。フラグ自体を provenance とみなさず、HUMAN_TURN provenance の出所(`applyProductionAutonomyMode:409-411` が `latestHumanTurnId` を要求し null なら `PROVENANCE_REQUIRED`)を要件で固定する。 decision: auto-decision-cb4ca48c9f16ed8c00d4fa0e70dbaf78(decider: solo-election、reviewState: unreviewed)

## Q6. 旧仕様ピンの改訂範囲(`t431` の同居ピンをどう扱うか)

`code-structure.md` 現在節「テスト面の所在」が最高焦点度とする2ファイルを実測した。`tests/unit/t431-intent-autonomy.test.ts` の同一 test 内に、**改訂対象**と**保存対象**が隣接して同居する(`:312-313`、verbatim):

```
    expect(authorizeInteraction(plan.after, occurrence("walking-skeleton", ["approve"])).kind).toBe("human-required");
    expect(authorizeInteraction(plan.after, occurrence("question")).kind).toBe("human-required");
```

`:313`(question)は反転対象、`:312`(walking-skeleton)は `scope-document.md` Out により**保存対象**である。もう一方は `tests/integration/t121-stop-hook-enforce.test.ts:1138`(verbatim `test("(f) semi + blank question ALLOWS because questions remain human-owned", () => {`)で、これは反転対象である。

- **A. `:313` と `t121:1138` のみ反転し、`:312` は無改変で残す。** 編集単位を行レベルで分け、保存対象を一切触らない。最小介入だが、test 名(`semi authorizes only phase-internal stage gates`、`:307`)が改訂後の実態と食い違ったまま残るため名称も同時に改める必要がある。
- **B. `t431` の当該 test を2つへ分割する。** 「semi が walking skeleton を人間へ戻す」を独立 test として保存し、「semi が質問を梯子へ載せる」を新しい test にする。保存対象が独立して名前を持つため以後の改訂で巻き込まれにくくなるが、test 数と名前が変わるためカバレッジ台帳・`tests/.coverage-patch-allowlist.json` の同期確認が要る。
- **C. `:312` も含めて semi の自動化へ反転する。** `scope-document.md` Out(walking skeleton は semi では人間裁定のまま)および Issue #2253 の #3 と正面から矛盾するため、採るならユーザー裁定でスコープ境界を改訂する必要がある。
- **D. `t431` の semi 関連 test 群を丸ごと書き直し、walking skeleton は新規 test として再ピンする。** 再定義後の契約を1箇所で読めるが、改訂 diff が大きく「何を保存したか」がレビューで追いにくい。
- **E. 旧 test を skip にして新 test を追加する。** 旧仕様ピンが skip の形で残るのは互換温存の一種であり、`scope-document.md` Out(移行シム禁止)および org.md Forbidden に抵触する。
- **X. Other (please specify)**

推奨(agent recommendation): **B** — 保存対象(walking skeleton)が独立した名前と test を持つため、Issue #2253 が求める「対象外を壊さない編集単位」を構造として保証でき、以後の改訂でも巻き込み事故が起きにくいため。A は最小だが保存対象が改訂対象と同居し続ける。

[Answer]: B — `tests/unit/t431-intent-autonomy.test.ts:307` の test を2分割し、walking-skeleton ピン(`:312`)を独立 test として保存したうえで semi 質問封鎖ピン(`:313`)を反転する。`tests/integration/t121-stop-hook-enforce.test.ts:1138-1150` も反転する。 decision: auto-decision-7ce1087b95878edd61c7b0a3cef3f027(decider: solo-election、reviewState: unreviewed)

## 裁定の記録

- **E-code**: E-SRA-RA1(kind: clarification、solo-election、trigger: auto)
- **票数 / GoA 内訳**: 2-0 established(choice 1「6問すべて推奨どおり採用」)。`GoA[E-SRA-RA1]: 2x2`(subagent-1 GoA 2 / subagent-2 GoA 2、棄権・追加議論・ブロックいずれも 0)
- **留保の逐語転記**: 各問の `[Answer]` 直下へ per-voter で転記済み(Q1 に1件、Q3 に2件、Q4 に4件。Q2 / Q5 / Q6 は留保なし)。留保必須票(GoA 2)は2票、転記件数は計7件で、いずれも「推奨の可否は変えないが要件文へ反映が要る」種別である
- **決定の記録**: 6問すべて `amadeus-bolt decide-question` により `decider: solo-election` / `reviewState: unreviewed` で記録(decision ID は各 `[Answer]` 行に併記)。裁定の evidenceFingerprint は選挙 tally の SHA-256(`sha256:c9d11d63525b419945f6dd5b618c6f2639467827ff657c27d42a80224a904d04`)
- **ユーザー承認**: 本 intent は full autonomy grant(`intent-grant-4c55238ea3ee5a3fe97623cbe6ea19a7`)下で走行しており、質問裁定は grant が認可する。grant 発行は実 HUMAN_TURN 由来。承認: 2026-08-05T05:00:46Z(intent-capture ゲート承認時点の HUMAN_TURN provenance)。unreviewed queue により事後検収が可能
- **E-OC1 判定**: 本ステージの質問は選挙を実施済みのため選挙不要判定は不適用
