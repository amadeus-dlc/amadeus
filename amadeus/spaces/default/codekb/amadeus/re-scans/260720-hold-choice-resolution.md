# re-scan 記録 — 260720-hold-choice-resolution

## 実行メタデータ

- Date: 2026-07-20(Asia/Tokyo)
- Intent: `260720-hold-choice-resolution`
- Issue: [#1267](https://github.com/amadeus-dlc/amadeus/issues/1267)(選挙 CLI の hold-resolution に勝者 choice 指定を追加する — 多肢 choice tie 由来の hold を人間解決する際、二値語彙 adopted/rejected では勝者 choice を表現できないギャップ。E-TCRCG e4 留保の履行)
- Scope / project type: `amadeus` / Brownfield
- Repository / stage: `amadeus` / `reverse-engineering`(2.1)
- Base commit: `6f2455c43b7dbadafec83ab3d0b57d9fc8e5156c`(全 `re-scans/*.md` observed のうち **HEAD 祖先で距離最小**。`re-scans/260719-ballot-failclosed-amend.md` の Observed に一致。`git merge-base --is-ancestor 6f2455c43 f6ab1e48d` **exit 0 実測**、`git rev-list --count 6f2455c43..f6ab1e48d`=**87**。より新しい re-scan observed `37f8cf5e6`(260720-ballot-received-at)・`262a86db9`(260719-tally-choice-ruling)は本 HEAD の**非祖先**(`--is-ancestor` exit 1、並行 intent の squash tip)につき base 候補から除外。cid:reverse-engineering:rescan-base-ancestry / E-L63)
- Observed commit: `f6ab1e48d321e11ab6355fa315d505e28bd0273b`(現 HEAD、`git rev-parse HEAD` 実測一致。subject = `record(hold-choice-resolution): approval-handoff approved (ideation complete)`)
- 測定 ref: 全 file:line は Observed=HEAD `f6ab1e48d` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。区間変更は `git log 6f2455c43..f6ab1e48d -- <path>` と `git diff 6f2455c43..f6ab1e48d -- <path>` の hunk header で実測。実データ件数は本 worktree(engineer-2、`f6ab1e48d`)の `amadeus/**/elections/**/tally.json` 実測。#1268 の crossing 帰属は `git blame` / `git show 6f2455c43:<file>` 実測。
- Focus: (1) hold-resolution の resolution 語彙テーブル `HOLD_RESOLUTIONS` と choice 指定の受け皿 (2) `handleHoldResolved` の fail-closed 検証と choice:N 拡張の合流点 (3) hold 裁定の描画経路(`rulingOverride` 二値写像 → `renderPersistDraft` → `rulingText` の established winner label)(4) tie hold の発生機序(`tally` の leaders 判定)(5) tie hold-resolved / 採用分岐 / tie resolution 検証のテスト空白 (6) tie hold・resolution の本番実データ空白 (7) 区間 `6f2455c43..HEAD`(#1268/#1273/#1277)の関数交差、特に本 intent が拡張する `rulingOverride` 面の in-interval 変更 (8) e4 バッチ面(GoaLineCode / renderGoaLine / handleOpen / norm-metrics)の非交差裏取り
- 実施体制: Developer code scan → Architect synthesis の2サブエージェント直列(cid:reverse-engineering:c3)。確約級引用5クラスタ(`election.ts:69-74` / `:201-208` / `:389-393` / `record.ts:120-131,155-159` / `model.ts:445-456`)+区間交差の帰属を独立スポット再実測。**再照合で1点反証**(区間交差 — 下記「区間交差目録」参照)。

## 結論

本 intent は**バグ修正ではなく enhancement**(scope `amadeus`)。多肢 choice tie で発生する hold(`model.ts:456` `{kind:"hold", reason:"tie"}`)を人間が解決するとき、現行の resolution 語彙 `tie: {adopted, rejected}`(`election.ts:70`)は二値であり、**どの choice が勝ったか**を表現できない。裁定は `rulingOverride`(`election.ts:390-393`)で `採用`/`不採用` のいずれかへ二値写像され、勝者 choice ラベルは描画に出ない。#1267 はこのギャップ(E-TCRCG e4 留保の履行)を、`--resolution choice:<internalNo>` 形の受理 → `renderPersistDraft` の winner 描画経路(`record.ts:126` の established winner label 相当)への合流で埋める。

拡張が触る5面はすべて Observed に実在し**機序として確定済み**:
1. **語彙テーブル** `HOLD_RESOLUTIONS`(`election.ts:69-74`)— `tie` 行に choice 指定の受け皿が無い。
2. **fail-closed 検証**(`election.ts:201-208`)— table 由来で未知 resolution を loud 拒否。choice:N を tie の有効値にするにはこの table か検証述語の拡張が要る。
3. **裁定描画の二値写像**(`election.ts:389-393`)— `resolution === "adopted" ? "採用" : "不採用"`。choice 勝者は「採用/不採用」に畳めないため、established winner label(`record.ts:120-131`)相当の描画へ分岐が要る。
4. **永続経路**(`election.ts:211-222`)— human ruling を `tally.json` の `resolutions[]` へ **state 遷移前に** append(DURABLE、#1235 M1)。choice 情報を運ぶには `HoldResolution` 型(`election.ts:89-94`)の拡張要否が設計判断点。
5. **tie 発生源**(`model.ts:445-456`)— `leaders.length !== 1` で tie hold。勝者 choice は tie 時点では未確定(複数 leader)であり、人間が choice:N で確定する = 本 intent の中核。

**原因の所在は該当なし(enhancement)**。ただし本 intent が拡張する `rulingOverride` 描画面は **Bolt 4 凍結コードではなく、区間内の #1268(`ea6acac53`)で再形成された直近変更面**(下記「区間交差目録」の反証点)。requirements/design はこの面を「直近変更・#1268 の rulingOverride 構築の直接拡張」として扱う必要がある。

## 機序確定(file:line + verbatim、Observed=HEAD `f6ab1e48d` 実測)

### 1. resolution 語彙テーブル(`scripts/amadeus-election.ts:69-74`)

```ts
const HOLD_RESOLUTIONS: Record<HoldReason, Record<string, ElectionState>> = {
  tie: { adopted: "tallied", rejected: "tallied" },
  block: { adopted: "tallied", rejected: "tallied", reopen: "collecting" },
  "quorum-short": { "resume-collecting": "collecting", "close-rejected": "tallied" },
  "discussion-needed": { discussed: "collecting" },
};
```

- `HoldReason`(`model.ts:406`)= `"tie" | "block" | "quorum-short" | "discussion-needed"`。
- `tie` の有効 resolution は `adopted` / `rejected` の2値のみ、いずれも復帰先 `tallied`。**choice:N の受け皿は不在** — 本 intent の主拡張点。table は `Record<string, ElectionState>` なので `choice:1` 等の動的キーは table 静的定義では表現しづらく、検証述語側の拡張が設計選択肢になる。

### 2. `handleHoldResolved` と fail-closed 検証(`scripts/amadeus-election.ts:190-226`)

関数シグネチャ `handleHoldResolved(root, electionId, resolution: string | null): number`。ガード列(verbatim):

```ts
if (resolution === null) return fail("invalid-transition: hold-resolved requires --resolution");    // :191
// ... state !== "hold" ガード :194-196
// ... hold tally 不在ガード :197-200
const table = HOLD_RESOLUTIONS[t.result.reason];                                                     // :201
const resumedTo = table[resolution];                                                                 // :202
if (resumedTo === undefined) {                                                                        // :203
  return fail(
    `invalid-transition: resolution "${resolution}" is not valid for hold reason "${t.result.reason}" (valid: ${Object.keys(table).join("/")})`,
  );                                                                                                   // :205-207
}
```

- **fail-closed は :201-208**(table 引き → undefined なら loud 拒否)。table 由来なので、choice:N を tie に許すには (a) table の tie 行へ choice キーを動的に許容 (b) 検証を choice: prefix で分岐、のいずれかが要る = 設計判断点。
- 永続化 :211-221(`writeStoreFile` 直呼び、state 遷移**前**に `resolutions[]` へ append = DURABLE、#1235 M1 コメント :208-210)、`setState` :222。

### 3. `HoldResolution` 型(`scripts/amadeus-election.ts:89-94`)

```ts
export type HoldResolution = {
  reason: HoldReason;
  resolution: string;
  resumedTo: ElectionState;
  at: string;
};
```

- `resolution: string` は現状 `adopted`/`rejected`/`reopen`/... を格納。choice 勝者を運ぶには `choice:1` を string で入れるか、専用フィールド追加かが設計判断。`tally.json` スキーマ = `{result, talliedAt, ballots, resolutions}`(`store.ts:250-252`)、`resolutions` は reopen 跨ぎで carry-forward(`store.ts:248-249`、FR-4b、verbatim: `const resolutions = prior.ok ? (prior.value.resolutions ?? []) : [];`)。

### 4. 裁定描画の二値写像(`scripts/amadeus-election.ts:389-393`)

```ts
const finalRuling = resolutions.filter((r) => r.resumedTo === "tallied").at(-1);   // :389
const rulingOverride =                                                             // :390
  t.result.kind === "hold" && finalRuling !== undefined
    ? `裁定: ${finalRuling.resolution === "adopted" ? "採用" : "不採用"}`          // :392
    : undefined;                                                                   // :393
```

- `finalRuling` = `resumedTo === "tallied"` の最後の resolution(:389)。`rulingOverride` = hold かつ finalRuling 有りのとき `裁定: 採用` / `裁定: 不採用` の二値文字列(:392)。
- **choice 勝者はこの二値に畳めない** — 本 intent は勝者 choice ラベル(established の `record.ts:126` 相当 `裁定: <winner.label>(choice <no>: <n>票)`)を rulingOverride へ流す分岐を要する。

### 5. 描画合流点(`scripts/amadeus-election-record.ts:120-131, 149-159`)

`rulingText`(:120-131、hold 分岐は `裁定: 保留(<reason>)` :129、established は winner label :126):

```ts
function rulingText(result: TallyResult): string {                                 // :120
  if (result.kind === "established") {
    // ... winnerCount, breakdown ...
    return `裁定: ${result.winner.label}(choice ${result.winner.internalNo}: ${winnerCount}票)\n内訳: ${breakdown}`;  // :126
  }
  return `裁定: 保留(${result.reason})`;                                            // :129
}
```

`renderPersistDraft`(:149-159)は `rulingOverride ?? rulingText(result)`(:159)で override 優先:

```ts
export function renderPersistDraft(
  code, _election, result, ballots, timeline,
  rulingOverride?: string,                                                          // :155
): string {
  // ...
    rulingOverride ?? rulingText(result),                                          // :159
```

- 本 intent は「choice 勝者 → established winner label 相当の rulingOverride」を組み立てて :159 へ流す設計が自然。`rulingText` established 分岐(:120-127)が既に winner label 描画の canonical。

### 6. tie 発生源(`scripts/amadeus-election-model.ts:442-456`)

first-match 順(verbatim):

```ts
if (blocks >= 1) return { kind: "hold", reason: "block", counts };                 // :442
if (counts.discuss >= 2) return { kind: "hold", reason: "discussion-needed", counts };  // :443
if (counts.favor + counts.against === 0) return { kind: "hold", reason: "quorum-short", counts };  // :444
// ... choice 集計 ...
const leaders = choiceCounts.filter((c) => c.count === top);                       // :455
if (leaders.length !== 1) return { kind: "hold", reason: "tie", counts };          // :456
```

- 判定順 = **block → discussion-needed → quorum-short → choice(established / tie)**。tie は「勝者 choice が一意でない」= `leaders.length !== 1`(:456)。人間が choice:N でどの leader を勝者にするか確定するのが本 intent。

## テスト未カバー面(Observed 実測、grep = `tests/`)

- **hold-resolved を駆動するテストは全て非 tie**: `t236`(integration):229 `discussed`(discussion-needed)/:233・:295 `reopen`・`rejected`(block)/:325・:344 `reopen`(block 非 hold 拒否)。`t241`(e2e):128-130 `hold-resolved --resolution rejected`(E-EXEC2、block)。**tie 由来の hold-resolved を駆動するテストは 0 件**(grep 実測)。
- **採用(adopted)分岐の描画テストは不在**: `t238`(unit):200-208 は `renderPersistDraft` に `HOLD {reason:"tie"}` を渡すが、アサートは `保留(tie)`(:208、`rulingText` 保留分岐)のみ — `rulingOverride` の `裁定: 採用` 経路は踏まない。`--resolution adopted` を渡すテストは全域 0 件、よって `rulingOverride === "裁定: 採用"` の描画は**未カバー**。
- **tie resolution 検証テストは不在**: tie の有効集合 `{adopted, rejected}` に対する fail-closed(`election.ts:203-208`)を tie で駆動するテストは 0 件。`t236`:321-344 の residual guard テストは block reason 上で invalid resolution を拒否するのみ。
- `t234`(unit):413-421 は tie 発生(`reason === "tie"`)のみ固定、hold-resolved へ繋げない。`t235`(integration):131・:201 も tie hold の store 往復のみ。
- 本 intent 実装時に (a) tie 由来 hold-resolved の choice:N 受理 (b) choice 勝者の rulingOverride 描画(record.md 反映、human-ruling-persist-through) (c) tie に対する既存二値 resolution(adopted/rejected)の後方互換(設計時裁定) の3点を新規テストで固定する必要。

## 実データ空白(census、測定 ref = 本 worktree engineer-2 `f6ab1e48d`)

- `amadeus/**/elections/**/tally.json` 総数 = **51**(本 worktree、`find` 実測)。内訳: `"kind":"hold"` 結果 = **0**、`"winner"` スキーマ = **0**、`"outcome"` 旧スキーマ = **51**、`"resolutions":[非空]` = **0**。
- すなわち本 worktree の全選挙は旧 outcome スキーマ(#1268 前の tally 様式)で、**tie hold・resolution の本番実績はゼロ**。choice tie hold-resolution は完全に未実行のコードパス — 回帰対照データは存在せず、テストで合成する必要。
- 測定 ref 注記: Developer scan は leader tree(別 worktree)で **62** tally.json を計数。本 worktree(engineer-2)は **51**。差は worktree ref 差(measurement-ref-in-artifacts)で、**定性結論(hold 0 / winner-schema 0 / 非空 resolutions 0 = tie hold・resolution 実績ゼロ)は両 ref で一致**。矛盾ではなく計数 ref の違い。

## 区間交差目録(`6f2455c43..HEAD` = `scripts/` 3 PR)+ 反証点

区間 `6f2455c43..f6ab1e48d` で `scripts/` を触るコミットは3本(`git log --oneline ... -- scripts/`):

- `ea6acac53` `fix(election): decide tally winner from choiceInternalNo (#1268)`
- `a6f4a4522` `fix(election-cli): fail-closed ballot acceptance ... (#1273)`
- `e1fd1826b` `fix(election-cli): stamp ballot receipt time ... (#1277)`

本 intent が触る5面の交差判定(new-side hunk header + blame 実測):

| 対象面 | file:line(Observed) | 区間交差 | 判定根拠 |
|---|---|---|---|
| `HOLD_RESOLUTIONS` | `election.ts:69-74` | **非交差** | `election.ts` の区間 hunk は new-side :25-31/:333-344/:376-405/:452-479 のみ。:69-74 はいずれの hunk 外 = base とバイト同一 |
| `handleHoldResolved` | `election.ts:190-226` | **非交差** | 同上、:190-226 は hunk 外 = 未変更 |
| **`rulingOverride` 二値写像** | `election.ts:389-393` | **⚠ 交差(反証点)** | hunk `@@ -370,20 +376,29 @@ handleRender` が new-side :376-405 を覆い、:390/:392/:393 は **#1268(`ea6acac53`)が変更**。base(`6f2455c43`)は `effective: TallyResult` の established 合成(`outcome: finalRuling.resolution === "adopted" ? "adopted" : "rejected"`)で、#1268 が `rulingOverride` 文字列 + `resolveBallots` + `renderPersistDraft` 6th param へ**再形成** |
| **`renderPersistDraft` の `rulingOverride` param** | `record.ts:155, 159` | **⚠ 交差(反証点)** | hunk `@@ -124,16 +142,21 @@` が new-side :142-162 を覆い、`rulingOverride?: string`(:155)と `rulingOverride ?? rulingText`(:159)は **#1268(`ea6acac53`)が追加**。base の同関数に rulingOverride param 不在(`git show 6f2455c43:...record.ts` で確認) |
| `tally` の tie 判定 | `model.ts:442-456` | **非交差(概念面)** | `model.ts` は区間で広範に変更(#1268 が choice 集計を導入)だが、tie 判定行 `:456` 自体は #1268 で導入・以降安定。tie/established 分岐は #1268 由来 = 本 intent が直接乗る面 |

**Developer scan の反証(1点)**: Developer は「rulingOverride 本体・handleHoldResolved・HOLD_RESOLUTIONS はいずれも未変更(Bolt 4 由来)」と記録したが、**`rulingOverride` 本体(`election.ts:389-393` + `record.ts:155/159` param)は Bolt 4 由来ではなく、区間内の #1268(`ea6acac53`、2026-07-20)で `effective:TallyResult` established 合成から再形成された直近変更面**である(`git blame` で :390/:392/:393/:155/:159 = `ea6acac53e`、`git show 6f2455c43:` で base は established 合成、を実測)。HOLD_RESOLUTIONS(:69-74)と handleHoldResolved(:190-226)の未変更判定は正しい。**含意**: 本 intent は #1268 が導入した `rulingOverride` 構築の**直接拡張**であり、requirements/design はこの面を「凍結コード」でなく「1日前に変わったばかりの面」として扱い、#1268 の rulingOverride 契約(choice-blind な採用/不採用、Issue #1261 ruling A、`election.ts:381-383` コメント)を前提に choice 勝者描画を接ぐ。

**e4 バッチ面の非交差裏取り**(本 intent 実装が e4 の並行面と交わらないことの確認):

| e4 面 | file:line | 区間交差 | 根拠 |
|---|---|---|---|
| `GoaLineCode` | `record.ts:26-49` | 非交差 | record.ts 区間 hunk は new-side :89/:112/:142/:200 起点、:26-49 は hunk 外 |
| `renderGoaLine` | `record.ts:77-80` | 非交差 | 同上、:77-80 は hunk 外 |
| `handleOpen` | `election.ts:230-262` | 非交差 | election.ts hunk(:25/:333/:376/:452 起点)外 |
| norm-metrics schema | `amadeus-norm-metrics.ts` | 非交差 | `git diff ... -- scripts/` の stat に norm/metric 出現 0(区間で scripts/ 変更なし) |

## body 成果物の温存/更新(cid:reverse-engineering:c1 churn 温存)

codekb body 8成果物は**全点温存**。実質の新規知識は「hold-resolution が tie 勝者 choice を表現できない enhancement ギャップ(語彙テーブル二値・rulingOverride 二値写像・tie 発生源)+ 拡張面 rulingOverride が #1268 の直近変更面である crossing 事実 + tie hold/resolution の本番・テスト双方の空白」の1クラスタのみで、これは既存機構への機能追加であり構造・API・依存・技術スタックの現状を変えない。詳細は本 per-intent record に集約。

| 成果物 | 状態 | 根拠(1行) |
|---|---|---|
| `reverse-engineering-timestamp.md` | **更新** | 鮮度ポインタ + 旧「最新: 260720-ballot-received-at」→履歴ラベル化(cid:reverse-engineering:c3-relabel) |
| `re-scans/260720-hold-choice-resolution.md` | **新規** | 本 per-intent record |
| `business-overview.md` | 温存 | 事業目的・選挙運用の目的は不変。enhancement は既存機能の表現力追加で事業スコープを変えない |
| `architecture.md` | 温存 | 選挙 CLI のアーキテクチャ境界(core 中立/表層、tally→render→verify 契約)は不変。rulingOverride は既存 render 経路内の拡張 |
| `code-structure.md` | 温存 | `scripts/amadeus-election*.ts` の構造・関数配置は不変。区間で新関数・新ファイルの追加なし(既存関数内の実装差のみ) |
| `api-documentation.md` | 温存 | CLI 契約(`report --result hold-resolved --resolution <v>`)の公開面は Observed で不変。choice:N 語彙追加は本 intent の実装後に反映 |
| `component-inventory.md` | 温存 | 選挙 CLI 4モジュール(model/store/record/root)の構成は不変 |
| `technology-stack.md` | 温存 | Bun/TS/ESM・依存は不変。enhancement は新規 runtime dependency を伴わない |
| `dependencies.md` | 温存 | モジュール依存方向(root→model/store/record)不変。rulingOverride は既存依存内 |
| `code-quality-assessment.md` | 温存 | 品質欠陥の新規クラスタ導入なし。tie hold/resolution のテスト空白・実データ空白は本 record に観測記録済み(bugfix でなく enhancement 前提のカバレッジ課題) |

body 8成果物の件数根拠: `ls amadeus/spaces/default/codekb/amadeus/*.md`(re-scans/ ディレクトリ・鮮度ポインタ除く)= business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment の8点(実測、260720-ballot-received-at.md の温存列挙と同一集合)。

## requirements への未決点(design で確定すべき選択肢)

1. **choice 指定の語彙形式**: `--resolution choice:<internalNo>`(Issue 提案案、prefix 形)か、専用フラグ `--winner-choice <no>` か。前者は `HOLD_RESOLUTIONS[tie]` の静的 table では表現できず、`handleHoldResolved` の検証を choice: prefix で分岐する実装になる(`election.ts:201-208` の table 引き前に prefix 判定を挟む)。後者は table を汚さないが CLI 契約に新フラグを足す。
2. **`HoldResolution` 型の運搬形**: 勝者 choice を `resolution: string`(`election.ts:90`)に `choice:1` として畳むか、`winnerInternalNo?: number` フィールドを追加するか。`tally.json` の `resolutions[]` carry-forward(`store.ts:248-249`)と `finalRuling` フィルタ(`election.ts:389` `resumedTo === "tallied"`)への影響を要確認。choice 復帰先は `tallied`(established 相当)が自然。
3. **rulingOverride の choice 描画**: choice 勝者を `record.ts:126` の established winner label(`裁定: <label>(choice <no>: <n>票)`)相当で描くか、hold 裁定専用の簡略形にするか。`renderPersistDraft` は `rulingOverride ?? rulingText`(`record.ts:159`)なので、caller(`election.ts:390-393`)で choice ラベルを組み立てて渡す。choice ラベルは `election.choices`(`model.ts` の Election.choices)から internalNo で引く必要 — render 段が choices を持つか要確認(現 `renderPersistDraft` の `_election` は未使用 :151)。
4. **既存二値語彙の後方互換**: `tie` の既存 `adopted`/`rejected`(`election.ts:70`)を残すか choice 一本化か。intent Project 記述は「二値語彙の後方互換は設計時裁定」と明示 — construction guardrail(要求外の互換レイヤー禁止)と照らし、残す場合は根拠を design/NFR に明示。tie で adopted/rejected が意味を持つか(choice-blind 採否 vs choice 勝者)の意味論整理が要る。
5. **human-ruling-persist-through 準拠**: 裁定は `tally.json` の `resolutions[]` へ state 遷移前 append(`election.ts:211-221`)され、render が `finalRuling` から復元(`election.ts:389`)。choice 勝者が record.md に反映され「保留」で残らないこと(#1235 M1 と同型)を閉包テストで固定。choice:N が resolutions に永続 → render → record.md に winner label、の往復を実データ合成で実証。
6. **#1268 面への接地**: 拡張対象 `rulingOverride`(`election.ts:389-393`)は #1268(`ea6acac53`)で1日前に再形成された面。実装は #1268 の rulingOverride 契約(choice-blind、Issue #1261 ruling A、コメント `election.ts:381-383`)を前提に choice 勝者分岐を接ぐ。base-advance-regrounding: 着手前に merge-base 再実測し #1268 面の最新を確認。

## 測定コマンド(数値の出所)

- 祖先性: `git merge-base --is-ancestor 6f2455c43 f6ab1e48d` exit 0。
- 距離: `git rev-list --count 6f2455c43..f6ab1e48d` = 87。
- base 選定(非祖先除外): `git merge-base --is-ancestor 37f8cf5e6 f6ab1e48d` exit 1 / `... 262a86db9 f6ab1e48d` exit 1(並行 squash tip)。祖先候補距離: 6f2455c43=87 / 591b6a2a2=152 / 6495e03a1=278 → 距離最小 6f2455c43。
- 区間 scripts コミット: `git log --oneline 6f2455c43..f6ab1e48d -- scripts/` = #1268/#1273/#1277 の3行。
- crossing 帰属: `git blame -L 389,393 scripts/amadeus-election.ts`(:390/:392/:393 = `ea6acac53e`)/ `git blame -L 149,159 scripts/amadeus-election-record.ts`(:155/:159 = `ea6acac53e`)/ `git show 6f2455c43:scripts/amadeus-election-record.ts | grep renderPersistDraft`(base に rulingOverride param 不在)。
- hunk header: `git diff 6f2455c43..f6ab1e48d -- scripts/amadeus-election.ts scripts/amadeus-election-record.ts | grep -E '^\+\+\+|^@@'`。
- 実データ census: `find amadeus -path '*elections*' -name tally.json | wc -l` = 51、`grep -l '"kind": *"hold"'` = 0 / `"winner"` = 0 / `"outcome"` = 51 / 非空 `"resolutions"` = 0(本 worktree engineer-2 `f6ab1e48d`)。
- テスト空白: `grep -rn 'hold-resolved' tests/`(t236/t241 のみ、全て block/discussion-needed)/ `grep -rn '"adopted"\|--resolution adopted' tests/` = 選挙系 0 件。
