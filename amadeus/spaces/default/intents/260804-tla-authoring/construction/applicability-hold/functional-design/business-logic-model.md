# Functional Design: 業務ロジックモデル — U2 applicability-hold

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は U2(C1 適用判定 + C9 hold 評価 + 宣言駆動結線)のアルゴリズムを定義する。型は `domain-entities.md`、制約は `business-rules.md` を正本とする。`unit-of-work.md` U2 の境界(判定と hold の評価のみ。永続化は U1 へ委譲、checkpoint 機構は無変更)に従う。

## 1. 適用判定表(C1.judge — closed)

`requirements.md` FR-001 の 4 経路への決定論的分岐。入力は `ApplicabilityInput`(subjectIdentity、ChangeDeclaration、registeredModels — `component-methods.md` §C1)。上から順に評価し、最初に該当した行で確定する(閉じた判定表 — 行の追加は Functional Design の改訂を要する)。

| 行 ID | 条件 | 結果 |
|---|---|---|
| J1 | `declaration.subjects` が空、または model-map 読取結果が欠落 | failure: `missing-evidence` / `undecidable` |
| J2 | 宣言 kind と実状態の矛盾(4 形): (a) kind="new-subject" × subjects の一部が登録モデルの trace 対象と交差 (b) kind="semantic-change" × どの登録モデルとも非交差 (c) kind="impl-only" × どの登録モデルとも非交差(「モデル化された意味を変えない」主張は対応する登録モデルなしに成立しない — FR-004) (d) kind="non-target" × subjects の一部が登録モデルの trace 対象と交差(登録モデルが trace する対象を「形式検証の非対象」と宣言するのは矛盾 — FR-005) | failure: `undecidable`(該当する矛盾形の全数列挙) |
| J3 | kind="non-target" かつ subjects がどの登録モデルの trace 対象とも非交差 | route: `non-target`(承認必須 — buildReceipt 段で検査) |
| J4 | kind="impl-only" かつ subjects が 1 件以上の登録モデルの trace 対象と交差 | route: `impl-only`(承認必須) |
| J5 | kind="semantic-change" かつ subjects が 1 件以上の登録モデルの trace 対象と交差 | route: `revise-model` |
| J6 | kind="new-subject" かつ subjects がどの登録モデルの trace 対象とも非交差 | route: `author-new` |

被覆の機械確認: ChangeKind 4 値 × 交差有無 2 値 = 8 組合せは、J2(a)=new-subject×交差、J6=new-subject×非交差、J5=semantic-change×交差、J2(b)=semantic-change×非交差、J4=impl-only×交差、J2(c)=impl-only×非交差、J2(d)=non-target×交差、J3=non-target×非交差 で全数被覆(J1 は入力欠落の前段)。表外の入力は存在しない。

- 「登録モデルの trace 対象」= model-map エントリが参照する bundle の trace rows に現れる stable ID 集合(U1 `bundle read` で取得)。**無関係な既存モデルの成功・存在は判定材料にしない**(`requirements.md` §2.4、`components.md` §C1 境界)— 交差判定は subjects と trace 対象の集合演算のみで行う。
- J2 の矛盾検出が「宣言の鵜呑み」を防ぐ: 宣言者の自己申告だけで route が確定する経路は J3(non-target)のみで、これは人間承認(FR-005)が必須の terminal 経路である。
- 判定は純関数(`NFR-001` 決定性): 同一入力に対し同一の行 ID へ到達する。timestamp・乱数は使わない。

## 2. receipt 生成(C1.buildReceipt)

```
buildReceipt(route, input, approval):
  1. route が non-target / impl-only の場合: approval が null → approval-missing で拒否(FR-004/FR-005/AC-004)
  2. approval が非 null の場合: HumanApprovalRef の provenance 照合 —
     参照先 audit shard に timestamp 一致 + イベント本文 SHA-256 一致の HUMAN_TURN が実在すること
     (不在・不一致 → approval-missing。偽装 receipt を store に入れない)
  3. ApplicabilityReceipt を構成 — subjectSeries = seriesKey(declaration.subjects)を算出して格納し
     (導出式は domain-entities.md § SubjectSeriesKey が正本)、reason に判定表の行 ID を併記
     (generatedAt は記録であって判定入力ではない)
  4. 永続化は行わず receipt 値を返す — 呼び手(checkpoint 実行面 / C7)が U1 C4.build へ渡す
     (terminal 2 経路 → terminal-route-receipt kind / author・revise → bundle part。ADR-7、services.md §S1/§S3)
```

## 3. hold 評価(C9.evaluate)

`components.md` §C9 の closed な hold 判定表の実装。入力: currentIdentity(U1 C2)、ModelMapSnapshot、evidenceIndex(U1 `EvidenceIndex.refs`)、readEvidence(U1 `read` の注入 — `component-methods.md` §C9 の承認済みシグネチャ)。

選別と鮮度比較は**別のキー**で行う — 選別は `SubjectSeriesKey`(対象 stable ID 集合のみの digest。内容に依存しない「同一対象系列」の識別子 — `domain-entities.md` § SubjectSeriesKey)、鮮度は `AggregateDigest`(内容 digest)の完全一致比較。内容 digest で選別すると stale な evidence が選別段で脱落し staleness を原理的に検出できないため、この 2 キー分離が AC-006 の成立条件である。

```
evaluate(currentSeries, currentIdentity, modelMap, evidenceIndex, readEvidence):
  0. 前段(呼び手の責務): U1 list() の corrupted が非空なら evaluate を呼ばず
     HoldFailure { corrupted-evidence } を checkpoint へ返す(U1 FD からの引き継ぎ結線)
  1. evidenceIndex の各 ref を readEvidence で読取。読取失敗 → HoldFailure { evidence-unreadable }(全数列挙)
  2. applicability receipt の subjectSeries が currentSeries と一致する evidence を選別(系列一致 = 同一対象):
     a. 系列一致 evidence が 0 件 → hold { no-applicability-receipt }(判定表 1 行目。
        route=author-new の新規題材で .tla が存在しないケースを含む — 既存 hash 監視の空白を塞ぐ)
     b. 系列一致 evidence のうち最新世代(predecessor 連鎖の末端)を対象に、
        recorded = receipt.subjectIdentity と currentIdentity を compareIdentity で比較:
        stale → hold { stale-evidence }(3 行目。系列は同じだが内容が変化 — 旧 verdict の存在では
        解除しない — FR-007、AC-006)
     c. current かつ route が author-new / revise-model で、対応する current な
        authoring-bundle + model-map 登録が未完 → hold { authoring-incomplete }(2 行目)
     d. current かつ route が impl-only / non-target で terminal-route-receipt が存在 → no-hold(4 行目)
     e. current かつ登録済み + current bundle → no-hold(5 行目)
  3. hold 理由は該当全行を列挙して返す(部分報告しない)
  4. no-hold の basis には根拠 evidence の EvidenceBundleRef を格納する
```

- staleness 判定は U1 `compareIdentity` の完全一致比較を唯一の根拠として再利用する(`unit-of-work-story-map.md` FR-007 行の役割分担 — U2 が判定、U1 が比較関数)。
- 人間の明示的 risk defer は上書きしない — defer の記録・提示は engine checkpoint 側の既存責務(`components.md` §C9 境界)。

## 4. 宣言駆動結線の動作(ADR-6 改訂)

`domain-entities.md` § AdvisoryDeclaration の schema に基づく実行時協調(`services.md` §S7 の構成を宣言駆動へ具体化):

```
checkpoint 発火時(engine、発火点は無変更):
  1. engine が plugin.json の advisories 宣言を読む(一般化点 1)
  2. 宣言の checkpoints に現在 stage が含まれる advisory について evaluator.argv を実行
     — U2 では ["…/tla-authoring.ts", "hold", …] が C9 評価を走らせ typed verdict を返す
  3. verdict が hold / HoldFailure → engine が既存 await-advisory-choice directive を emit(契約無変更)
  4. 人間が run-now を選択 → formalCheck.argv(予約トークン置換済み)を実行(一般化点 2)
  5. 解除は既存の provenance 検証済み receipt のみ(無変更)。report 拒否も既存のまま
```

- engine 変更は上記 2 つの一般化点に閉じる(ADR-6 改訂注記)。実装の変更対象 module と既存 formal-model-check 経路との併存形態は code-generation で既存実装を実測して確定する(`domain-entities.md` § AdvisoryDeclaration の既定 = 併存)。
- evaluator の exit code 契約は既存 CLI 慣例(`component-methods.md` § 共通規約: 0 = 成功 / 1 = typed failure / 2 = usage error)に従い、stdout の typed verdict JSON が判定の正本 — exit code だけで hold/no-hold を読まない。

## 5. CLI 面(`tla-authoring.ts applicability` / `hold`)

| サブコマンド | 入力(argv) | 出力 |
|---|---|---|
| `applicability judge --declaration <json-path> --identity <digest>` | 宣言 + 現在 identity(model-map は自動読取) | route または ApplicabilityFailure |
| `applicability receipt --declaration <json-path> --identity <digest> --approval <json-path \| none>` | 判定 + 承認(subjectSeries は declaration.subjects から導出して receipt へ格納) | ApplicabilityReceipt(値の出力のみ — 永続化は U1 経由) |
| `hold --identity <digest> --series <digest>` | 現在 identity + 現在系列キー(model-map / evidence store は自動読取) | HoldVerdict または HoldFailure |

- `--series` / `--identity` の値の確定責務: 宣言(ChangeDeclaration)を介さない checkpoint 起動時は、**advisory evaluator wrapper(宣言駆動結線の evaluator.argv が指す呼び手側スクリプト — §4 の一般化点 1 が実行する側)**が、U1 `identity extract` を現在の requirements / decisions 文書へ適用して stable ID 集合と aggregateDigest を確定し、同じ ID 集合から `SubjectSeriesKey` を導出して両 flag に渡す。C9 の evaluate 自身は値を受け取るだけで対象選定を所有しない(`components.md` §C2 境界「どの ID 集合を対象にするかの選定は C1/C7 の入力宣言に従う」の checkpoint 面の具体化 — component-dependency.md への波及は本 unit の code-generation 着手前に反映する)。

- 純関数層(judge・evaluate・判定表)と I/O handler 層(model-map / store 読取)を分離し、判定表は in-process seam で全行 unit test する(`memory/project.md` cid:code-generation:c2-doctor-seam 系規律)。

## データフロー(U2 視点)

```
ChangeDeclaration + currentIdentity(U1 C2)
      │ C1.judge(判定表 J1〜J6)
      ▼
route ──(terminal 2 経路)──→ buildReceipt(承認 provenance 検証)──→ U1 C4.build(terminal-route-receipt)
      └─(author/revise)────→ receipt は C7(U5)の bundle part へ
currentSeries + currentIdentity + model-map + EvidenceIndex.refs(U1)
      │ C9.evaluate(系列選別 → 鮮度比較 → hold 判定表 1〜5)
      ▼
HoldVerdict / HoldFailure ──→ 既存 §11a checkpoint(宣言駆動で供給、機構は無変更)
```

## 上流トレーサビリティ

- `unit-of-work.md`(U2 責務・境界)、`unit-of-work-story-map.md`(FR/AC → U2 対応)
- `requirements.md`(FR-001、FR-003〜FR-005、FR-007、§2.4、NFR-001〜NFR-003)
- `components.md` §C1/§C9(判定表・hold 判定表の正本)、`component-methods.md` §C1/§C9/§共通規約、`services.md` §S1/§S7/§オーケストレーションパターン
- `decisions.md` ADR-6 改訂・ADR-7、`functional-design-questions.md` Q1 裁定(人間承認 2026-08-04T18:29:01Z)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T18:41:37Z
- **Iteration:** 1
- **Scope decision:** none

宣言駆動結線とhold判定表の1:1対応は健全だが、C1のJ1〜J6にkind=impl-only×非交差の未被覆組合せが残りC9.evaluateのstale選別条件が自己矛盾しておりAC-006を含む実装可否に架橋できないBLOCKERが2件ある

### Findings

- BLOCKER | business-logic-model.md:9-18 — J1〜J6判定表はChangeKind4値×交差有無8通りのうちkind="impl-only"かつsubjectsがどの登録モデルとも交差しない組合せを被覆しない(J1は空/欠落、J2はnew-subject/semantic-changeの矛盾のみ、J3はnon-target、J4はimpl-only+交差必須、J5はsemantic-change、J6はnew-subject+非交差)。BR-U2-01が『closedな判定表・表外判定は改訂を要する』と宣言しているため、この未被覆入力に対するjudge()の挙動が定義されておらず、実装者は架空の8つ目の行を作らざるを得ない
- BLOCKER | business-logic-model.md:42-53 — C9.evaluate step 2の前提文『currentIdentityに一致するsubjectIdentityを持つevidenceを選別』は等価一致でフィルタするが、直後のsub-case (c)は『evidenceの記録identityがcurrentIdentityと不一致→stale』を判定条件にしており、選別済み集合の中では原理的に発火し得ない自己矛盾になっている。schema上subjectIdentity(AggregateDigest)以外に『同一対象・異内容』を識別する安定キーが定義されていないため、AC-006が要求するstale検出(『旧verdictの存在では解除しない』)の実装可否がFD単体から確定できない

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T18:46:22Z
- **Iteration:** 2
- **Scope decision:** none

8組合せのMECE被覆とSubjectSeriesKeyによる選別/鮮度2キー分離でiteration1の両BLOCKERは実装可能な水準まで閉じており、残る欠落は3成果物とも軽微な伝播漏れに留まる

### Findings

- FOLLOW-UP | business-logic-model.md:26-37 — buildReceiptの疑似コード(step 3「ApplicabilityReceiptを構成」)にsubjectSeriesの算出・格納が明記されておらず、CLI表(§5)とdomain-entities.mdの式定義だけが根拠になっている。中核アルゴリズム自体にも一行追記して実装参照点を一本化すること
- FOLLOW-UP | business-logic-model.md:91 — hold CLIの--seriesは『現在対象のstable ID集合からapplicability judgeと同式で導出済みの値』とあるが、宣言(ChangeDeclaration)を介さないcheckpoint起動時にその『現在対象のstable ID集合』をどのコンポーネントが確定するかがFD 3文書のいずれにも記述がない。呼び手側(advisory evaluator wrapper)の責務として明示するか、component-methods.md §C9の詳細化としてcomponent-dependency.mdへ波及させること
- FOLLOW-UP | business-logic-model.md:50-60 — SubjectSeriesKeyはsubjects集合のID digestのみで系列を同定するため、対象IDが1件でも増減した宣言は既存系列と別系列になりno-applicability-receipt holdへ落ちる。stale検出とは別の運用影響(段階的にsubjectsが変化するauthoring作業でholdが繰り返し発生しうる)がある場合の扱いをbusiness-rules.mdのテスト形状(BR-U2-22a近傍)に一言残すと実装時の解釈揺れを防げる
