# Functional Design 質問記録 — `semi-authorization-core`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— 本 Unit の全設計分岐が (i) 承認済み上流(`component-methods.md` §C1〜C8 のシグネチャ・判定表・梯子表の逐語、`decisions.md` ADR-1〜5、`requirements.md` FR-AUTH-1〜3 / FR-LAD-1〜6 / FR-PIN-1)(ii) 本 FD で実施した機械棚卸し(§棚卸しの記録 — U-4 / D の引き取り)から一意に導出できるためである(`cid:requirements-analysis:always-elect` の執行条項)。唯一の上流宙吊り(SemiAuthorityScope の組み立て結線 — units-generation §12a FOLLOW-UP)も ADR-3 の裁定文から一意に導出される(D3)。
- **判定の申告と記録**: 0 問様式のため `[Answer]` への先記入は構造的に発生しない。per-unit イテレーション(gate なし)であり、ステージゲートは全 Unit 完了後に 1 回。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(projection.mode=full、events=afterMode|grant)の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件)

---

## 機械導出の記録(設計分岐と一次根拠)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | 型・シグネチャ・判定表・梯子表 | `component-methods.md` §C1〜C8 の逐語を採用(本 FD で改変しない)。返り値ドメイン・エラー文字列・throw 文言も逐語保存 | 承認済み application-design(FR へ 1:1 trace 済み) |
| D2 | `semi-mode-gate` の扱い | 削除して `semi-authority` へ**置換**(併存させない) | ADR-1(置換)/ C-7(互換シム禁止) |
| D3 | SemiAuthorityScope の組み立て結線(units-generation §12a FOLLOW-UP の宙吊り解消) | **所属は本 Unit(core)**。`fallbackFingerprints`(`amadeus-intent-autonomy-production.ts:281-289` — 純粋な digest 計算)を export し、**production 層の呼び出し元が組み立てて渡す**。搬送の 3 点 specify: (i) `authorizeInteraction` の第 3 引数 `semiScope?: SemiAuthorityScope \| null`(既定 `null`)。`null` のまま semi の occurrence が来た場合は `human-required: MODE_REQUIRES_HUMAN` へ倒す(fail-closed) (ii) **`AutonomyDecisionInput` へ任意フィールド `readonly semiScope?: SemiAuthorityScope` を追加**(申告付き拡張 — §C4 が `ResolveAutoDecisionInput` へ `authority` を追加するのと同じ様式)し、`decide` の `:607`(HEAD 実測 verbatim `const authorization = authorizeInteraction(projection, input.occurrence);`)を `authorizeInteraction(projection, input.occurrence, input.semiScope ?? null)` へ改訂する — `decide(input: AutonomyDecisionInput)` の外形シグネチャは不変のまま(§C6 整合) (iii) production 層の組み立て点: `commitProductionQuestionDecision`(`:541-543` の既存 fallback 分岐と同じ材料 — `fallbackFingerprints(projection.intentUuid, getField(stateContent,"Scope") ?? "intent")` + `SEMI_ROUTINE_INTERACTIONS`)が scope を組み立てて `decide` の input へ渡し、`authorizeProductionOccurrence`(`:226-234`、内部 `:230` が `authorizeInteraction(projection, target)` を直呼び)は第 3 引数へ同じ scope を直接渡す | ADR-3 Decision 逐語「production 層が `SemiAuthorityScope` を組み立てて `SemiAuthority.of` へ渡す。純関数層は fingerprint の生成方法を知らず、受け取った値の形(`SHA256.test`)だけを検査する」+ ADR-12 系 fail-closed 規範。呼び出し点 2 箇所(`amadeus-intent-autonomy-runtime.ts:607` / `amadeus-intent-autonomy-production.ts:230`)は `grep -rn "authorizeInteraction(" packages/framework/core/tools/*.ts` の出力からの転記(**測定 ref: worktree HEAD `6191bbfc104282fd329d89392c40264b2cef3661`**) |
| D4 | 梯子入口の単一述語 | `authority === null → invalid: "authorization-required"`(mode 直接比較を残さない)。旧 `full-grant-required` 文字列は消滅する — 消費テスト 0 件を実測済み(§棚卸しの記録) | FR-AUTH-2 / `component-methods.md` §C4 |
| D5 | FR-PIN-1 の t431 分割設計 | `tests/unit/t431-intent-autonomy.test.ts:307-313` の 1 テストを 2 テストへ分割: (a) **保存ピン** — walking-skeleton(`:312`)は `human-required` のまま assert 維持。(b) **反転ピン** — stage-gate(`:311`)は `"semi-mode-gate"` → `"semi-authority"` へ、question(`:313`)は `human-required` → 認可済み(`"semi-authority"`)へ反転。反転側は D3 の第 3 引数へテスト内で組み立てた scope を渡す(export される `fallbackFingerprints` を使用) | FR-PIN-1 / `unit-of-work.md` §テスト・ピンの所属 / FR-LAD-1 受け入れ基準(2 assert 同時 green) |
| D6 | 理由コード変化(D 引き取り)の同期対象 | `MODE_REQUIRES_HUMAN` を assert する既存テスト **0 件**、`full-grant-required` **0 件**、`semi-mode-gate` は **t431:311 の 1 件のみ**(= FR-PIN-1 で反転するピンそのもの)— 同期対象は FR-PIN-1 の枠内で完結し、追加の同期作業は発生しない | §棚卸しの記録(U-4 / D の 2 キー全数棚卸し) |
| D7 | テスト層と seam | t440〜t442(予約済み)。純関数(`SemiAuthority.of` / `allowsOccurrence` / `authorizeEffect` / `decisionAuthorityOf` / `authorizeInteraction`)は unit 層 in-process。FR-AUTH-1 (2) / FR-LAD-2 / FR-LAD-4 の統合テスト(journal・state 実 FS)は integration 層。FR-AUTH-2 の落ちる実証は `resolveAutoDecision` の**直接呼び出し**で行う(`decide` 経由では入口ガード到達不能 — 引き取り B) | `cid:code-generation:fs-tests-integration-first` / `component-methods.md` §C6 の申し送り |

## 棚卸しの記録(U-4 / D の引き取り — 2 キー全数棚卸し)

実測コマンドと結果(worktree HEAD、2026-08-05T10:27Z 実行):

| キー | tests/ の hit | packages/framework/core/ の hit |
| --- | --- | --- |
| `MODE_REQUIRES_HUMAN`(定数名・リテラル両キー同形) | **0 件**(allowlist の関数名エントリを除く) | `amadeus-intent-autonomy.ts` のみ(生成点) |
| `semi-mode-gate` | **1 件** — `tests/unit/t431-intent-autonomy.test.ts:311`(FR-PIN-1 の反転対象) | `amadeus-intent-autonomy.ts:478`(型)/ `:516`(生成)/ `amadeus-intent-autonomy-runtime.ts:522` / `:613`(消費 — 本 Unit が C6/C7 で置換) |
| `full-grant-required` | **0 件** | `amadeus-intent-autonomy.ts:702`(生成点 — 本 Unit が D4 で置換) |

帰結: 理由コード・判別子の変化に伴うテスト同期は FR-PIN-1(t431)の枠内で完結する。`tests/.coverage-patch-allowlist.json:5268` の `isFullyAutonomousIntent` エントリは `stop-question-carveout` Unit の同期対象であり本 Unit では触れない。

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式)
- 未解決の設計判断: **なし**(D1〜D7 すべて一意導出。宙吊りだった D3 も ADR-3 裁定文から一意)
- 後続へ委ねる判断: U-6(allowlist 行ピンの機械 remap — 実装時)/ 引き取り B は D7 でテスト設計として固定済み
- 上流との矛盾: **なし**(D3 は units-generation §12a FOLLOW-UP の解消であり、ADR-3 の裁定に従う。C8 書き側(`set-mode` への `policies` 追加)は `semi-policy-carrier` の所有であり本 Unit の diff に現れない)
