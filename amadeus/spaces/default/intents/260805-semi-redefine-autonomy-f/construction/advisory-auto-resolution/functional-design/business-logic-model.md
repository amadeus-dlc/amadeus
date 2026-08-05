# Business Logic Model — `advisory-auto-resolution`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `unit-of-work.md` §`advisory-auto-resolution`(C16⇄C17 の統合根拠と core への依存理由)、`unit-of-work-story-map.md` §`advisory-auto-resolution`(実装 5 項目と順序根拠)、`requirements.md` 領域 G(FR-ADV-1〜5 の受け入れ基準と現行 verbatim)、`components.md` C16/C17 行と ADR-6/9/11、`component-methods.md` §C16 / §C17(処理順・受理 3 点表・schema 契約の逐語 — 本 FD の正本)、`services.md` §プロセス境界(engine P3)と `:192`(withAuditLock の指摘)。

設計分岐の裁定は `functional-design-questions.md` D1〜D7(すべて機械導出。U-2 はユーザー回付済み・観測のみ)。

---

## 処理シーケンス(pending advisory 1 件が無人解決されるまで)

```
next → directive 構築(run-stage)
  └─ applyPendingAdvisoryGuard(amadeus-orchestrate.ts:781-800 — 改訂)
       ├─ guard = guardAdvisoryChoices(...)        [既存 — :599 の withAuditLock 区間内で判定し return]
       ├─ guard.kind === "allow" → return directive [既存・無改変]
       └─ hold →
            auto = resolveAdvisoryChoiceAutonomously({projectDir, hold, phase, graphRevision})  [C16 — 新規]
              ├─ 1. occurrence 写像(kind:"question"、selector に instance — ADR-6)
              ├─ 2. effect registry(run-now = workflow-reversible / defer-with-risk = quality-waiver)
              ├─ 3. commitProductionQuestionDecision へ委譲   [既存 :524 — 新しい裁定経路を作らない]
              └─ 4. 翻訳: decided ∧ run-now → resolved / それ以外すべて → human-required
            ├─ auto.kind === "resolved" → recordAdvisoryChoice(..., {kind:"auto-decision", ...})  [C17]
            │                              → return directive(run-stage のまま — FR-ADV-1)
            └─ それ以外 → AwaitAdvisoryChoiceDirective(現行のまま — FR-ADV-2 の fail-closed)
```

テキスト代替: guard が hold を返した場合のみ C16 が起動し、advisory を `kind:"question"` の occurrence へ写像して既存の質問裁定経路(`commitProductionQuestionDecision`)で梯子にかけ、`run-now` が決定されたときだけ C17 の受理関数へ `auto-decision` provenance で receipt を書き、元の `run-stage` directive をそのまま返す。解決できない全経路(mode=none・失効 grant・scope 不一致・`parked` / `conflict` / `aborted`・`defer-with-risk` 選択)は現行どおり `await-advisory-choice` へ落ちる — 分岐が 2 つしかないことが FR-ADV-2 の構造的保証(`component-methods.md` §C16 の逐語)。

## アルゴリズム 1 — C16 `resolveAdvisoryChoiceAutonomously`

`component-methods.md` §C16 の処理順 1〜4 を逐語採用(D1)。要点:

- **occurrence 写像**(手順 1): `interactionId = advisory-<advisory_instance>` / `selector = advisory:<plugin>:<code>:<advisory_instance>` / `optionIds = hold.runRequired ? ["run-now"] : ["run-now", "defer-with-risk"]`(FR-ADV-4 の主機構 — D3)。SAFE_ID 適合は §C16 の実測表で確認済み。
- **effect registry**(手順 2): `run-now → workflow-reversible` / `defer-with-risk → quality-waiver`。`quality-waiver ∈ PROHIBITED_EFFECTS`(`amadeus-intent-autonomy-production.ts:69-75` 実測)が従機構(D3・引き取り C)。
- **裁定**(手順 3): 既存 `commitProductionQuestionDecision:524` へ委譲。semi での受理は `semi-authorization-core` の認可基体(第1関門 → 梯子)を経由する(`unit-of-work.md` §依存の理由)。
- **翻訳**(手順 4): `decided ∧ selectedOptionId === "run-now"` のみ `resolved`。他はすべて `human-required`(理由文字列を保持)。

## アルゴリズム 2 — C17 受理関数の置換

`recordProtectedAdvisoryChoice:864-900`(行番号は component-methods.md の測定時点 `d405e34c5` のもの — 最新実測は D4 の HEAD `6191bbfc…` を正とする)→ `recordAdvisoryChoice(projectDir, choice, provenance, now?)` へ**置換**(並存させない — FR-ADV-3)。受理 3 点の判別は §C17 の表を正本とする(D1):

| 受理点 | `human-turn` | `auto-decision` |
| --- | --- | --- |
| grounding | 現行と同値(監査 HUMAN_TURN 照合) | journal に当該 `decisionId` の `AUTO_DECIDED` 実在(`readIntentAutonomyTransactionsFromAudit` 照会) |
| 重複排除 | `(shard, eventIdentity)` | `decisionId` 単独一意。**加えて** identity 単位の provenance 跨ぎ排除を受理前段へ(既存 `acceptsFreshChoice:838-850` の引き上げ — 新索引を作らない) |
| 提示照合 | 現行と同値(`DECISION_RECORDED` 照合) | occurrence `selector` と open pending identity の一致 |

store schema は `parseStore:450-467` の `!== 1` → `!== 2`。schema 1 store は `{ok:false}` → `guardAdvisoryChoicesLocked:743` の既存分岐で **fail-closed hold**(読替コードを書かない — ADR-9)。

## ロック区間の直列性(U-3 の設計前提 — D4)

実測(worktree HEAD `6191bbfc104282fd329d89392c40264b2cef3661`、`grep -n "withAuditLock" amadeus-advisory-choice.ts`): lock 区間は 4 箇所 — `:518` = `advisoryChoicePresentationFields`(提示フィールド生成 — C16 の呼び出し連鎖上に**無い**)、`:599` = `guardAdvisoryChoices`(判定を終えて return した時点で解放)、`:766` = `closeAdvisoryInstancesForStage`(ステージ終了時の close — 連鎖上に**無い**)、`:787` = 受理(`recordAdvisoryChoice` 側)。C16 の連鎖(hold 受領後 → C16 → `commitProductionQuestionDecision`(独自 lock)→ `recordAdvisoryChoice`(`:787` lock))に現れる lock は `:599`(解放済み)と `:787` のみであり、`:518` / `:766` は別動線(提示・close)からのみ呼ばれるため重ならない — 4 箇所全てについて直列性が成立する(§12a iteration 1 FOLLOW-UP を受けた追補実測)。U-3 の確定条件(実装時実測)は保持し、万一重なる場合は C16 の呼び出し位置を再検討する。

## データフロー

| 段 | データ | 供給元 | 消費先 |
| --- | --- | --- | --- |
| 1 | `AdvisoryChoiceGuardResult`(hold) | `guardAdvisoryChoices`(既存) | C16 |
| 2 | `InteractionOccurrence`(question 写像) | C16 手順 1 | `commitProductionQuestionDecision` → 認可基体・梯子(core Unit) |
| 3 | `AutoDecisionRecord` + `AUTO_DECIDED` | 梯子(既存経路) | C16 手順 4 の翻訳 |
| 4 | `AdvisoryChoiceReceipt`(schema 2、`auto-decision` provenance) | `recordAdvisoryChoice`(C17) | store(永続)+ 後続 guard の allow 判定 |
| 5 | 元 directive(`run-stage`) | `applyPendingAdvisoryGuard` | conductor(走行継続 — FR-ADV-1) |

## 検証シーケンス(t449〜t451)

- **t449(unit)**: C16 の写像・registry・翻訳 — optionIds の runRequired 分岐(FR-ADV-4 主機構: `runRequired: true` で `defer-with-risk` が選択肢空間に存在しない)、selector 様式、翻訳 4 分岐。落ちる実証: optionIds 分岐を無条件 2 値にすると赤。
- **t450(integration)**: FR-ADV-1(full grant 下 pending 1 件で `next` が `run-stage` を返し `AUTO_DECIDED` 記録)/ FR-ADV-2(mode=none・失効 grant・scope 不一致で `await-advisory-choice`。落ちる実証: 認可判定を無条件 true 化で赤)/ schema 1 store の fail-closed hold(ADR-9)。実 FS(store・journal)のため integration 層。
- **t451(unit)**: 引き取り C(`PROHIBITED_EFFECTS` に `quality-waiver` 収載 — 除去で赤)+ C17 受理 3 点(auto-decision 側の grounding / 重複排除 / 提示照合。provenance 跨ぎ二重 receipt の拒否 — FR-ADV-3)。
- semi での貫通(semi mode + pending advisory)は `semi-authorization-core` 着地後の統合ケースとして t450 に含める(依存順は delivery-planning の波編成どおり)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T10:55:57Z
- **Iteration:** 1
- **Scope decision:** none

4成果物はcomponent-methods.md §C16/§C17の処理順・受理3点表・schema契約を逐語で保持し、FR-ADV-1〜4はV1〜V10で束ねられ、U-2は観測限定を守り、D4はconductor実測(6191bbfc)と一致しU-3実装時実測義務を保存している

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/advisory-auto-resolution/functional-design/business-rules.md:31-46 — テスト固定表(V1〜V10)にFR-ADV-5の受け入れ基準(「run_required 経路が plugin 非依存」と読める記述がなく、射程注記が併記されていること)に対応するケースが1件も無い。R6でFD自身は射程注記を守っているが機械検証手段(grep対象面+検索語等)が本Unit成果物内で束ねられていない。requirements.md:363-364で§12a済みFOLLOW-UPとして既知だが、code-generation着手前に検証手段(自成果物の逐語走査、または semi-docs-revision との共同grepチェック)を明示することを推奨する
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/advisory-auto-resolution/functional-design/business-logic-model.md:54 — D4のロック直列性分析はgrep実測4箇所(:518 record系 / :599 guard / :766 / :787 受理)のうち:599と:787のみ説明し、:518と:766がC16→commitProductionQuestionDecision→recordAdvisoryChoiceの呼び出し連鎖上に無いことを確認していない。U-3の実装時実測義務(重なる場合は呼び出し位置を再検討)は保存されているためBLOCKERではないが、conductorはcode-generation着手前に:518/:766の対応関数を実測し、直列性の結論が4箇所全てについて成立することを確認する必要がある(スコープ外読取のためこの実測は本レビューでは実施できない)
- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/advisory-auto-resolution/functional-design/business-logic-model.md:41-42 — Algorithm 2 の recordProtectedAdvisoryChoice:864-900 引用(component-methods.md 由来の旧測定 ref)と D4 の新測定 ref(6191bbfc104282fd329d89392c40264b2cef3661、:787)が同一機能域を指しながら異なる行番号で並記され、どちらが最新かの注記がない。実装時の混乱防止のため、:864-900 は component-methods.md 側の測定時点のものであり D4 の :787 が最新実測である旨を一文添えることを推奨する
