# Requirements — semi 再定義と `--autonomy` 起動宣言(#2253)

上流入力(consumes 全数): intent-statement.md / scope-document.md / business-overview.md / architecture.md / code-structure.md

本文書は上記5成果物を次のとおり実参照する。`intent-statement.md` の Success Metrics を FR/NFR のトレース元とし(§トレーサビリティ)、`scope-document.md` の In-1〜In-7 / Out / 承認系譜を境界の正本とし(§Out of scope・§訂正申告)、`business-overview.md` 現在節の「安全性の非対称」「起動宣言(`--autonomy`)の価値」を Intent analysis の価値記述の根拠とし、`architecture.md` 現在節の「無人裁定梯子は5段(4段ではない)」「semi を梯子へ載せるときの最小介入点」「stop hook 側の非対称」「`--autonomy` 起動フラグの結線余地」「`--policies-file` の無音破棄」を FR の機構根拠とし、`code-structure.md` 現在節の「テスト面の所在」「docs 面の所在(22 ファイル = 11 対訳ペア)」「`semi` を含む正本知識ファイルの所在」を改訂面の全数列挙の根拠とする。

---

## 測定 ref と引用規律

- 本文書の file:line・件数はすべて **worktree HEAD `17a1a74224400fe11980c2308d616a5b7fda8baa`**(`git rev-parse HEAD` の出力からの転記)での起草時実測である(`cid:reverse-engineering:measurement-ref-in-artifacts` / `cid:requirements-analysis:mechanism-cite-verify-at-draft`)。codekb 現在節の observed は `2f255bc69` であり、患部ファイルは区間内無変更のため両断面で同値であることを引用ごとに確認した。
- 機構引用には verbatim 断片を併記する(`cid:requirements-analysis:verbatim-quote-with-cite`)。件数はコマンド出力からの転記のみとする(`cid:requirements-analysis:numbers-from-command-output-only`)。
- 行番号は canonical 側 `packages/framework/core/` を記す。`.claude/` 以下および `dist/` は生成物であり編集対象ではない(source-only 境界)。

---

## 訂正申告(承認済み上流からの逸脱の申告)

`cid:requirements-analysis:approval-lineage-citation` / `cid:requirements-analysis:implementation-deviation-election` に基づく申告である。**無申告の逸脱ではない。**

### 申告1 — 無人解決の段数を「4段」から「5段」へ訂正する

承認済み上流はいずれも逐語で **4段** と記す。

- `intent-statement.md:20`: 「semi の質問が full と同一の無人解決4段(方針なしは3段縮退)で解決され、`AUTO_DECIDED` + unreviewed queue に記録される」
- `scope-document.md:11`: 「質問を full と同一の無人解決4段(方針なしは3段縮退)で処理」

本要件はこれを **5段**とする。根拠は reverse-engineering の実測訂正である。

- `inception/reverse-engineering/memory.md:8`(逐語): 「無人解決の段数は #2253 が主張する「4段」でなく **5段**(confirmed-policy を数え落としている)。requirements 段で走行単位の主張を書くときは 5 段で書く。」
- `architecture.md` 現在節「無人裁定梯子は5段(4段ではない)」の実測表 — `resolveAutoDecision`(`amadeus-intent-autonomy.ts:699-744`)は full ハードゲート(`:702`)の後、confirmed-policy(`:706-707`)/ norm(`:708-717`)/ history(`:718-725`)/ solo-election(`:726-735`)/ agent-recommendation(`:736-744`)の5段を順に試す。

したがって上流の「4段」は confirmed-policy 段の数え落としであり、意味論の変更ではなく**同一機構の数え直し**である。本要件は以後すべて 5 段で書く。上流成果物の遡及書き換えは行わない(`cid:requirements-analysis:historical-section-cite-check-at-observed`)。

### 申告2 — In-7(advisory choice の無人解決)は scope-definition 承認後の追加裁定である

`scope-document.md:32`(逐語): 「本節は `cid:requirements-analysis:approval-lineage-citation` に基づく申告。scope-definition ステージは 2026-08-05T05:16:04Z に承認済みであり、In-7 はその後の追加裁定による境界変更である」。追加裁定は 2026-08-05T06:03Z のユーザー裁定(AskUserQuestion)であり、receipt は advisory_instance `86bed4aa-d738-4fba-9834-1e4eb3db7b6a` / human_turn `2026-08-05T06:03:16Z`。本要件の FR-ADV-* 群はこの追加裁定に基づく。

### 申告3 — 本ステージ6問の裁定系譜

`inception/requirements-analysis/requirements-analysis-questions.md` §「裁定の記録」が正本。E-code `E-SRA-RA1`(kind: clarification、solo-election、trigger: auto)、**2-0 established**、`GoA[E-SRA-RA1]: 2x2`。留保必須票(GoA 2)は2票、転記件数は計7件(Q1×1 / Q3×2 / Q4×4)。ユーザー承認: 2026-08-05T05:00:46Z(intent-capture ゲート承認時点の HUMAN_TURN provenance、full grant `intent-grant-4c55238ea3ee5a3fe97623cbe6ea19a7` 下)。7件の留保は §留保の転記に逐語で載せ、各 FR 本文に反映する。

---

## Intent analysis

**ユーザーが達成しようとしているゴール**(機能ではなくゴールとして記す)。

1. **「起動の一手で走行水準を宣言し、そのまま無人で回したい」** — 現在 autonomy を選ぶ唯一の経路は Intent 誕生後の `amadeus-bolt set-autonomy` であり(`business-overview.md` 現在節「起動宣言(`--autonomy`)の価値」)、`claude -p`・夜間・CI といった非対話起動では宣言がプロンプト文依存になり再現性がない。ゴールは「起動コマンドが走行水準の決定的な契約になっている」状態である。`--autonomy` はコード面に存在しない(実測: `grep -rn -- "--autonomy" packages tests docs scripts specs plugins contrib` → **0 hit**、HEAD `17a1a7422`)。
2. **「全部止まる」と「全部任せる」の間に、実用的な中間点がほしい** — 現行 `semi` は「phase 内のステージゲートだけを自動承認し、それ以外はすべて人間に戻す」水準であり(`business-overview.md` 現在節)、質問が出た時点で走行が切れるため走行単位が予測不能になる。ゴールは「日常判断は full と同じ自動裁定に載り、節目だけ人間に戻る」水準を得ることである。
3. **「任せた結果を後から検収できる」状態を保ちたい** — `business-overview.md` 現在節「安全性の非対称」が指摘するとおり、梯子後段2段は `reviewState: "unreviewed"` で記録される。ゴールは「無人裁定が積み上がっても、節目で人間がまとめて検収できる」ことであり、走行の無停止そのものではない。
4. **「人間ターンを要求する隠れた関門で headless 走行が切れない」ようにしたい** — advisory が1件 pending になるだけで `run-stage` が `await-advisory-choice` へ差し替わる(`scope-document.md` In-7)。これは特定プラグインの問題ではなく、advisory を出す任意のプラグインで起きる一般の欠落である(**射程注記**: plugin 非依存性の主張は `guardAdvisoryChoices` の **hold 判定の面に限る**。`run_required` 経路は `formalCheckRoute` が実行コマンドをハードコードするため plugin 非依存でない — FR-ADV-5 を参照)。

**ゴールでないもの**(誤読防止): 本 intent は「semi で phase を必ず完走できる」ことを主張しない。主張は「**質問で止まらない**」に限定する(Q3=A)。

---

## Functional requirements

### 領域 A: semi の認可基体(Q1=B)

`architecture.md` 現在節「semi を梯子へ載せるときの最小介入点」が指摘するとおり、`resolveAutoDecision` の先頭が mode と grant を同時に見ている(`amadeus-intent-autonomy.ts:702`、verbatim):

```
  if (projection.mode !== "full" || grant === null) return { kind: "invalid", reason: "full-grant-required" };
```

一方 `semi` は grant を持てない(`:251` verbatim — `  | { readonly kind: "set-mode"; readonly mode: "none" | "semi" }`、`:257` verbatim — `  | { readonly kind: "revoke-full"; readonly targetMode: "none" | "semi" };`)。full grant のみが `scopeAllows`(`:497-499`、verbatim `    grant.scope.allowedInteractionKinds.includes(occurrence.kind);`)で occurrence 種別を検査し、`scopeFingerprint`(`:530`、verbatim `    scopeFingerprint: grant.scope.scopeFingerprint,`)を裁定へ供給している。

- **FR-AUTH-1(semi 専用 authorization 型の新設)** — `semi` の裁定に用いる認可基体として、grant とは別の軽量 authorization 型を新設し、`DecisionAuthorization` の判別ユニオンへ載せる。この型が持つ責務は **(a) scope 認可 (b) effect 認可 (c) basisFingerprint の供給** の3つに限定する。grant の意味論(発行儀式・TTL・revoke)は持ち込まない。
  - **採用理由の明記**: 選択肢 A(`modeProvenance` の認可基体化)は「不可能だから」ではなく、B が「3責務を単一の型で明示でき `:702` の緩和が単一述語に閉じるから」採用される(留保 R1 の反映)。要件文・設計文で A を「不可能」と記述してはならない。
  - **受け入れ基準**: (1) 新設型が (a)(b)(c) の3フィールド相当を持ち、型定義に4つ目の責務(TTL・revoke 状態・発行 principal 儀式)を持たないことを型定義の直読で確認できる。(2) `semi` 下の裁定 1 件が新設型由来の basisFingerprint を持って `AUTO_DECIDED` へ記録される統合テストが green。(3) `assertLegalAutonomyProjection` と replay(`amadeus-intent-autonomy-replay.ts`)の不変条件に新設型分が追加され、不正な authorization を持つ projection が fail-closed で拒否されるテストが「落ちる実証」込みで green。
- **FR-AUTH-2(`:702` の緩和は単一述語へ閉じる)** — `:702` の `projection.mode !== "full" || grant === null` を、「**当該 occurrence に対する認可基体が解決できたか**」という単一述語へ置き換える。mode 名の直接比較を梯子入口に残さない。
  - **受け入れ基準**: 改訂後の `resolveAutoDecision` 入口に `mode !== "full"` の直接比較が存在しないこと(対象1ファイル `packages/framework/core/tools/amadeus-intent-autonomy.ts` の `resolveAutoDecision` 関数本体を対象とした grep で 0 hit。**記録面(codekb・intents record・docs 履歴散文)は対象外**)。`none` mode の question occurrence が引き続き `human-required` になるテストが green。
- **FR-AUTH-3(FR-GRT-004 の維持)** — `semi` は current grant = null を維持する。`set-mode` の値域(`:251`)へ `full` を追加しない。
  - **受け入れ基準**: `--mode semi` 適用後の projection で `currentGrant === null` を assert するテストが green。`scope-document.md` Out「FR-GRT-004 の変更(semi は current grant = null を維持)」に対する違反がないこと。

### 領域 B: semi 質問の無人解決(Q3=A、In-1)

- **FR-LAD-1(第1関門の semi 分岐改訂)** — `authorizeInteraction` の semi 分岐(`amadeus-intent-autonomy.ts:510-514`)を改訂し、`question` occurrence を認可基体つきで通す。現行 verbatim(`:510-514`):

  ```
    if (projection.mode === "semi") {
      const internalGate = occurrence.kind === "stage-gate" && occurrence.phase !== "phase-boundary";
      if (!internalGate || projection.modeProvenance.kind !== "human-command") {
        return { kind: "human-required", occurrence, reason: "MODE_REQUIRES_HUMAN" };
  ```

  `projection.modeProvenance.kind !== "human-command"`(`:512`)の要求は**維持**する(mode 設定の人間由来性は緩めない)。
  - **受け入れ基準**: semi + `question` occurrence が `human-required` 以外(認可済み)を返し、semi + `walking-skeleton` occurrence は引き続き `human-required` を返す2本の assert が同一テスト実行で同時に green。
- **FR-LAD-2(第2関門ルーティング)** — `selectDecision`(`amadeus-intent-autonomy-runtime.ts:522-524`)を改訂し、semi の `question` occurrence を `resolveAutoDecision` の梯子へ渡す。現行 verbatim:

  ```
      if (authorization.kind === "semi-mode-gate") return createSelectedGateDecision(projection, input, "mode-semi");
      if (input.occurrence.kind !== "question") return createSelectedGateDecision(projection, input, "grant-gate");
      const resolved = resolveAutoDecision({
  ```

  - **受け入れ基準**: semi の `question` が `createSelectedGateDecision` を経由せず `resolveAutoDecision` に到達することを、梯子段の basisKind(`confirmed-policy` / `norm` / `history` / `solo-election` / `agent-recommendation` のいずれか)が記録されることで確認する統合テストが green。
- **FR-LAD-3(`createGateAutoDecision` 入口ガードの改訂)** — `amadeus-intent-autonomy.ts:667`(verbatim `  if (input.occurrence.kind === "question") throw new Error("gate-decision-requires-gate-occurrence");`)を改訂する。ただし **throw を単純除去してはならない** — gate 経路へ question が紛れ込む誤配線は引き続き fail-closed で検出できること。
  - **受け入れ基準**: 梯子経由でない question(basisKind が gate 系)が渡された場合に throw が維持されることを assert するテストが green。
- **FR-LAD-4(5段すべてを使う)** — semi は梯子の**全5段**(confirmed-policy / norm / history / solo-election / agent-recommendation)を使う。裁定結果は `AUTO_DECIDED` として記録し、後段2段(`:726-735` / `:736-744`)は `reviewState: "unreviewed"` で unreviewed queue へ入る。現行の reviewState 分岐 verbatim(`:605-607`):

  ```
    const reviewState: DecisionReviewState = input.basisKind === "solo-election" || input.basisKind === "agent-recommendation"
      ? "unreviewed"
      : "not-applicable";
  ```

  - **受け入れ基準**: semi 下の question 裁定が (1) confirmed-policy が無い場合に norm→history→solo-election→agent-recommendation の順に降りる (2) solo-election / agent-recommendation 由来の裁定が `unreviewed` として `--status` の `Unreviewed:` 行(`amadeus-utility.ts:346`、verbatim `    \`Unreviewed:     ${autonomy.unreviewedAutoDecisionCount}\`,`)へ計上される、の2点を統合テストで確認できる。
- **FR-LAD-5(節目は人間裁定のまま)** — walking skeleton / phase 境界 / Intent 終端は semi では引き続き人間裁定とする(`scope-document.md` Out 冒頭)。効果側の安全弁 `applySemiDecision`(`amadeus-intent-autonomy-runtime.ts:546-554`)の `workflow-reversible` 要求は緩めない。
  - **受け入れ基準**: semi + `walking-skeleton` occurrence が `human-required`、semi + `phase-boundary` の stage-gate が `human-required`、不可逆効果が `semi-gate-effect-not-authorized` を返すことの3点が green(いずれも「落ちる実証」— 反転させると赤になることを実測して記録する)。
- **FR-LAD-6(走行単位の主張の限定)** — 本 intent が主張する走行単位は「**質問で止まらない**」に限定する。「phase を完走する」「phase 1個ぶん必ず走る」とは要件・docs のいずれにも書かない。
  - **受け入れ基準**: 改訂後の docs / 正本知識 / 要件文に「phase 完走の保証」に相当する記述が無いこと(改訂対象ファイルのレビュー観点として固定)。

### 領域 C: stop hook の carve-out(In-1、Q3=A の留保 R3 を反映)

`architecture.md` 現在節「stop hook 側の非対称」の実測を根拠とする。cap の軸では semi は既に自律側(`hooks/amadeus-stop.ts:149-151`、verbatim `  return mode === "semi" || mode === "full"` / `    ? AUTONOMOUS_BLOCK_CAP` / `    : INTERACTIVE_BLOCK_CAP;`)、質問 carve-out の軸では非自律側(`:171` verbatim `  if (intentAutonomyMode(stateContent) !== "full") return false;`、続く `:174` verbatim `    return projection?.mode === "full" && projection.currentGrant?.state === "active";`)である。

- **FR-STOP-1(述語の分割と呼び出し点の限定列挙)** — `isFullyAutonomousIntent`(`:167-178`)を**無条件に書き換えてはならない**。呼び出し点は実測で3箇所である(`grep -n 'isFullyAutonomousIntent' hooks/amadeus-stop.ts` の出力からの転記 — 定義 `:167` / 呼び出し `:422` / `:457` / `:716`)。本 intent が semi へ開く呼び出し点は **`:422` のみ**とする。

  | 呼び出し点 | 関数 | verbatim | 本 intent での扱い |
  | --- | --- | --- | --- |
  | `:422` | `isPendingQuestionStop`(tier-2 質問 carve-out) | `    if (isFullyAutonomousIntent(stateContent, resolvedProjectDir)) {` | **semi へ開く**(質問で止まらない = FR-LAD-6 の主張範囲) |
  | `:457` | `isPendingComposeStop`(tier-2b compose gate) | `  if (isFullyAutonomousIntent(stateContent, deps.projectDir)) {` | **full 限定を維持**(compose は走行単位の主張の外) |
  | `:716` | tier-3 conversational stop | `    if (isFullyAutonomousIntent(stateContent, resolvedProjectDir)) {` | **full 限定を維持** |

  - **受け入れ基準**: (1) semi の状態で `:422` 経路が carve-out を得る(質問 pending で stop しない)テストが green。(2) semi の状態で `:457` と `:716` の経路が **carve-out を得ない**(従来どおり stop する)テストが green。(2) は「落ちる実証」を必須とする — 述語を無条件共有に戻すと赤になることを実測して記録する。
  - **同期対象**: 述語を改名・分割する場合、`tests/.coverage-patch-allowlist.json:5268`(実測 — `"function": "isFullyAutonomousIntent",`)と `tests/unit/t147-kiro-hook-adapter.test.ts:723`(コメント)が同期対象になる。
- **FR-STOP-2(cap と budget mode は不変)** — `AUTONOMOUS_BLOCK_CAP`(`:153`、verbatim `const AUTONOMOUS_BLOCK_CAP = 8;`)と `stopBudgetMode`(`:159`、verbatim `  return mode === "full" ? "autonomous" : mode === "semi" ? "gated" : "interactive";`)は変更しない。
  - **受け入れ基準**: 両行が本 intent の diff に現れないこと。既存の cap / budget テストが無改変で green。

### 領域 D: 事前裁定方針の担体と確認 digest(Q2=A、In-3)

`architecture.md` 現在節「`--policies-file` の無音破棄」の実測を根拠とする。`handleSetAutonomy`(`tools/amadeus-bolt.ts:1051`)は mode に依存せず policies を読む(`:1067`、verbatim `        policies: readDecisionPolicyInputs(flags["policies-file"]),`)が、`applyProductionAutonomyMode` の分岐(`tools/amadeus-intent-autonomy-production.ts:417`、verbatim `  if (input.mode === "full") {`)により非 full は `prepareNonFullCommand`(`:382-395`)へ進む。この関数は policies 引数を**取らない**(`:382-384` verbatim — `function prepareNonFullCommand(` / `  before: AutonomyProjection,` / `  mode: Exclude<AutonomyMode, "full">,`)。非 full の確認 digest も方針を含まない(`:394`、verbatim `    displayDigest: autonomyDigest({ intentUuid: before.intentUuid, mode }),`)。

- **FR-POL-1(`set-mode` へ policies を載せる)** — `HumanAutonomyCommand` の `set-mode` 分岐(`amadeus-intent-autonomy.ts:251`)へ `policies` を追加し、`prepareNonFullCommand` へ policies を通す。
  - **受け入れ基準**: `--mode semi --policies-file <json>` の適用後、projection から当該 policy が読め、semi の question 裁定が confirmed-policy 段(`:706-707`)で解決されるテストが green。
- **FR-POL-2(非 full の確認 digest を方針込みへ拡張)** — 非 full の `displayDigest` を full 側の合成形(`prepareFullGrantCommand` の `grantIssuanceDisplayDigest`)と同形へ拡張し、方針集合を digest の合成対象に含める。
  - **受け入れ基準**: 同一 mode・異なる policy 集合で digest が異なり、同一 policy 集合では安定(同値)であることを assert するテストが green。replay(`amadeus-intent-autonomy-replay.ts`)が拡張後の `set-mode` コマンドを復元でき、`readProductionAutonomyProjection` の結果が書込前後で一致すること。
- **FR-POL-3(`--policies-file` の無音破棄の loud 化)** — 方針を受け付けない組み合わせ(本要件では `--mode none --policies-file`)は **loud エラーで停止**する。無警告の破棄経路を残さない。
  - **受け入れ基準**: `--mode none --policies-file <json>` が非 0 exit かつ理由を stderr に出すことを assert するテストが green。かつ「落ちる実証」— loud 化を外すと当該テストが赤になることを実測して記録する。

### 領域 E: `--autonomy` 起動宣言(Q5=A、In-2)

`architecture.md` 現在節「`--autonomy` 起動フラグの結線余地」の実測を根拠とする。flag parser(`tools/amadeus-orchestrate.ts:1044-1074`)の末尾(`:1072-1073`、verbatim):

```
    } else if (!a.startsWith("--")) {
      intentWords.push(a);
```

により、未認識の値付きフラグの値は intent 自由文へ流れ込む。`--report` が値を consume する理由がコメントに残っている(`:1068-1069`、verbatim):

```
      // CONSUME the value: an unrecognized valued flag would leak its value
      // into the freeform intent text (the path would read as intent words).
```

- **FR-CLI-1(2値・値の consume)** — `--autonomy` は `semi` と `full` の2値のみを受け、値を必ず consume する。
  - **受け入れ基準**: `/amadeus --autonomy semi <自由文>` を parse したとき、`semi` が intent 自由文に混入しない(`flags.intent` に `semi` が現れない)ことを assert するテストが green。「落ちる実証」— parser から `--autonomy` 分岐を外すと当該テストが赤になることを実測して記録する。
- **FR-CLI-2(`none` と不正値は loud)** — `none` および値域外の値は loud エラーで停止する。値の省略も loud とする(対話プロンプトへフォールバックしない)。
  - **受け入れ基準**: `--autonomy none` / `--autonomy bogus` / 値なし `--autonomy` の3ケースがいずれも非 0 exit かつ理由を stderr に出すテストが green。directive 面の値域(`tools/amadeus-directive.ts:97`、verbatim `  intent_autonomy_mode?: "semi" | "full";`、検査は `:606` verbatim `  checkOptionalEnum(o, "intent_autonomy_mode", ["semi", "full"] as const, kind, errors);`)と語彙が一致していること。
- **FR-CLI-3(再宣言の意味論)** — 既に mode が設定された Intent への再宣言は、**同値なら no-op**、**異値なら loud エラー**で停止し `amadeus-bolt set-autonomy` を案内する。起動フラグが既存 mode を無言で書き換えない。
  - **受け入れ基準**: (1) mode=semi の Intent へ `--autonomy semi` → 監査イベントを増やさず正常継続。(2) mode=semi の Intent へ `--autonomy full` → 非 0 exit + `set-autonomy` の案内文。(3) (2) の状態で既存 grant が revoke されていないこと(`prepareNonFullCommand:386-390` の `revoke-full` 経路が起動フラグから到達不能であること)。
- **FR-CLI-4(full の fail-closed)** — `--autonomy full` は grant 実在時のみ走行し、不在時は preview 表示で **fail-closed 停止**する。FR-GRT-006 は緩めない。
  - **受け入れ基準**: grant 不在の Intent に対する `--autonomy full` が非 0 exit で停止し、preview(発行に必要な内容)を表示することを assert する回帰テストが green。かつ「落ちる実証」— fail-closed 判定を反転させると当該テストが赤になることを実測して記録する(`intent-statement.md:22` の「**落ちる実証**で回帰固定」に対応)。
- **FR-CLI-5(provenance の出所)** — `--autonomy` フラグ自体を provenance とみなさない。mode 適用は既存の HUMAN_TURN provenance 要求に従う(`amadeus-intent-autonomy-production.ts:409-411`、verbatim):

  ```
    const humanTurnId = latestHumanTurnId(input.projectDir, resolved);
    if (humanTurnId === null) return { ok: false, error: "PROVENANCE_REQUIRED" };
  ```

  - **受け入れ基準**: HUMAN_TURN が不在の状態での `--autonomy semi` が `PROVENANCE_REQUIRED` 相当で停止することを assert するテストが green。`READ_ONLY_FLAGS` へ `--autonomy` を追加しないこと(autonomy は監査済みの状態変更であるため)。

### 領域 F: 表示の同一語彙(In-4)

- **FR-DISP-1(statusline への Autonomy 表示)** — statusline に Autonomy 水準を表示する。現状 `hooks/amadeus-statusline.ts` に autonomy 参照は無い(実測: `grep -c -i 'autonomy' hooks/amadeus-statusline.ts` → **0**)。
  - **受け入れ基準**: mode が `none` / `semi` / `full` のそれぞれで statusline レンダラが対応する語彙を出すことを assert するユニットテストが green。語彙は `--status` の `Autonomy:` 行(`tools/amadeus-utility.ts:341`、verbatim `    \`Autonomy:       ${autonomy.autonomyMode}\`,`)と同一の mode 名を用いる(表示文言の独自語彙を作らない)。
- **FR-DISP-2(`--status` の Policies 行の grant 非依存化)** — `--status` の `Policies:` 行は現在 grant 依存である(`tools/amadeus-utility.ts:345`、verbatim `    \`Policies:       ${autonomy.grant?.policyCount ?? 0}\`,`)。semi が policies を持てる(FR-POL-1)以上、grant 不在でも実 policy 数を表示する。
  - **受け入れ基準**: policies を設定した semi Intent の `--status` が `Policies: 0` ではなく実数を表示することを assert するテストが green。

### 領域 G: advisory choice の無人解決(Q4=A、In-7)

`applyPendingAdvisoryGuard`(`tools/amadeus-orchestrate.ts:781-800`)は pending が1件でもあれば `run-stage` / `dispatch-subagent` を差し替える(`:784` verbatim `  if (directive.kind !== "run-stage" && directive.kind !== "dispatch-subagent") return directive;`、`:793` verbatim `    kind: "await-advisory-choice",`)。判定側 `guardAdvisoryChoices`(`tools/amadeus-advisory-choice.ts:592-597`)は `advisories: readonly Advisory[]` を受けるのみで `advisory.plugin` を分岐条件に使わない。受理側 `recordProtectedAdvisoryChoice`(`:864-868`)は `humanTurn: HumanTurnProvenance` を必須引数に取り、`isGroundedHumanTurn`(`:852-861`)で監査シャードの実 `HUMAN_TURN` と timestamp・digest の一致を照合する。選択肢は2値(`:25-28` — `run-now` / `defer-with-risk`)。

- **FR-ADV-1(第2 receipt 経路の新設)** — `applyPendingAdvisoryGuard` が hold を得た時点で、`await-advisory-choice` を返す**前に** autonomy 認可を通し、full/semi では梯子で選択肢を決める。無人裁定の receipt は `humanTurn` の代わりに `AUTO_DECIDED` の basisFingerprint を provenance とする第2経路で記録し、記録先を `AUTO_DECIDED` + unreviewed queue へ一本化する。**用いる occurrence 種別**: Out(`InteractionKind` への `advisory-choice` 追加は非採用)により既存種別へ写像する。採用された Q4 選択肢 A の本文(`requirements-analysis-questions.md` の Q4-A)は「question 相当の occurrence を組み」と規定しており、本要件はこれを踏襲する — すなわち advisory の選択を `kind: "question"` の occurrence として組み、`selector` に advisory instance を含めて一意化する。**この写像が FR-AUTH-1 の scope 認可(occurrence 種別の許可集合)と整合することの確認は application-design の設計事項**とし、Open questions へ送る。
  - **受け入れ基準**: full grant 下で pending advisory が1件ある状態の `next` が `await-advisory-choice` ではなく `run-stage` を返し、その裁定が `AUTO_DECIDED` として記録される統合テストが green。
- **FR-ADV-2(fail-closed の固定)** — 第2 receipt 経路は **autonomy 認可が成立したときのみ** `AUTO_DECIDED` basisFingerprint を provenance として受理する。**認可不成立時に第2経路へ落ちてはならない**(mode=none、grant 失効、scope 不一致のいずれでも人間経路へ戻る)。現行の人間経路保証(`:864-868` の humanTurn 必須 + `:852-861` の監査 HUMAN_TURN 照合)は等価な強度で維持する。
  - **受け入れ基準**: (1) mode=none で pending advisory がある場合に `await-advisory-choice` が返ることを assert。(2) 失効 grant / scope 不一致でも同様。(3) **落ちる実証**必須 — 認可判定を無条件 true に差し替えると (1)(2) が赤になることを実測して記録する。
- **FR-ADV-3(並存でなく置換)** — 受理経路は置換とし、人間経路と自動経路の二重実装を作らない。humanTurn 依存は受理の3点に及ぶ — grounding(`:877` verbatim `    if (!isGroundedHumanTurn(projectDir, humanTurn)) return false;`)、**重複排除キー**(`:878-881`、verbatim `    if (store.receipts.some((receipt) =>` / `      receipt.humanTurn.eventIdentity === humanTurn.eventIdentity` / `      && receipt.humanTurn.shard === humanTurn.shard` / `    )) return false;`)、**提示照合**(`:889` verbatim `    if (!hasMatchingAdvisoryPresentation(projectDir, open, humanTurn)) return false;`)。重複排除キーと提示照合も provenance 抽象へ載せ替える。
  - **測定注記**: 裁定時の留保は重複排除キーを `:875-878` と記すが、HEAD `17a1a7422` の実測では当該ブロックは `:878-881` である(`grep -n 'store.receipts.some' tools/amadeus-advisory-choice.ts` → `878:    if (store.receipts.some((receipt) =>`)。留保の趣旨(「重複排除キーと提示照合も humanTurn 依存であり置換対象」)はそのまま適用する。
  - **受け入れ基準**: 受理関数が provenance を判別ユニオンで1本受け、人間用と自動用の並行実装(関数の複製・分岐コピー)が存在しないこと。同一 advisory に対する二重 receipt が provenance 種別を跨いでも防がれることを assert するテストが green。
- **FR-ADV-4(`run_required: true` は強制実行 — 新規要件化事項)** — `run_required: true` の advisory は **強制実行**とし、`defer-with-risk` を無人で選ばせない。
  - **新規性の明示**: これは現行コードの追認ではない。`runRequired` は導出値にすぎず(`tools/amadeus-advisory-choice.ts:730`、verbatim `    runRequired: formalChecks.length > 0,`)、directive 検証(`tools/amadeus-directive.ts:684-688`)は非空 `formal_checks` を要求するのみである(`:684` verbatim `  if (o.run_required === true && (!Array.isArray(o.formal_checks) || o.formal_checks.length === 0)) {`)。**`defer-with-risk` を禁じる強制は現行コードに存在しない**。本 FR はその強制を新規に要件化するものである。
  - **受け入れ基準**: `run_required: true` の advisory に対して無人経路が `defer-with-risk` を選べないことを assert するテストが green(選ばせようとすると fail-closed で拒否される)。人間経路での `defer-with-risk` の可否は本 intent で変更しない。
- **FR-ADV-5(plugin 非依存の射程)** — In-7 の「plugin 非依存の一般形」の主張は **hold 判定の面に限る**。`guardAdvisoryChoices` が `advisory.plugin` を分岐条件に使わないため hold 判定は plugin 非依存だが、`run_required` 経路は plugin 非依存**ではない** — `formalCheckRoute`(`:677`)が実行コマンドをハードコードしている(`:685`、verbatim `    "bun", "plugins/formal-model-check/tools/run-model-check.ts",`)。
  - **受け入れ基準**: 要件文・設計文・docs のいずれにも「`run_required` 経路が plugin 非依存である」と読める記述がないこと。plugin 非依存性を主張する箇所には「hold 判定の面に限る」の射程注記が併記されていること。

### 領域 H: 旧仕様ピンと文書の改訂(Q6=B、In-5)

- **FR-PIN-1(`t431` の test 2分割)** — `tests/unit/t431-intent-autonomy.test.ts:307`(verbatim `  test("semi authorizes only phase-internal stage gates", () => {`)の test を2つへ分割する。**保存対象**である walking-skeleton ピン(`:312`、verbatim `    expect(authorizeInteraction(plan.after, occurrence("walking-skeleton", ["approve"])).kind).toBe("human-required");`)を独立 test として保存し、**反転対象**である質問封鎖ピン(`:313`、verbatim `    expect(authorizeInteraction(plan.after, occurrence("question")).kind).toBe("human-required");`)を新しい test で反転する。test 名も改訂後の実態に合わせて改める。
  - **受け入れ基準**: 分割後、walking-skeleton の human-required を assert する独立 test が名前を持って存在し green。質問側の test が「梯子へ載る」を assert して green。`tests/.coverage-patch-allowlist.json` の同期確認を行い、drift が無いこと。
- **FR-PIN-2(`t121` のピン反転)** — `tests/integration/t121-stop-hook-enforce.test.ts:1138`(verbatim `  test("(f) semi + blank question ALLOWS because questions remain human-owned", () => {`)以下 `:1138-1150` を反転する。test 名の理由句(`because questions remain human-owned`)も同時に改める。
  - **受け入れ基準**: 反転後の test が「semi + blank question で stop hook が継続を許す(carve-out を得る)」を assert して green。近傍の `(f) gated Construction` test(`:1152`)は無改変で green を維持。
- **FR-PIN-3(既存グリーン維持 AC の射程限定)** — 「既存テストのグリーン維持」は **FR-PIN-1 / FR-PIN-2 が名指す2ファイルの反転対象行を除いた集合**に対して要求する。反転対象は欠陥そのものをピンしているため、汎用のグリーン維持 AC とは構造的に両立しない(`cid:reverse-engineering:c1-pinned-behavior-ruling` 追補)。
  - **受け入れ基準**: `t431:313` 相当と `t121:1138-1150` 相当の2箇所のみが改訂され、それ以外の semi 関与テストは無改変で green(semi 関与テストは実測 **13 ファイル** — `grep -rln "semi" tests/ --include="*.ts" | wc -l` → 14 のうち `tests/unit/t97.test.ts` の hit は `semicolon` の部分一致で autonomy 無関係、`code-structure.md` 現在節「テスト面の所在」の実測)。
- **FR-DOC-1(docs の対訳同時改訂)** — docs の改訂対象は **22 ファイル = 11 対訳ペア**である(実測: `grep -rln "semi" docs/ | wc -l` → **22**)。`intent-statement.md:23` と `scope-document.md:15` が記す「11 ファイル」は対訳の片側のみを数えた値であり(`code-structure.md` 現在節「docs 面の所在」)、同期対象は 22 ファイルである。日英を同一変更で同期する。
  - **受け入れ基準**: 改訂後、`docs/` 配下で `semi` の意味論を旧定義(「phase 内ステージゲートのみ自動、質問は人間」)のまま述べる記述が 0 件であること。**grep の対象面は `docs/` に限定する** — codekb(`amadeus/spaces/default/codekb/`)と intent record(`amadeus/spaces/default/intents/`)は旧定義を実測記録として恒久保持する**記録面**であり、対象外とする(`cid:requirements-analysis:c1-ac-grep-surface-scope`)。日英ペアの両側が同一 PR に含まれること。
- **FR-DOC-2(正本知識 `stage-protocol.md` の改訂)** — `packages/framework/core/amadeus-common/protocols/stage-protocol.md` の該当 **9 行**(実測: `grep -c "semi" <当該ファイル>` → **9**)のうち、`:33`(semi の phase 境界と auto-approve 手順)と `:131`(semi の正本1行定義)を直接反転する。`:105` / `:808`(walking skeleton は `none`/`semi` が人間待ち)は **保存**する(FR-LAD-5)。`:125` は起動フラグ追加に伴い同期する。`:133` / `:442` / `:118` / `:796` は `code-structure.md` 現在節の分類に従う。
  - **受け入れ基準**: canonical 1 本のみを編集し(`git ls-files` 追跡は canonical 1 本、on-disk ミラーは 14 本 — `find . -path ./node_modules -prune -o -name "stage-protocol.md" -print | wc -l` → `14`(HEAD `17a1a7422` 実測。出力からの転記))、`bun run build` 後に追跡ファイルが不変であること。`:105` / `:808` が本 intent の diff に現れないこと。

---

## Non-functional requirements

- **NFR-1(fail-closed の実証可能性)** — 本 intent が新設・改訂するすべての認可・受理ゲート(FR-AUTH-1 / FR-ADV-2 / FR-CLI-4 / FR-POL-3 / FR-STOP-1 の維持側)は、**失敗ケースを注入して実際に赤くなること**を実証してから完成扱いとする(org.md Mandated)。
  - **合否基準**: 上記5ゲートそれぞれについて、注入 diff・赤の実測出力・復元後の残渣ゼロ確認(`git diff --stat` が空)が code-generation の成果物に記録されていること。注入は「赤の実測 → revert 完了」までを不可分の1セットで行う(`cid:code-generation:falling-proof-injection-one-set`)。
- **NFR-2(監査追跡性)** — semi 下の無人裁定はすべて basisFingerprint を持つ `AUTO_DECIDED` として監査 journal に記録され、replay(`amadeus-intent-autonomy-replay.ts`)から projection を復元できる。
  - **合否基準**: semi の裁定を 1 件以上含む監査 journal を replay した結果の projection が、書込直後の projection と等値であることを assert する統合テストが green。basisFingerprint が SHA-256 形式(`SHA256.test`)を満たすこと。
- **NFR-3(起動フラグの実行コスト)** — `--autonomy` の追加は flag parser の走査計算量を変えない(既存の argv 一巡 if/else ladder に分岐を1つ足すのみ)。parse 段階で追加のファイル I/O を行わない。
  - **合否基準**: `--autonomy` 分岐が `tools/amadeus-orchestrate.ts:1044-1074` の同一 ladder 内に置かれ、parse 関数内に新規の `readFileSync` / `existsSync` 等の FS 呼び出しが 0 件であること(当該関数本体の grep で確認)。
- **NFR-4(テスト方式)** — 実行可能な振る舞いの追加・変更は TDD を既定かつ必須とする(team.md § Testing Posture)。合意済み公開 seam へ失敗テストを1件追加して Red を実測し、最小実装で Green にする vertical slice を反復する。
  - **合否基準**: 各 FR について、Red の実測(失敗出力)と Green への遷移が code-generation の成果物に記録されていること。実 FS を触るテストは integration 層へ置く(`cid:code-generation:fs-tests-integration-first`)。
- **NFR-5(生成物ドリフトゼロ)** — 編集正本は `packages/framework/core/` および `packages/framework/harness/<name>/` に限り、`dist/` とセルフインストールツリーは `bun run build` の再生成物として扱う。
  - **合否基準**: `bun run build` 実行後に追跡ファイルが不変(`git status` が clean)であること。`bun run source-only:check`、隔離2回ビルドの再現性検査、グラフ不変量検査が green。
- **NFR-6(provenance の偽装不能性)** — `--autonomy` および advisory の第2 receipt 経路は、実 HUMAN_TURN 由来でない provenance で認可境界を通過できない。
  - **合否基準**: (1) HUMAN_TURN 不在での `--autonomy semi` が `PROVENANCE_REQUIRED` で停止。(2) 監査シャードに存在しない timestamp/digest を持つ humanTurn での advisory 受理が拒否される(`isGroundedHumanTurn` の照合が維持されている)。両者とも「落ちる実証」込み。
- **NFR-7(ゲート集合の維持)** — 本 intent の PR は既存のブロッキング検査集合をすべて満たす: `bun run typecheck`、`bun run lint`、隔離2回ビルドの再現性検査、`bun run source-only:check`、グラフ不変量検査、`bash tests/run-tests.sh --ci`、Project Coverage Gate(絶対下限 AND merge-base 相対許容低下幅の両条件)、Patch Coverage Gate、complexity、plugin-conformance-e2e。
  - **合否基準**: PR CI が上記すべてで green(coverage の正規判定は PR CI を正とする — `cid:code-generation:local-lcov-pre-push`)。

---

## Constraints

### 技術的制約

- **C-1(semi は grant を持たない)** — `HumanAutonomyCommand` の `set-mode` の値域は `"none" | "semi"` のみ(`amadeus-intent-autonomy.ts:251`)、`full` は `issue-full` / `replace-full` 経由でしか到達できない。したがって「semi を梯子へ載せる」は構造的に「grant なしで梯子を回す」ことを意味する(`architecture.md` 現在節、`inception/reverse-engineering/memory.md:20`)。
- **C-2(「節目」を判別する既存述語が無い)** — 現行で機械判別できるのは `occurrence.phase !== "phase-boundary"` と `occurrence.kind` の2軸のみであり、**`question` occurrence には phase 概念がない**(`business-overview.md` 現在節「リスクの所在」、`inception/reverse-engineering/memory.md:21`)。本 intent は Q3=A により「質問はすべて梯子へ載せる」ため新述語の新設を要さないが、将来「節目の質問」を設ける場合は述語の新設が前提になる。
- **C-3(directive 面の値域は2値)** — `intent_autonomy_mode` は `"semi" | "full"` の2値で `none` を持たない(`tools/amadeus-directive.ts:97` / `:606`)。`--autonomy` の値域はこれと一致させる(FR-CLI-2)。
- **C-4(互換投影の潰れ)** — `Construction Autonomy Mode` は `flags.mode === "full" ? "autonomous" : "gated"` により **`semi` と `none` がともに `gated` へ潰れる**(`tools/amadeus-bolt.ts:1071` verbatim `      const schedulingMode = flags.mode === "full" ? "autonomous" : "gated";`)。本 intent はこの投影を変更しない(Q3=A で budget mode 不変)。
- **C-5(source-only 境界)** — `stage-protocol.md` は on-disk 14 本のミラーを持つが `git ls-files` 追跡は canonical 1 本のみ(件数は上記 `find ... | wc -l` の出力からの転記。`code-structure.md` 現在節は「`.claude/` 以下は同一内容ミラー」の質的記述のみで件数を持たない)。編集は canonical のみ、他は再生成物。
- **C-6(READ_ONLY_FLAGS 不可)** — autonomy は監査済みの状態変更であるため、read-only フラグの絶対優先梯子(`tools/amadeus-orchestrate.ts:1014-1016`)へは入れられない。

### ビジネス的・組織的制約

- **C-7(後方互換なし)** — 旧 semi 挙動の互換モード・フォールバック・移行シム・二重実装を作らない(`scope-document.md` Out、org.md Forbidden、ユーザー裁定 2026-08-05)。旧テストを skip で残す形も互換温存として禁止する。
- **C-8(PR 粒度)** — Bolt ごとに PR とし、複数 Unit・工程記録・無関係リファクタを単一 PR に束ねない(team.md § Way of Working)。
- **C-9(walking-skeleton ゲート)** — scope は `self-feature` であり、最初の Construction Bolt に walking-skeleton ゲートを維持する(project.md Mandated)。walking skeleton 候補は「semi 質問1件が5段で解決されるエンドツーエンド」(`intent-backlog.md` シーケンシング、段数は RE 実測により訂正済み)。
- **C-10(リリース経路)** — バージョンバンプ・タグ・publish は release.yml の workflow_dispatch のみが行う。本 intent の PR ではバージョン面に触れない。

---

## Assumptions

- **A-1** — 患部ファイルの行番号は HEAD `17a1a7422` と codekb observed `2f255bc69` で同値である。**根拠**: `code-structure.md` 現在節「区間内の行シフト(患部ファイル別)」が `amadeus-intent-autonomy.ts` / `amadeus-stop.ts` / `amadeus-utility.ts` / `amadeus-orchestrate.ts` / `amadeus-statusline.ts` / `t431` / `t121` を「区間内無変更(行シフト 0)」と実測し、本文書が起草時に HEAD で再実測して同値を確認した。**残る5ファイル**(`amadeus-bolt.ts` / `amadeus-intent-autonomy-production.ts` / `amadeus-intent-autonomy-runtime.ts` / `amadeus-advisory-choice.ts` / `amadeus-directive.ts`)は codekb の行シフト表に載っていないため、本文書の引用はすべて **HEAD `17a1a7422` での直接実測**であり observed 断面の転記ではない。特に `amadeus-bolt.ts` は区間内で `:961` 以降が +96 シフトしている(`code-structure.md` 現在節)ため、observed 断面の行番号を引かないこと。
- **A-2** — `--autonomy` はコード面に一切結線されていない。**根拠**: `grep -rn -- "--autonomy" packages tests docs scripts specs plugins contrib` → 0 hit(HEAD 実測)。repo 全体の 51 hit は全件が本 intent の record・codekb・elections 配下である(`grep -rl` のディレクトリ集計出力からの転記)。
- **A-3** — `semi` 関与テストは実質 13 ファイルである。**根拠**: `grep -rln "semi" tests/ --include="*.ts" | wc -l` → 14、うち `tests/unit/t97.test.ts` は `semicolon` の部分一致(`code-structure.md` 現在節が未確定事項として解消済み)。**未検証**: 13 ファイルの現況グリーン性は未実行である(`inception/reverse-engineering/memory.md:23` の未確定③)。code-generation の着手時にベースラインを実測すること。
- **A-4** — semi の phase 内 auto-approve が `phase_boundary` directive を受け取らないことは**実 run 未検証**である(`inception/reverse-engineering/memory.md:23` の未確定①)。FR-LAD-5 の受け入れ基準はこの保証をテストで初めて固定する。
- **A-5** — unreviewed queue の受け皿(`amadeus-autonomy-review.ts` / `amadeus-autonomy-review-production.ts`)は区間内新規であり、base 時点には存在しなかった(`inception/reverse-engineering/memory.md:22`)。semi の unreviewed 件数がこの受け皿で検収可能であることは FR-LAD-4 の受け入れ基準で確認する。
- **A-6** — advisory の選択肢は2値のままである(`tools/amadeus-advisory-choice.ts:25-28`)。第2経路の新設は選択肢集合を増やさない。

---

## Out of scope

`scope-document.md` Out を正本とする。

- walking skeleton / phase 境界 / Intent 終端の semi 自動化(ユーザー裁定 2026-08-05: semi = full − 節目)
- 旧 semi 挙動の互換モード・フォールバック・移行シム・二重実装(後方互換なし — 置き換えのみ。org.md Forbidden)
- `--autonomy full --confirmed-display-digest` によるワンショット発行(#2253 代替案5で非採用)
- FR-GRT-004 の変更(semi は current grant = null を維持)
- `AUTONOMOUS_BLOCK_CAP`(= 8)および `stopBudgetMode` の3値の変更
- `isFullyAutonomousIntent` の `:457`(compose gate)・`:716`(conversational)呼び出し点を semi へ開くこと(FR-STOP-1)
- `InteractionKind` への `advisory-choice` 追加(Q4 選択肢 C — scopeFingerprint 互換の棚卸しが本 intent の射程を広げるため非採用)
- `run_required: true` advisory の無人 `defer-with-risk`(Q4 選択肢 B 非採用)
- autonomy 以外の経路による advisory 自動選択(Q4 選択肢 E 非採用 — `AUTO_DECIDED` 監査の外側に入口を作らない)
- `Construction Autonomy Mode` 互換投影の見直し(C-4)
- #1647(approve-batch の human-presence guard)・#1241(外部人間ゲート待ち)は別 Issue のまま
- 段数を unreviewed 累積件数で動的に決める機構(Q3 選択肢 E 非採用)
- 旧テストの skip 化による旧仕様ピンの温存(Q6 選択肢 E 非採用)

---

## Open questions

後続ステージへ残す未解決点。いずれも本要件の合否を左右しないが、設計段で確定を要する。

- **OQ-1(application-design)** — 新設 authorization 型(FR-AUTH-1)の名称と、`DecisionAuthorization` 判別ユニオンへの載せ方。既存 `semi-mode-gate`(`amadeus-intent-autonomy.ts:516`)との関係(置換か併存か)を ADR で決める。併存させる場合は org.md Forbidden の二重実装に当たらない根拠を ADR の Consequences に書く。
- **OQ-2(application-design)** — FR-POL-2 の digest 拡張が replay 互換に与える影響。既存の非 full `set-mode` 監査ブロックが拡張後の replay で復元できることを設計段で確認する(既存 journal の後方互換は「互換レイヤの新設」ではなく replay の入力受理範囲の問題として扱う)。
- **OQ-3(functional-design)** — FR-STOP-1 の述語分割の形(引数追加か関数分割か改名か)。改名を選ぶ場合の同期対象は `tests/.coverage-patch-allowlist.json:5268` と `tests/unit/t147-kiro-hook-adapter.test.ts:723`。
- **OQ-4(units-generation / delivery-planning)** — `intent-backlog.md` の P1〜P7 と本要件の FR 群の対応付け、および Bolt 分割。P7(advisory)は P1/P2 に依存する。
- **OQ-5(nfr-design)** — FR-DISP-1 の statusline 表示形式(既存行の拡張か新規行か)と、幅制約下での省略規則。
- **OQ-6(code-generation)** — `run_required: true` の強制実行(FR-ADV-4)を実装する層。guard 側(`guardAdvisoryChoices`)か directive 検証側(`amadeus-directive.ts:684-688`)か、両方か。plugin 非依存でない事実(FR-ADV-5)との整合を実装時に確認する。

---

- **OQ-ADV-K**(application-design へ)— FR-ADV-1 が advisory の選択を `kind: "question"` の occurrence へ写像する設計としたが、その写像が FR-AUTH-1 の semi 専用 authorization 型の scope 認可(許可する occurrence 種別の集合)および `selector` の一意化規約と整合するかは未設計。§12a reviewer(iteration 1、FOLLOW-UP)の指摘により明示。

## トレーサビリティ

すべての FR/NFR は `intent-statement.md` の Success Metrics および `scope-document.md` の In 項目へ遡れる。

| 要件 | intent-statement Success Metric | scope-document In |
| --- | --- | --- |
| FR-AUTH-1 / FR-AUTH-2 | `:20`(semi の質問が無人解決で解決される)/ `:24`(`resolveAutoDecision:702` の改訂) | In-1 |
| FR-AUTH-3 | `:25`(後方互換なし)/ Out(FR-GRT-004 維持) | In-1 / Out |
| FR-LAD-1 / FR-LAD-2 / FR-LAD-3 | `:20` / `:24`(`createGateAutoDecision:667` の改訂) | In-1 |
| FR-LAD-4 | `:20`(`AUTO_DECIDED` + unreviewed queue に記録) | In-1 |
| FR-LAD-5 | `:21`(walking skeleton / phase 境界 / Intent 終端は人間裁定のまま) | Out 冒頭 |
| FR-LAD-6 | `:21` / #2253 完了条件(走行単位の主張の限定) | In-5 |
| FR-STOP-1 | `:24`(`amadeus-stop.ts` の質問 carve-out 述語) | In-1 |
| FR-STOP-2 | `:24` / Out(stop 継続予算不変) | In-5 / Out |
| FR-POL-1 / FR-POL-2 | `:20`(方針なしは縮退 = 方針ありの経路が要る) | In-3 |
| FR-POL-3 | `:24`(`--policies-file` 無音破棄の loud 化) | In-3 |
| FR-CLI-1 / FR-CLI-2 / FR-CLI-3 | `:22`(`/amadeus --autonomy semi\|full` が動作、semi は即時設定) | In-2 |
| FR-CLI-4 | `:22`(full は grant 実在時走行・不在時 fail-closed 停止、**落ちる実証**) | In-2 / In-6 |
| FR-CLI-5 | `:22`(semi は即時設定 — provenance 要求は緩めない) | In-2 |
| FR-DISP-1 / FR-DISP-2 | #2067 旧本文の残余(同一語彙の表示) | In-4 |
| FR-ADV-1 〜 FR-ADV-5 | — (追加裁定 2026-08-05T06:03Z) | In-7 |
| FR-PIN-1 / FR-PIN-2 / FR-PIN-3 | `:23`(旧仕様ピンの明示改訂: `t431:313`、`t121:1138`) | In-5 |
| FR-DOC-1 / FR-DOC-2 | `:23`(docs 11 ファイル → 実測 22 = 11 対訳ペアへ訂正) | In-5 |
| NFR-1 / NFR-6 | `:22`(**落ちる実証**で回帰固定) | In-6 |
| NFR-2 | `:20`(`AUTO_DECIDED` + unreviewed queue) | In-1 |
| NFR-3 | `:22`(起動宣言の CLI 契約) | In-2 |
| NFR-4 / NFR-7 | `:26`(実装面の完全性) | In-1〜In-7 全般 |
| NFR-5 | `:23`(日英対訳同時)/ project.md Mandated | In-5 |

---

## 留保の転記(E-SRA-RA1、per-voter 7件)

`cid:requirements-analysis:citation-reservation-preservation` / `cid:requirements-analysis:reservation-transcription-count-check` に基づく逐語転記。留保必須票(GoA 2)は2票、転記件数 7 件(Q1×1 / Q3×2 / Q4×4)。

| # | 問 | 投票者 | 逐語 | 反映先 |
| --- | --- | --- | --- | --- |
| R1 | Q1 | subagent-2 | 「選択肢 A の欠点記述「modeProvenance は認可の器としては意味を拡張することになる」は過大評価である — `modeProvenance` は既に semi の認可述語(`amadeus-intent-autonomy.ts:512` の `projection.modeProvenance.kind !== "human-command"`、`:516` の `kind: "semi-mode-gate"`)かつ裁定 principal の供給元(`:602-604`)として機能している。B を採る理由は「A が不可能だから」ではなく「3責務を単一の型で明示でき `:702` の緩和が単一述語に閉じるから」と書き直すこと。」 | FR-AUTH-1「採用理由の明記」 |
| R2 | Q3 | subagent-1 | 「承認済み上流(`scope-document.md:11` と `intent-statement.md:20`)がともに逐語「無人解決4段(方針なしは3段縮退)」と書いており、5段は RE の実測訂正(`inception/reverse-engineering/memory.md:8`)に基づく**訂正**である。requirements にこの訂正申告段落を置かないと無申告逸脱になる。」 | §訂正申告 申告1 |
| R3 | Q3 | subagent-1 | 「In-1 が名指す `isFullyAutonomousIntent`(`amadeus-stop.ts:167-178`)は質問 carve-out(`:422`)だけでなく compose stop(`:457`)・conversational stop(`:716`)からも共有されており、無条件の書き換えは Q3=A が「不変」と主張する範囲外まで semi へ開く。**変更する呼び出し点を要件で列挙すること**。」 | FR-STOP-1 の呼び出し点表(3点)+ §Out of scope |
| R4 | Q4 | subagent-1 | 「第2 receipt 経路は fail-closed を受け入れ基準で固定すること — 現行の人間経路保証(`amadeus-advisory-choice.ts:864-868` の humanTurn 必須 + `:852-861` の監査 HUMAN_TURN 照合)を autonomy 認可成立時のみ `AUTO_DECIDED` basisFingerprint で代替し、**認可不成立時に第2経路へ落ちない**ことを落ちる実証込みで要求する。」 | FR-ADV-2 |
| R5 | Q4 | subagent-2 | 「重複排除キー(`:875-878`)と提示照合(`:889`)も humanTurn 依存であり「2ファイルに閉じる」は過小評価。並存させると org.md Forbidden の二重実装に抵触するため**置換**とすること。」 | FR-ADV-3(測定注記付き) |
| R6 | Q4 | subagent-2 | 「`run_required: true` の「強制実行のまま維持」は現行コードの追認ではない — `runRequired` は `:730` の `runRequired: formalChecks.length > 0` から導出され、`amadeus-directive.ts:684-688` は非空 `formal_checks` を要求するのみで defer-with-risk を禁じる強制は現行コードに無い。**新規要件化事項**として要件文へ明示すること。」 | FR-ADV-4「新規性の明示」 |
| R7 | Q4 | subagent-2 | 「`formalCheckRoute:685` が `plugins/formal-model-check/tools/run-model-check.ts` をハードコードするため、`run_required` 経路は plugin 非依存でない。In-7 の plugin 非依存主張は **hold 判定の面に限る**と射程を明記すること。」 | FR-ADV-5 |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-05T06:44:28Z
- **Iteration:** 1
- **Scope decision:** none

必須7節はすべて実在し、Q1〜Q6 の裁定と留保7件(Q1×1 / Q3×2 / Q4×4)は per-voter で逐語一致、非採用案の固有トークン混入もない。「4段→5段」の訂正は §訂正申告 申告1 として明示申告されており、全 FR/NFR が scope-document の In-1〜In-7 と intent-statement の Success Metrics へ辿れる。BLOCKER はゼロで、残る指摘は引用範囲の off-by-one・出所不明の件数・機械照合面の未指定という FOLLOW-UP 級である。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/requirements-analysis/requirements.md:80 — FR-LAD-1 の semi 分岐引用 :511-514 が同 FR 内の :512 ピンおよび codekb architecture.md:66 の :510-514 と自己矛盾。:510-513 または :510-514 へ揃える
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/requirements-analysis/requirements.md:120 — isFullyAutonomousIntent の範囲 :167-176 が codekb architecture.md:181 の実測 :167-178 と不一致。確定するか差分理由を1行添える
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/requirements-analysis/requirements.md:212 — FR-DOC-2 の「on-disk ミラー 14 本」の出所が code-structure.md 現在節に存在しない。集計コマンド出力からの転記へ差し替えるか件数語を削る
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/requirements-analysis/requirements.md:257 — A-1 の「HEAD と observed で同値」の根拠が7ファイル分しかなく、amadeus-bolt.ts ほか5ファイルの測定基礎が未記載。特に amadeus-bolt.ts は区間内 +96 シフト
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/requirements-analysis/requirements.md:188 — FR-ADV-1 に無人裁定で用いる occurrence 種別の指定がない。採用された Q4 選択肢 A 本文の「question 相当の occurrence を組み」が要件化で落ちている
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/requirements-analysis/requirements.md:52 — Intent analysis 4 の plugin 非依存の主張が無限定で、自文書の FR-ADV-5 AC(射程注記の併記)を満たしていない
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/requirements-analysis/requirements.md:114 — FR-LAD-6 と FR-ADV-5 の AC が「記述が無いこと」をレビュー観点に留め、機械判定面(対象面+検索語)が未指定
- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/requirements-analysis/requirements.md:318 — トレーサビリティ表の列名が Success Metric だが FR-DISP 行の出所は Problem Statement
- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/requirements-analysis/requirements.md:128 — FR-STOP-1 の受け入れ基準で (2) が重複採番
