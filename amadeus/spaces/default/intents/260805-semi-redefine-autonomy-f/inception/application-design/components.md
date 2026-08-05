# Components — semi 再定義と `--autonomy` 起動宣言(#2253)

上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md

本文書は上記3成果物を次のとおり実参照する。`requirements.md` の FR-AUTH-1〜3 / FR-LAD-1〜6 / FR-STOP-1〜2 / FR-POL-1〜3 / FR-CLI-1〜5 / FR-DISP-1〜2 / FR-ADV-1〜5 / FR-PIN-1〜3 / FR-DOC-1〜2 と NFR-1〜7、Constraints C-1〜C-10、Open questions OQ-1 / OQ-2 / OQ-3 / OQ-5 / OQ-6 / OQ-ADV-K を**設計対象の正本**とし(§コンポーネント一覧の「充足 FR」列がその写像)、`architecture.md` 現在節「承認・裁定経路の現行トポロジ」「無人裁定梯子は5段(4段ではない)」「semi を梯子へ載せるときの最小介入点」「stop hook 側の非対称」「`--autonomy` 起動フラグの結線余地」「mode の値域と永続化3面」「`--policies-file` の無音破棄」を境界画定の根拠とし(§既存境界の再確認)、`component-inventory.md` 現在節「焦点コンポーネント」表(10 ファイル)と「区間内で追加されたコンポーネント」表(`amadeus-autonomy-review*.ts` 計 1757 行)を**改訂面の全数と隣接面の根拠**とする(§Reuse Inventory・§下流受け皿)。

---

## 測定 ref と引用規律

- 本文書の file:line・件数はすべて **worktree HEAD `974dbf9bcce117a510605b12c20c50e317883566`**(`git rev-parse HEAD` の出力からの転記)での起草時実測である(`cid:reverse-engineering:measurement-ref-in-artifacts`)。
- **§12a レビュー iteration 1 の是正で追加した引用・数値の測定 ref は `d405e34c5b8e42b4acd43fea7535d5199d6816fd`**(是正時点の `git rev-parse HEAD` からの転記)。両断面の同値性は `git diff --stat 974dbf9bc HEAD -- packages/framework/core/` が**空出力**であることで確認したため、既存の file:line 引用は是正後もそのまま成立する。
- `requirements.md` の測定 ref は `17a1a7422` である。両断面の同値性は `git diff --stat 17a1a7422 HEAD -- <患部11ファイル>` が**空出力**(区間 3 commits、患部ファイル無変更)であることで確認した。したがって requirements の file:line 引用は本文書でもそのまま成立する。
- 機構引用には verbatim 断片を併記する(`cid:requirements-analysis:verbatim-quote-with-cite`)。件数はコマンド出力からの転記のみとする(`cid:requirements-analysis:numbers-from-command-output-only`)。
- 行番号は canonical 側 `packages/framework/core/` を記す。`dist/` とセルフインストールツリーは生成物であり編集対象ではない(NFR-5、C-5)。

---

## 既存境界の再確認(設計の出発点)

`architecture.md` 現在節「承認・裁定経路の現行トポロジ」が実測したとおり、autonomy は**2つの独立した関門**を通る。本設計はこの2関門構造を**維持**し、関門の内側の判定基体だけを差し替える。

| 関門 | 現行の所有者 | 現行の判定 | 本設計での変更 |
| --- | --- | --- | --- |
| 第1関門(認可) | `authorizeInteraction`(`amadeus-intent-autonomy.ts:501-531`) | mode 別に occurrence を通す/弾く | semi 分岐が `question` を通す(FR-LAD-1)。返す認可基体を新型へ差し替え(FR-AUTH-1) |
| 第2関門(選択) | `selectDecision`(`amadeus-intent-autonomy-runtime.ts:522-524`)→ `resolveAutoDecision`(`amadeus-intent-autonomy.ts:699-744`) | `full` grant の `question` のみ5段梯子 | 認可基体が解決できた occurrence を梯子へ渡す(FR-AUTH-2 / FR-LAD-2) |
| 効果適用(安全弁) | `applySemiDecision`(`amadeus-intent-autonomy-runtime.ts:546-554`) | `workflow-reversible` 以外を拒否 | **緩めない**(FR-LAD-5)。判定を新型のコンパニオン関数へ移すが述語は同値 |

`architecture.md` 現在節「semi を梯子へ載せるときの最小介入点」が挙げる3点(`:510-514` / `:522-524` / `:667-673`)に加え、同節が「**この1行の条件そのものを緩める必要がある**」と名指す `:702` を第4の介入点として明示する。本設計の主コンポーネント C1〜C5 はこの4点に対応する。

### 設計時に確認した非対称(要件に未記載の実測)

`authorizeInteraction:511`(verbatim `    const internalGate = occurrence.kind === "stage-gate" && occurrence.phase !== "phase-boundary";`)の `occurrence.phase !== "phase-boundary"` は、**書き手不在の読み側**である。

- 実測: `grep -rn "phase-boundary" tests packages/framework/core` → コード面のヒットは `amadeus-intent-autonomy.ts:511` の 1 件のみ。`occurrence.phase` に `"phase-boundary"` を書き込む生産者は repo 内に存在しない。
- 本番の phase 境界は `interactionKind`(`amadeus-intent-autonomy-production.ts`、verbatim `  return input.phaseBoundary ? "phase-gate" : "stage-gate";`)により **`kind: "phase-gate"`** として表現され、`internalGate` の第1項 `occurrence.kind === "stage-gate"` で弾かれる。
- これは `requirements.md` A-4(「semi の phase 内 auto-approve が `phase_boundary` directive を受け取らないことは実 run 未検証」)の**機構的説明**である。設計上は「phase 境界の遮断は `kind` 側が担っており、`phase` 文字列側は防御的冗長」と結論する。
- 本設計は `:511` の第2項を**削除しない**(FR-LAD-5 の保守側。`cid:requirements-analysis:symmetric-pair-review` の対として、書き手不在の読み側を残す判断を明示する)。

---

## コンポーネント一覧

行数は **新規行 + 改訂行の見積り**(`phases/inception.md` §Architecture Standards の数値必須要件)。既存関数の行内改訂は「改訂」に数える。

| # | コンポーネント | 所在(正本) | 責務 | 公開 API 面 | 新規/改訂 | 推定行数 | 充足 FR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | `SemiAuthority`(型 + コンパニオン) | `core/tools/amadeus-intent-autonomy.ts` | semi の認可基体。**(a) scope 認可 (b) effect 認可 (c) authorityFingerprint 供給**の3責務のみ | `type SemiAuthority` / `SemiAuthority.of(projection, scope)` / `SemiAuthority.allowsOccurrence` / `SemiAuthority.authorizeEffect` / `SemiAuthority.fingerprint` | 新規 | 75 | FR-AUTH-1 |
| C2 | `DecisionAuthority`(認可基体の統一ビュー) | 同上 | 第1関門の結果から梯子入口が必要とする最小事実(scope/norm fingerprint、policies、authorityFingerprint)を判別ユニオンで供給 | `type DecisionAuthority` / `decisionAuthorityOf(authorization)` | 新規 | 50 | FR-AUTH-2 |
| C3 | `authorizeInteraction` の semi 分岐 | 同上 `:501-531` | mode 別の occurrence 認可。semi は `SemiAuthority` を返す | 既存 export(戻り型の union が変わる) | 改訂 | 20 | FR-LAD-1 / FR-AUTH-1 |
| C4 | `resolveAutoDecision` の入口と confirmed-policy 段 | 同上 `:699-744`(confirmed-policy 段は `:637-656`) | 5段梯子。入口を単一述語化し、policies を authority から取る | 既存 export(入力に `authority` を追加) | 改訂 | 30 | FR-AUTH-2 / FR-LAD-4 / FR-POL-1 |
| C5 | `createGateAutoDecision` の入口ガード | 同上 `:666-689` | gate 系裁定の生成。question 誤配線を fail-closed で検出しつつ、梯子経由の question は通す | 既存 export | 改訂 | 15 | FR-LAD-3 |
| C6 | `selectDecision` / `decide` のルーティング | `core/tools/amadeus-intent-autonomy-runtime.ts:500-545` | 認可基体 × occurrence 種別で「梯子」か「gate 即決」かを振り分ける | モジュール内部(`decide` 経由で公開) | 改訂 | 25 | FR-LAD-2 |
| C7 | `applySemiDecision` の effect 認可委譲 | 同上 `:546-554` | semi の効果適用。判定を C1 のコンパニオンへ委譲(述語は同値) | モジュール内部 | 改訂 | 12 | FR-LAD-5 |
| C8 | semi 方針の担体(`semiPolicies`) | `core/tools/amadeus-intent-autonomy.ts:165-178`(`AutonomyProjection`)/ `:250-257`(`HumanAutonomyCommand`)/ `:340-395`(`planHumanAutonomyCommand`) | semi の事前裁定方針の永続化。`set-mode` が方針を運ぶ | `HumanAutonomyCommand` の `set-mode` に `policies` を追加 | 改訂 | 45 | FR-POL-1 / **FR-AUTH-3** |
| C9 | 非 full コマンド準備と確認 digest | `core/tools/amadeus-intent-autonomy-production.ts:382-395` / `:417` | `prepareNonFullCommand` が policies を受け、digest を方針込みへ拡張 | モジュール内部(`applyProductionAutonomyMode` 経由で公開) | 改訂 | 40 | FR-POL-2 |
| C10 | `handleSetAutonomy` の loud 化 | `core/tools/amadeus-bolt.ts:1051-1092` | `--mode none --policies-file` を loud エラーで停止 | CLI 契約 | 改訂 | 14 | FR-POL-3 |
| C11 | stop hook 述語の分割 | `core/hooks/amadeus-stop.ts:167-178` | 質問 carve-out 述語(semi + full)と full 限定述語を分ける | モジュール内部(呼び出し3点) | 改訂 | 28 | FR-STOP-1 / **FR-LAD-6**(開くのは `:422` の質問面のみ = 走行単位の主張を「質問で止まらない」に限定する構造面) |
| C12 | `--autonomy` フラグ parser | `core/tools/amadeus-orchestrate.ts:1044-1074` | **3値**(`none`/`semi`/`full`)の受理・値の consume・値省略の捕捉 | `parseNextFlags` の `ParsedFlags` | 改訂 | 24 | FR-CLI-1 / FR-CLI-2 / NFR-3 |
| C13 | `--autonomy` 適用ハンドラ | 同上(`handleNext` の Branch 群) | 値域検査、**`none` の active grant 実在チェック**、再宣言の意味論、full の fail-closed、provenance 要求の踏襲、**directive 値域との非同一視** | engine directive 面(error / print) | 新規 | 75 | FR-CLI-2 / FR-CLI-3 / FR-CLI-4 / FR-CLI-5 / C-3 |
| C14 | statusline の Autonomy セグメント | `core/hooks/amadeus-statusline.ts:256-322` | mode 語彙の表示 | statusline 出力(1 行) | 改訂 | 20 | FR-DISP-1 / OQ-5 |
| C15 | `--status` の Policies 行 | `core/tools/amadeus-intent-autonomy-runtime.ts:766-780`(status envelope)+ `:782-799`(`projectIntentAutonomyStatus`)/ `core/tools/amadeus-utility.ts:336-350` | policy 数を grant 非依存で供給・表示 | `IntentAutonomyStatusEnvelope` に `policyCount` を追加 | 改訂 | 14 | FR-DISP-2 |
| C16 | advisory の無人裁定 resolver | `core/tools/amadeus-advisory-choice.ts`(新関数)+ `core/tools/amadeus-orchestrate.ts:781-800` | hold verdict を occurrence へ写像し、autonomy 梯子で選択を決める | `resolveAdvisoryChoiceAutonomously(...)` | 新規 | 95 | FR-ADV-1 / FR-ADV-2 / FR-ADV-4 / **FR-ADV-5**(`formalCheckRoute` の実行コマンドに触れない = 射程の限定側) |
| C17 | advisory receipt の provenance ユニオン | `core/tools/amadeus-advisory-choice.ts:54-64`(`AdvisoryChoiceReceipt`)/ `:864-900`(`recordProtectedAdvisoryChoice`) | 受理の3点(grounding / 重複排除 / 提示照合)を provenance 抽象へ載せ替え。store schema を 2 へ | `AdvisoryChoiceProvenance` / `recordAdvisoryChoice(...)` | 改訂 | 80 | FR-ADV-3 |
| C18 | 旧仕様ピンと文書 | `tests/unit/t431-intent-autonomy.test.ts:307-313` / `tests/integration/t121-stop-hook-enforce.test.ts:1138-1150` / `docs/`(22 ファイル)/ `core/amadeus-common/protocols/stage-protocol.md`(9 行) | 旧 semi 定義の明示改訂 | — | 改訂 | **非コード 29 行 + docs 22 ファイル**(内訳は下記) | FR-PIN-1〜3 / FR-DOC-1〜2 / **FR-LAD-6**(docs へ「phase を完走する」と書かないこと) |

**C18 の非コード内訳**(区間行数の機械合計、測定 ref `d405e34c5`): `t431-intent-autonomy.test.ts:307-313` = 7 行 + `t121-stop-hook-enforce.test.ts:1138-1150` = 13 行 + `stage-protocol.md` の semi 言及 9 行(`grep -c -i "semi" packages/framework/core/amadeus-common/protocols/stage-protocol.md` → `9`)= **29 行**。`docs/`(22 ファイル = 11 対訳ペア)の1ファイルあたり改訂行数は**未実測**であり、行数見積りに数えない(⚠ functional-design での実測が確定条件)。

**コード面の合計見積り: 新規 295 行(C1 75 + C2 50 + C13 75 + C16 95)/ 改訂 367 行(C3 20 + C4 30 + C5 15 + C6 25 + C7 12 + C8 45 + C9 40 + C10 14 + C11 28 + C12 24 + C14 20 + C15 14 + C17 80)= 662 行**(表の推定行数からの機械合計。C18 はテスト・docs でありコード行に数えない)。C-8(Bolt ごとに PR)と `cid:units-generation:c1` に照らし、この規模は units-generation で 6〜7 Unit へ分割できる粒度である(分割案は component-dependency.md §Unit 分割の示唆)。

---

## コンポーネント責務と境界(詳細)

### C1 `SemiAuthority` — semi の認可基体

**所有するもの**: semi mode 下で「この occurrence を自動裁定してよいか」「この効果を適用してよいか」「裁定の基体は何か」の3つの答え。

**所有しないもの**(FR-AUTH-1 が明示的に禁じる4つ目の責務):

- TTL / 有効期限
- revoke 状態(`IntentGrantState`)
- 発行 principal の儀式(`confirmedDisplayDigest` 照合、`issuanceDigest`、`grantId` の採番)

grant(`IntentGrant`、`amadeus-intent-autonomy.ts:131-139`)はこの3つをすべて持つ。`SemiAuthority` は持たない。両者が別の型である理由がこの差分である。

**形(functional-domain-modeling-ts スタイル)**: `type` + コンパニオンオブジェクト、スマートコンストラクタ、判別ユニオン Result。

```
export type SemiAuthority = {
  readonly kind: "semi-authority";
  readonly intentUuid: string;
  readonly scope: SemiAuthorityScope;          // (a) scope 認可
  readonly policies: readonly DecisionPolicy[]; // 梯子 0 段目の材料
  readonly authorityFingerprint: string;        // (c) basisFingerprint 供給
};
```

`(b) effect 認可`は**フィールドではなくコンパニオン関数**として持つ。フィールド化すると「許可する効果分類」を後から書き換えられる余地が生まれ、FR-LAD-5(不可逆効果は semi では通さない)の不変性が型の外へ漏れるためである。

```
SemiAuthority.authorizeEffect(authority, effect, currentNormFingerprint)
  : { ok: true; effect } | { ok: false; reason: "semi-gate-effect-not-authorized" }
```

述語の中身は現行 `applySemiDecision:552-553`(verbatim `    if (effect === null || effect.classification !== "workflow-reversible" ||` / `      effect.applicableNormFingerprint !== input.currentNormFingerprint) {`)と**同値**である。移設であって緩和ではない。

**scope の中身**: `SemiAuthorityScope = { intentUuid, scopeId, scopeFingerprint, normFingerprint, allowedInteractionKinds }`。`allowedInteractionKinds` は `SEMI_ROUTINE_INTERACTIONS = ["stage-gate", "question"]` の凍結定数とし、`"walking-skeleton"` と `"phase-gate"` を**含めない**。これが FR-LAD-5(節目は人間裁定)の scope 側の表現である。`GrantScopeDescriptor` の `permissionBoundaryFingerprint` / `prohibitedEffects` は持たない(それらは grant の発行儀式に属する)。

**fingerprint の合成**: `authorityFingerprint = autonomyDigest({ modeProvenance, scopeFingerprint, policySetDigest })`。現行 `createGateAutoDecision:686-688`(verbatim `    basisFingerprint: autonomyDigest(input.basisKind === "mode-semi"` / `      ? input.projection.modeProvenance` / `      : input.projection.currentGrant),`)が mode-semi に対して用いている `autonomyDigest(modeProvenance)` の**拡張**であり、方針集合を含める点だけが差分である(FR-POL-2 と同じ方向)。

### C2 `DecisionAuthority` — 梯子入口の単一述語

`resolveAutoDecision` は現在 `projection.currentGrant` を関数内で読み(`:701` verbatim `  const grant = projection.currentGrant;`)、`mode !== "full" || grant === null` で弾く(`:702`)。この2つの関心(mode 判定 + grant 取得)を呼び出し側へ押し出し、梯子は「認可基体を受け取ったか否か」だけを見る。

```
export type DecisionAuthority =
  | { readonly kind: "grant"; readonly grantId: string; readonly scope: GrantScopeDescriptor; readonly policies: readonly DecisionPolicy[]; readonly authorityFingerprint: string }
  | { readonly kind: "semi"; readonly scope: SemiAuthorityScope; readonly policies: readonly DecisionPolicy[]; readonly authorityFingerprint: string };

export function decisionAuthorityOf(
  authorization: Exclude<DecisionAuthorization, { readonly kind: "human-required" }>,
): DecisionAuthority;                                    // 内部呼び出し(構造的に非 null)
export function decisionAuthorityOf(
  authorization: DecisionAuthorization,
): DecisionAuthority | null;                             // 公開境界(human-required → null)
```

**引数は `authorization` の1つのみ**で `projection` を取らない(component-methods.md §C2 と同一シグネチャ — 本項が正本)。理由: 認可 payload 側が scope / policies / authorityFingerprint を運ぶよう C2 で拡張するため、projection を再度読む必要が構造的に無い。projection を引数に残すと「payload と projection のどちらが正か」の判断が呼び出し点へ散る。

**オーバーロードの2層構造**(F6 の型不整合の解消 — component-methods.md §C6 に対応):

- 内部呼び出し(`selectDecision`)は `human-required` を**構造的に受け取らない**。`decide`(`amadeus-intent-autonomy-runtime.ts:603-615`)が `selectDecision` 呼び出し(`:611` verbatim `    const selected = selectDecision(projection, input, authorization);`)より**先**に `:607-610`(verbatim `    if (authorization.kind === "human-required") {`)で早期 return するためである。したがって `selectDecision` の引数型を `Exclude<DecisionAuthorization, { kind: "human-required" }>` へ絞れば、`decisionAuthorityOf` は非 null を返し C5 の非 null 契約(`authority: DecisionAuthority`)と型が合う。
- `resolveAutoDecision` は **export された関数**であり、内部呼び出し以外(テスト・将来の呼び出し元)から `null` を渡されうる。FR-AUTH-2 が要求する入口の単一述語 `if (input.authority === null)` は、この公開境界の fail-closed として実在の意味を持つ(死んだ分岐ではない)。ただし `decide` 経由では到達しないため、**落ちる実証は `resolveAutoDecision` の直接呼び出しテストで行う**(⚠ この点を functional-design のテスト設計へ申し送る)。

改訂後の `resolveAutoDecision` 入口は次の1行に閉じる(FR-AUTH-2 の「単一述語」):

```
if (input.authority === null) return { kind: "invalid", reason: "authorization-required" };
```

`mode !== "full"` の直接比較は関数本体から消える(FR-AUTH-2 の受け入れ基準の grep 対象)。`resolveConfirmedPolicy`(`:637-656`)は `grant: IntentGrant` 引数を `authority: DecisionAuthority` へ差し替え、`policy.scopeFingerprint === authority.scope.scopeFingerprint` の照合はそのまま残す。

### C3 `authorizeInteraction` の semi 分岐

改訂後の判定順(現行の構造を保つ):

1. `projection.intentUuid` 不一致 / `workflowExecutionState !== "running"` → `human-required: SCOPE_OUT`(不変)
2. `mode === "none"` → `human-required: MODE_REQUIRES_HUMAN`(不変)
3. `mode === "semi"`:
   - `projection.modeProvenance.kind !== "human-command"` → `human-required: MODE_REQUIRES_HUMAN`(**不変** — FR-LAD-1 が明示的に維持を要求)
   - `SemiAuthority.allowsOccurrence(authority, occurrence)` が false → `human-required: SCOPE_OUT`
   - それ以外 → `{ kind: "semi-authority", occurrence, authority, projectionRevision }`
4. `mode === "full"` → 現行どおり `full-grant`(不変)

`allowsOccurrence` の中身は「`scope.intentUuid` 一致 かつ `scope.allowedInteractionKinds.includes(occurrence.kind)` かつ `occurrence.phase !== "phase-boundary"`」。第3項は §既存境界の再確認 で述べた防御的冗長を保存したものである。現行の `scopeAllows`(`:496-499`、verbatim は `:498` の `    grant.scope.allowedInteractionKinds.includes(occurrence.kind);`)と同形であり、grant / semi の両方に効く共通述語へ一般化する。

**`semi-mode-gate` は削除する**(置換であり併存ではない — ADR-1)。C-7(後方互換なし)と org.md Forbidden(二重実装禁止)に従う。

### C4〜C7 梯子とルーティング

改訂後の `selectDecision` の分岐(FR-LAD-2):

| 認可 | occurrence.kind | 経路 | basisKind |
| --- | --- | --- | --- |
| `semi-authority` | `question` | `resolveAutoDecision`(5段) | `confirmed-policy` / `norm` / `history` / `solo-election` / `agent-recommendation` |
| `semi-authority` | `stage-gate` | `createGateAutoDecision` | `mode-semi` |
| `full-grant` | `question` | `resolveAutoDecision`(5段) | 同上 |
| `full-grant` | それ以外 | `createGateAutoDecision` | `grant-gate` |

`decide`(`amadeus-intent-autonomy-runtime.ts:603-615`)の効果適用の振り分けは `authorization.kind === "semi-authority"` → `applySemiDecision`、`full-grant` → `reserveFullDecision` を維持する。**semi は予約2相コミットを使わない**(`reserveFullDecision:574` verbatim `    if (grant === null) return { kind: "conflict", reason: "full-grant-missing" };` — grant を構造的に要求するため)。この非対称は現行どおりであり、本設計は変えない。

`createGateAutoDecision` の入口ガード(C5)は次のとおり改訂する(FR-LAD-3 — throw を単純除去しない):

```
if (input.occurrence.kind === "question") throw new Error("gate-decision-requires-gate-occurrence");
```

はそのまま**残す**。梯子経由の question は `createGateAutoDecision` を通らず `decisionRecord` へ直行するため、この throw は「gate 経路へ question が紛れ込んだ誤配線」の検出器として意味を保つ。改訂するのは第2ガード `input.basisKind === "mode-semi" && input.projection.mode !== "semi"` の周辺で、`basisKind: "mode-semi"` の basisFingerprint を `authority.authorityFingerprint` から取るようにする点のみ。

> **引用の意味論適合の照合**(`cid:application-design:citation-semantics-check`): 本設計は `scopeAllows`(`:496-499`)の様式に倣って `allowsOccurrence` を書く。引用元は**真偽値のみ**を返し、拒否理由を持たない。本設計も同じく真偽値とし、拒否理由は呼び出し側 `authorizeInteraction` が `SCOPE_OUT` として付ける — 引用元と同じ責務分割である(**意図的相違なし**)。一方 `authorizeDecisionEffect`(`:757-770`)は判別ユニオン `EffectAuthorization` で理由を返す様式であり、C1 の `authorizeEffect` はこちらに倣う(**エラー分岐の様式が2つある**ため、どちらに倣うかを明示する)。

### C8〜C10 方針の担体

`AutonomyProjection` に `readonly semiPolicies?: readonly DecisionPolicy[]` を追加する(**任意フィールド**)。任意である理由と replay 互換の扱いは ADR-4 に記す(OQ-2 の裁定)。

- `HumanAutonomyCommand` の `set-mode` に `readonly policies: readonly DecisionPolicy[]` を追加(`:251`)。`revoke-full` の `targetMode` 経路にも同じ policies を通す(`--mode semi` は grant 保有時 `revoke-full` になるため — `prepareNonFullCommand:386-390`)。
- `planHumanAutonomyCommand`(`:340-395`)が `after.semiPolicies` を設定する。`afterMode !== "semi"` のときは `semiPolicies` を**設定しない**(`none` / `full` は semi 方針を持たない)。
- `assertLegalAutonomyProjection`(`:190-207`)に不変条件を1つ追加: **`semiPolicies` が存在するなら `mode === "semi"`**。逆向き(semi なら存在)は要求しない(ADR-4)。
- C10 は `handleSetAutonomy`(`amadeus-bolt.ts:1051`)で `flags.mode === "none" && flags["policies-file"]` を loud エラーにする。現行の `readDecisionPolicyInputs(flags["policies-file"])`(`:1067`)は mode に依存せず読むため、破棄が起きるのは `none` だけになる(`semi` は C8 で受け取るようになる)。

### C11 stop hook 述語の分割

現行 `isFullyAutonomousIntent`(`:167-178`)を2つに分ける。FR-STOP-1 の呼び出し点表に従う。

| 呼び出し点 | 使う述語 | 述語の中身 |
| --- | --- | --- |
| `:422` `isPendingQuestionStop` | 質問 carve-out 述語 | mode が `semi` または `full`。`full` は grant `active` も要求、`semi` は `modeProvenance.kind === "human-command"` に相当する条件を projection から確認 |
| `:457` `isPendingComposeStop` | full 限定述語 | 現行と**完全同値**(mode `full` + grant `active`) |
| `:716` `isConversationalStop` | full 限定述語 | 同上 |

**引数フラグ(`allowSemi: boolean`)にはしない**(ADR-7)。命名の最終形は OQ-3 のとおり functional-design へ委譲するが、**分割する**という形は本設計で確定する。改名を選ぶ場合の同期対象は `tests/.coverage-patch-allowlist.json:5268`(実測 verbatim `      "function": "isFullyAutonomousIntent",`)と `tests/unit/t147-kiro-hook-adapter.test.ts:723` である。

`AUTONOMOUS_BLOCK_CAP`(`:153`)と `stopBudgetMode`(`:157-160`)は**本設計のどのコンポーネントも触れない**(FR-STOP-2)。

### C12〜C13 `--autonomy` 起動宣言

**値域は3値**(`none` / `semi` / `full`)であり、`AutonomyMode`(`amadeus-intent-autonomy.ts:11`、verbatim `export type AutonomyMode = "none" | "semi" | "full";`)と一致させる(FR-CLI-1、ユーザー裁定 2026-08-05)。

C12(parser)は `parseNextFlags` の if/else ladder に `--autonomy` 分岐を足す。`--report`(`:1067-1070`)と同形で値を consume し、値省略を捕捉する分岐を 1 つ添える。NFR-3 に従い parse 関数内に FS 呼び出しを持ち込まない(parser は値域検査すら行わず、文字列を運ぶだけ)。

#### 「設定済み」の判別子は state フィールドではなく `modeProvenance`(ADR-13)

**起草時の実測**(測定 ref `d405e34c5`): state テンプレートは Intent の birth 時点で autonomy フィールドを**必ず書く** — `amadeus-utility.ts:4635` verbatim `- **Intent Autonomy Mode**: none`。

したがって「state に `Intent Autonomy Mode` が無ければ未宣言」という判別は**成立しない**。この判別を採ると、新規 Intent への `--autonomy semi` が常に「設定済み(`none`)かつ異値」と判定されて loud 停止し、FR-CLI-1 / FR-CLI-3 の主用途(起動の一手で走行水準を宣言する)が構造的に成立しない。

**採る判別子は `projection.modeProvenance.kind`** である。根拠(いずれも実読):

| 事実 | 実測 file:line | verbatim |
| --- | --- | --- |
| 初期投影の provenance は `system-default` | `amadeus-intent-autonomy.ts:217-218` | `  const modeProvenance: ModeProvenance = legacy.length === 0` / `    ? { kind: "system-default", targetIntentUuid: input.intentUuid, sourceIdentity: "DEFAULT_MODE_V1", after: "none" }` |
| legacy standing grant 保有時は `legacy-fail-closed`(mode は `none`、診断が mode 選択を推奨) | 同 `:219-224` / `:234-238` | `        kind: "legacy-fail-closed",` / `      recommendedHumanAction: "select-intent-autonomy-mode",` |
| **人間コマンドを通った場合のみ** `human-command` になる(`set-mode` / `issue-full` / `replace-full` / `revoke-full` の全種別で共通) | 同 `:359-360` / `:376` | `    const provenance: ModeProvenance = {` / `      kind: "human-command",` … `      modeProvenance: provenance,` |
| 既存コードが同じ述語を認可の判別に使っている(機構の再利用であって新設ではない) | 同 `:512` | `    if (!internalGate \|\| projection.modeProvenance.kind !== "human-command") {` |

`ModeProvenance` の `kind` の値域は **3値**(`human-command` / `system-default` / `legacy-fail-closed`、`:50-72` の判別ユニオン)であり、`human-command` 以外は「人間がまだ mode を宣言していない」を意味する。よって:

- `kind !== "human-command"` → **未宣言**。`--autonomy <any>` は**初回宣言**として受理し、loud にしない
- `kind === "human-command"` → **宣言済み**。同値なら no-op、異値なら loud(現行方針を維持)

#### 判定順

C13(適用ハンドラ)は `handleNext` 側に置き、次の順で判定する。判定 3 で projection を**1回だけ**読み(`readLaunchAutonomyContext` — component-methods.md §C13)、以降の判定はその1回の読取結果を使う。ADR-12 が定めた `activeGrantState` の3値(`present` / `absent` / `unreadable`)は、この読取結果の `grant` 2値と `kind: "unreadable"` へ**分解して保持**する — 判定内容(読取不能は拒否側へ倒す)は不変であり、変わるのは projection 読取を1回に束ねた点のみである。

| # | 条件 | 戻り | 充足 AC |
| --- | --- | --- | --- |
| 1 | 値省略 | `error`(FR-CLI-2(3)) | FR-CLI-2(3) |
| 2 | 値が3値以外 | `error`(FR-CLI-2(3)) | FR-CLI-2(3) |
| 3 | projection 読取が `unreadable` | `error`(**fail-closed** — 宣言状態も grant 状態も不明なまま書込側へ進まない) | ADR-12 / NFR-6(1) |
| 4 | `modeProvenance.kind !== "human-command"`(**未宣言**) | 判定 6 へ進む(**loud にしない**) | **FR-CLI-1 / FR-CLI-3 の主用途** |
| 5 | 宣言済み(`human-command`)。同値 → `continue`(監査イベントを増やさない)/ 異値 → `error` + `amadeus-bolt set-autonomy` の案内 | FR-CLI-3(1)(2)(3) |
| 6 | 値 `none` かつ grant が `present` | `error` + `amadeus-bolt set-autonomy --mode none`(明示 revoke)の案内。grant は revoke されない | FR-CLI-2(2) |
| 7 | 値 `full` かつ grant が `present` 以外 | `error` + preview で fail-closed 停止 | FR-CLI-4 |
| 8 | 上記以外 | `applyProductionAutonomyMode({ mode, ... })`(既存経路の再利用) | FR-CLI-2(1) / FR-CLI-5 |

**判定 4 と判定 6 の順序関係**(F1 が明示を求めた点): 判定 4(未宣言)は判定 6(grant 実在)より**先**だが、**判定 6 を飛ばさない** — 判定 4 は判定 5 をスキップして判定 6 へ落ちるのであって、書込(判定 8)へ直行しない。この順序が安全である根拠は「grant を持つ Intent の provenance は必ず `human-command` である」(grant 発行は `issue-full` / `replace-full` = 人間コマンド経由でしか起きず、`:359-376` が provenance を `human-command` へ書き換える)ことであり、未宣言かつ grant 実在という組み合わせは通常経路では発生しない。それでも判定 6 を残すのは、**projection が想定外の状態にある場合(部分書込・手術)にも grant を守る**ためである(ADR-12 の二重防壁の趣旨をそのまま保つ)。

判定 6 の**所有者が C13 である**ことは ADR-12 で裁定する。判定 4 の判別子選択は ADR-13 で裁定する。`READ_ONLY_FLAGS` には**追加しない**(C-6)。

### CLI の3値と directive の2値を同一視しない(C-3)

`intent_autonomy_mode` は directive 面では **2値のまま**である。本設計はこの語彙差を**意図的**に維持する。

| 面 | 値域 | 実測(HEAD `974dbf9bc`) |
| --- | --- | --- |
| CLI `--autonomy` | 3値 | 本設計で新設 |
| ドメイン `AutonomyMode` | 3値 | `amadeus-intent-autonomy.ts:11` |
| directive `intent_autonomy_mode` | **2値** | `amadeus-directive.ts:97` verbatim `  intent_autonomy_mode?: "semi" \| "full";` / 検査 `:606` verbatim `  checkOptionalEnum(o, "intent_autonomy_mode", ["semi", "full"] as const, kind, errors);` |

**この非同一視は engine 側に既存の1行が既に強制している**(`cid:functional-design:c8` に従い供給面を実読で確定した): `routeMainWorkflowDirective:2192` verbatim `  if (autonomy.mode === "semi" || autonomy.mode === "full") {`。mode が `none` のとき `directive.intent_autonomy_mode` は**設定されない**(この if の外に代入が無いことを `:2192-2199` の直読で確認)。したがって `--autonomy none` を受理しても directive の値域は広がらない — **C13 は `directive.intent_autonomy_mode` へ一切書き込まない**(C13 の責務は projection と state の更新までであり、directive への射影は既存 `routeMainWorkflowDirective` が独占する)。

`amadeus-directive.ts:97` / `:606` は本 intent の diff に現れてはならない(C-3 の受け入れ確認点)。

### C14〜C15 表示

C14 は `amadeus-statusline.ts` の `main()` が既に読んでいる state 文字列から `Intent Autonomy Mode` を `extractField` で取り、既存のセグメント連結(`output += ...`)へ 1 セグメントを足す。**audit journal を読まない**(ADR-10)。語彙は `--status` の `Autonomy:` 行(`amadeus-utility.ts:341`、verbatim `` `Autonomy:       ${autonomy.autonomyMode}`, ``)と同一の mode 名 `none` / `semi` / `full` を使う。

**フィールドは常に存在する**(F1 と同じ実測): `amadeus-utility.ts:4635` verbatim `- **Intent Autonomy Mode**: none` が birth 時点で書くため、`none` の Intent でもフィールドは実在する。したがって FR-DISP-1 の受け入れ基準(`none` / `semi` / `full` それぞれで対応語彙を出す)は、**3値すべてを表示する**ことで満たす — 「`none` はフィールドが無いので出さない」という経路は存在しない。

不在・不正値は**異常系**(state の手術・部分書込・フィールド追加前の古い state)であり、fail-soft で扱う: `extractField` は不一致時に空文字を返す(`amadeus-statusline.ts:121-131`、戻り行は `:130` verbatim `  return m ? m[1].replace(/\r$/, "").trim() : "";`)ため、セグメントを**足さない**。statusline は毎プロンプト起動される non-blocking hook であり、表示のために停止・警告しない(ADR-10)。異常の検出は canonical を読む `--status`(C15)が担う。

C15 は `IntentAutonomyStatusEnvelope`(`amadeus-intent-autonomy-runtime.ts:766-780`)に `readonly policyCount: number` を top-level で追加し、`projectIntentAutonomyStatus` が `grant?.policies.length ?? semiPoliciesOf(projection).length` を返す(**直読でなく総関数 `semiPoliciesOf` 経由** — ADR-4 Consequences の「読み口は1本」に従う)。`amadeus-utility.ts:345`(verbatim `` `Policies:       ${autonomy.grant?.policyCount ?? 0}`, ``)を `autonomy.policyCount` へ差し替える。`grant.policyCount` は grant 明細として**残す**(削除すると full の grant 表示が退行する)。

### C16〜C17 advisory の第2 receipt 経路

C16 は `applyPendingAdvisoryGuard`(`amadeus-orchestrate.ts:781-800`)が `guard.kind === "hold"` を得た**直後・`await-advisory-choice` を組み立てる前**に呼ぶ。責務は3つ:

1. hold verdict(`AdvisoryChoiceGuardResult`)を `InteractionOccurrence`(`kind: "question"`)へ写像する(写像規約は ADR-6)
2. `commitProductionQuestionDecision`(`amadeus-intent-autonomy-production.ts:524`)へ渡して autonomy 梯子で選択を得る
3. `decided` かつ選択が `run-now` のとき receipt を書き、`allow` として元 directive を返す。それ以外は**必ず** `await-advisory-choice` を返す(FR-ADV-2 の fail-closed)

C17 は `AdvisoryChoiceReceipt.humanTurn: HumanTurnProvenance` を `provenance: AdvisoryChoiceProvenance` へ**置換**する(併存させない — FR-ADV-3、R5)。

```
export type AdvisoryChoiceProvenance =
  | { kind: "human-turn"; timestamp: string; shard: string; eventIdentity: string }
  | { kind: "auto-decision"; decisionId: string; basisKind: DecisionBasisKind; basisFingerprint: string; projectionRevision: number };
```

フィールド名は **`projectionRevision`** を正本とする(component-methods.md §C17 と一致)。既存コードの実フィールド名がこれであり、`recordedAtRevision` という名前は repo に存在しない — 実測(測定 ref `d405e34c5`): `AutonomyProjection.projectionRevision`(`amadeus-intent-autonomy.ts:178` verbatim `  readonly projectionRevision: number;`)、および認可 payload が同名で運ぶ(`:519` verbatim `      projectionRevision: projection.projectionRevision,`)。なお `AutoDecisionRecord`(`:546-560`)は revision フィールドを**持たない**ため、この値は receipt を書く側(C16)が認可 payload から転記する。

humanTurn 依存の受理3点(`:877` grounding / `:878-881` 重複排除キー / `:889` 提示照合)はすべて provenance 種別ごとの分岐を持つ**単一の受理関数**に載せる。store の `schema` を **2** へ上げる(ADR-9)。

---

## Reuse Inventory(再利用棚卸し)

`phases/inception.md` §Architecture Standards が要求する棚卸し。「既存に無い → 新設」の前提は、**書き手側と読み手側の対称 grep で反証確認**した(`cid:requirements-analysis:absence-claim-grep-verify` 追補)。

| 必要な機能 | 既存の実体 | 実測(HEAD `974dbf9bc`) | 判定 |
| --- | --- | --- | --- |
| semi 用の scope / norm fingerprint | `fallbackFingerprints`(`amadeus-intent-autonomy-production.ts:281-289`) | 既に `commitProductionQuestionDecision:541-543` が `projection.currentGrant?.scope.scopeFingerprint ?? fallback.scopeFingerprint` として **grant 不在時の経路を持っている**(verbatim `  const fallback = fallbackFingerprints(projection.intentUuid, "intent");`) | **再利用**(export 化のみ。新規 fingerprint 関数を作らない) |
| occurrence の種別集合 | `ALL_INTERACTIONS`(同 `:62-67`) | 4値の凍結配列が実在 | **部分再利用**(semi 用に `SEMI_ROUTINE_INTERACTIONS` の 2 値部分集合を新設。`ALL_INTERACTIONS` は grant 側で不変) |
| occurrence の scope 照合 | `scopeAllows`(`amadeus-intent-autonomy.ts:496-499`) | grant 専用(`grant: IntentGrant` 引数) | **一般化して再利用**(scope descriptor を受ける形へ) |
| 効果の可逆性判定 | `applySemiDecision:552-554` の inline 述語 / `authorizeDecisionEffect:757-770` | 2箇所に別実装が実在(前者は semi、後者は grant の `prohibitedEffects` 照合) | **移設**(semi 側を C1 のコンパニオンへ。grant 側は不変 — 統合すると grant の `prohibitedEffects` 検査を semi へ持ち込むことになり FR-AUTH-1 の3責務制限に反する) |
| question 裁定の本番結線 | `commitProductionQuestionDecision`(`amadeus-intent-autonomy-production.ts:524`) | 呼び出し元 = `amadeus-bolt.ts:919`(`decide-question`)+ テスト3ファイル(`t435` / `t433`)。**engine 側からの呼び出しは 0 件** | **再利用**(C16 が engine 側の2つ目の呼び出し元になる。新しい裁定経路を作らない) |
| 梯子の5段 | `resolveAutoDecision:706-744` | 5段が実在(`architecture.md` 現在節の表と一致) | **無改変で再利用**(入口と confirmed-policy 段の引数だけ変える) |
| autonomy を directive へ載せる結線 | `routeMainWorkflowDirective:2183-2194` | `productionStageAutonomy` の import edge が engine に既存 | **再利用**(C13 / C16 が同じ import 面に載る。新規 adapter を作らない) |
| statusline の autonomy 表示 | — | `grep -c -i "autonom" packages/framework/core/hooks/amadeus-statusline.ts` → **0**。書き手側(`amadeus-bolt.ts:1072` の `setOrInsertField(..., "Intent Autonomy Mode", ...)`)は実在するが、statusline 側に読み手は無い | **新設**(読み手不在を対称 grep で確認済み) |
| `--autonomy` の受理 | — | `grep -rn -- "--autonomy" packages tests docs scripts specs plugins contrib` → **0 hit**。parser 側(`parseNextFlags`)にも適用側(`handleNext`)にも実体なし | **新設**(A-2 の再確認) |
| advisory の無人選択 | — | `guardAdvisoryChoices` の唯一の呼び出し元は `applyPendingAdvisoryGuard:786`。receipt の唯一の書き手は `recordProtectedAdvisoryChoice:864`。autonomy を参照する箇所は 0 件 | **新設**(ただし occurrence 生成と裁定は既存の `commitProductionQuestionDecision` を再利用) |
| unreviewed の受け皿 | `amadeus-autonomy-review.ts`(1273 行)/ `amadeus-autonomy-review-production.ts`(484 行) | `component-inventory.md` 現在節「区間内で追加されたコンポーネント」表の実測。計 1757 行 | **無改変で再利用**(semi の unreviewed が同じ queue に入る。FR-LAD-4 の受け入れ基準はこの受け皿で検収する) |

**新設は 3 コンポーネント**(C1 `SemiAuthority` / C2 `DecisionAuthority` / C16 advisory resolver)+ C13(engine ハンドラ)+ C17 の provenance 型のみ。残り 13 は既存機構の改訂である。

### adapter・外部契約の先行着地の不在

`phases/inception.md` の「adapter・外部契約(登録スロット・インターフェース面)の先行着地は禁止」に照らし、本設計が導入する型・関数はすべて**同一 intent 内で実装と配線が揃う**:

| 新設 | 配線先(同一 intent) |
| --- | --- |
| `SemiAuthority` | C3 が生成、C4 / C7 が消費 |
| `DecisionAuthority` | C3→C6 が生成、C4 が消費 |
| `SEMI_ROUTINE_INTERACTIONS` | C1 の `allowsOccurrence` が消費 |
| `resolveAdvisoryChoiceAutonomously` | C16 が `applyPendingAdvisoryGuard` から呼ぶ |
| `AdvisoryChoiceProvenance` | C16 / C17 が生成・消費 |
| `IntentAutonomyStatusEnvelope.policyCount` | C15 が `amadeus-utility.ts:345` で消費 |

未配線の登録スロット・将来用インターフェースは 1 つも導入しない。

---

## 下流受け皿と隣接面

`component-inventory.md` 現在節が「requirements で明示的に扱うべき隣接面」と名指した `amadeus-autonomy-review*.ts`(計 1757 行)は、**本設計では無改変**である。semi の梯子後段2段(`solo-election` / `agent-recommendation`)が `reviewState: "unreviewed"`(`amadeus-intent-autonomy.ts:605-607`)で記録され、既存の unreviewed queue にそのまま入る。`projectIntentAutonomyStatus:797`(verbatim `    unreviewedAutoDecisionCount: projection.autoDecisions.filter((decision) => decision.reviewState === "unreviewed").length,`)は mode を見ないため、semi 由来の裁定も自動的に計上される — 改訂不要である。

これが `requirements.md` Intent analysis 3(「任せた結果を後から検収できる」)を満たす経路であり、A-5 の確認対象でもある。

---

## 変更しないもの(明示)

`requirements.md` §Out of scope と Constraints に対応する非変更面を、コンポーネント境界として固定する。

| 非変更面 | 実測 file:line | 根拠 |
| --- | --- | --- |
| `AUTONOMOUS_BLOCK_CAP = 8` | `amadeus-stop.ts:153` | FR-STOP-2 |
| `stopBudgetMode` の3値 | `amadeus-stop.ts:157-160` | FR-STOP-2 |
| `isFullyAutonomousIntent` の `:457` / `:716` 呼び出し | `amadeus-stop.ts:457` / `:716` | FR-STOP-1、Out |
| `Construction Autonomy Mode` 互換投影 | `amadeus-bolt.ts:1071` | C-4、Out |
| `InteractionKind` の値域(4値) | `amadeus-intent-autonomy.ts:14` | Out(`advisory-choice` を追加しない) |
| `ADVISORY_CHOICE_OPTIONS` の2値 | `amadeus-advisory-choice.ts:25-28` | A-6 |
| `set-mode` の値域に `full` を追加しない | `amadeus-intent-autonomy.ts:251` | FR-AUTH-3 |
| `reserveFullDecision` の grant 要求 | `amadeus-intent-autonomy-runtime.ts:574` | semi は2相予約を使わない(現行どおり) |
| `formalCheckRoute` の実行コマンド | `amadeus-advisory-choice.ts:685` | FR-ADV-5(plugin 非依存でない面。**hold 判定の面に限り** plugin 非依存) |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T07:38:40Z
- **Iteration:** 1
- **Scope decision:** none

5成果物は FR/NFR をほぼ全数カバーし、ADR 12件はすべて Context/Options/Decision/Consequences/Alternatives Rejected を備え、--autonomy 3値化・ADR-6 の実効3段縮退・ADR-9 の非シム性・Reuse Inventory の対称 grep・規模の数値見積り(合計 662 行)はいずれも成立している。上流 codekb への引用は実読で一致を確認した。再現失敗・明示契約違反・安全性欠陥は検出されず BLOCKER はゼロ。残る指摘は未検証前提1件・成果物間のシグネチャ drift・自 ADR との軽微な不整合という FOLLOW-UP 級である。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/application-design/components.md:203 — C13 の判定3/4 が「新規 birth 直後の state に Intent Autonomy Mode が存在しない」ことを暗黙前提とするが未実測。birth 時に none が書かれるなら --autonomy semi が常に判定4で loud 停止し FR-CLI-1/3 の主用途が構造的に成立しない
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/application-design/component-methods.md:454 — C14 の「フィールド不在→出力しない」と FR-DISP-1 の AC(none/semi/full それぞれで語彙を出す)が none の Intent で両立しない。フィールド不在時の扱いを明記
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/application-design/components.md:118 — 成果物間のシグネチャ drift 3件: decisionAuthorityOf の引数、SemiAuthority.of の引数、recordedAtRevision vs projectionRevision。正本を片側へ揃える
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/application-design/decisions.md:224 — ADR-4 Consequences が semiPoliciesOf の1本に閉じると固定しているのに、同 :225 と components.md:229 / component-methods.md:472 が projection.semiPolicies を直読。ADR と本文が自己矛盾
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/application-design/component-methods.md:373 — 3値化裁定の反映漏れ。:371 は3値と書くが直後の引用意味論照合が「2値の値域を持つため」と旧前提のまま
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/application-design/component-methods.md:215 — C6 が decisionAuthorityOf の戻り(DecisionAuthority | null)を C5 の非 null 契約(:184)へ渡しており型不整合。human-required が到達しない根拠を明記するか null 分岐を定義
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/application-design/component-methods.md:106 — human-required reason union へ AUTHORITY_BOUNDARY を追加しているが生成・消費点が全成果物に無い。消費されない値域拡張
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/application-design/decisions.md:513 — ADR-11 の従機構が PROHIBITED_EFFECTS への quality-waiver 収載に全面依存するが verbatim 併記なしの断定。FR-ADV-4 の fail-closed の要となる引用
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/application-design/decisions.md:134 — ADR-3 と ADR-10 が Option 2択・却下案各1件で、他10 ADR の3案より密度が低い
- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/application-design/components.md:45 — コンポーネント一覧の充足 FR 列に FR-AUTH-3 / FR-LAD-6 / FR-ADV-5 が現れない(実体は他成果物で受け止め済み)
- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/application-design/components.md:64 — C18 の推定行数が「非コード」で数値を持たない
