# Functional Design 質問記録 — `advisory-auto-resolution`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— 本 Unit の全設計分岐が承認済み上流(`component-methods.md` §C16 / §C17 の処理順・受理 3 点表・schema 昇格の逐語、`decisions.md` ADR-6 / ADR-9 / ADR-11、`requirements.md` FR-ADV-1〜5)から一意に導出できる。唯一の仕様裁定事項 U-2 は delivery-planning が **Bolt 1 の walking-skeleton ゲートでユーザーへ回付済み**であり(`delivery-planning-questions.md` §ユーザー裁定へ回付する事項)、本 FD は観測面の記録のみを行い単独決定しない(エスカレーション正準リスト (4))。
- **判定の申告と記録**: 0 問様式のため `[Answer]` への先記入は構造的に発生しない。per-unit イテレーション(gate なし)。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(projection.mode=full、events=afterMode|grant)の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件 — U-2 は既回付)

---

## 機械導出の記録(設計分岐と一次根拠)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | C16 の処理順(occurrence 写像 → effect registry → 裁定 → 翻訳)と C17 の受理 3 点表・schema 昇格 | `component-methods.md` §C16 / §C17 の逐語を採用(本 FD で改変しない) | 承認済み application-design(FR-ADV-1〜4 へ 1:1 trace 済み) |
| D2 | selector への instance 含有と梯子縮退 | `selector = advisory:<plugin>:<code>:<advisory_instance>`(instance = randomUUID)。帰結として confirmed-policy 段(selector 完全一致)と history 段(selector 一致)が構造的に不一致となり**実効 3 段**(norm / solo-election / agent-recommendation)へ縮退する — これは ADR-6 の既決トレードオフであり、その実運用許容可否が U-2 としてユーザー回付済み。本 Unit は縮退の観測(裁定の basisKind 分布)を diary へ記録するのみ | ADR-6 / U-2(`unit-of-work.md` §未確定事項の引き取り「観測のみ」) |
| D3 | FR-ADV-4 の 2 面封鎖 | 主 = 選択肢空間(`hold.runRequired ? ["run-now"] : ["run-now","defer-with-risk"]`)/ 従 = 効果分類(`defer-with-risk` → `quality-waiver` ∈ `PROHIBITED_EFFECTS`)。`amadeus-directive.ts` は触らない(C-3) | ADR-11 Option A / `component-methods.md` §C16 手順 1〜2 |
| D4 | C16 の呼び出し位置と U-3(withAuditLock 再入)の設計前提 | `applyPendingAdvisoryGuard`(`amadeus-orchestrate.ts:781-800`)内で `guardAdvisoryChoices` の**戻り値(hold)を受けた後**に呼ぶ — lock 実測(worktree HEAD `6191bbfc104282fd329d89392c40264b2cef3661`): `guardAdvisoryChoices:599` は `withAuditLock` で自区間を閉じてから return するため、その**外側**で C16 → `commitProductionQuestionDecision`(内部で自分の lock 区間を張る)→ `recordAdvisoryChoice`(`:787` の lock 区間)を順に呼べばロック区間は直列で重ならない。**再入は発生しない設計**だが、U-3 の確定条件どおり実装時に実測で閉包する(重なる場合は呼び出し位置を再検討) | `unit-of-work.md` U-3 / `services.md`:192 / lock 構造の実測(`grep -n "withAuditLock" amadeus-advisory-choice.ts` → `:518` / `:599` / `:766` / `:787`) |
| D5 | U-7(run-now 後の formalCheckRoute 実行者)の扱い | 無人経路が `run-now` を選んだ場合、`applyPendingAdvisoryGuard` は元 directive(`run-stage`)を返すため `await-advisory-choice` の `formalCheckRoute` は emit されない。実行の担い手は**次の conductor ターンが run-stage 本文内で formal check を実行する**形とし、FR-ADV-5 の射程注記(`run_required` 経路は plugin 非依存ではない — `formalCheckRoute:685` のハードコード実測)を保存する。最終確定は code-generation の実装時実測(U-7 の確定条件どおり) | `unit-of-work.md` U-7 / FR-ADV-5 |
| D6 | 引き取り C(quality-waiver 収載 assert) | t451 に `PROHIBITED_EFFECTS` の `quality-waiver` 収載を assert するテストを置く(`amadeus-intent-autonomy-production.ts:69-75` 実測 verbatim を §C16 手順 2 が転記済み)。落ちる実証: 配列から `quality-waiver` を除去すると赤 | 引き取り C(`unit-of-work.md` §未確定事項の引き取り) |
| D7 | テスト層と seam | t449(C16 unit — 写像・registry・翻訳の純関数部)/ t450(integration — FR-ADV-1/2 の guard 貫通と receipt 記録、実 FS)/ t451(unit — D6 の収載 assert + C17 受理 3 点)。`amadeus-advisory-choice.ts` の in-process 駆動は export 済み関数経由 | `unit-of-work.md` §テスト番号の予約 / `cid:code-generation:fs-tests-integration-first` |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式)
- 未解決の設計判断: **なし**(D1〜D7 一意導出。U-2 はユーザー回付済み・観測のみ、U-3 / U-7 は確定条件どおり実装時実測として設計前提を D4 / D5 で固定)
- 後続へ委ねる判断: U-3 / U-7 の実装時実測、U-6(allowlist 行ピン remap — 自 PR)
- 上流との矛盾: **なし**(D1 は §C16/§C17 の逐語採用)
