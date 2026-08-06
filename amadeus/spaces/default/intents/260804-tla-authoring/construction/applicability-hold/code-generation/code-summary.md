# Code Summary — U2 applicability-hold(Bolt 2、バッチ 2)

上流入力(consumes 全数): U2 functional-design / nfr-design 成果物(READY 確定)、code-generation-plan.md、bolt-plan.md Bolt 2 節(2026-08-04T18:29:01Z 改訂追記)。

## 実装結果(実測)

- ブランチ: `bolt-applicability-hold`(base = tla-authoring-wt f00ce22c3)
- コミット(8件): bc226f379(判定表 + receipt)→ fff81d8f6(C9 hold 表)→ 14d50a408(CLI verbs)→ 02cdc5b38(engine 宣言供給)→ b70a1aa5d(宣言 module 分離)→ d116479da(pin 拡張)→ f2131204e(**レビュー是正: next/report 対称化**)→ 496c1f7f0(NIT 型整理)
- 新設: `plugins/formal-model-check/tools/tla-applicability.ts`(C1 判定表 + receipt + C9 hold 評価)、`packages/framework/core/tools/amadeus-advisory-declaration.ts`(宣言 parse / token 解決 / verdict 写像 / argv-only spawn)、テスト t444×3(unit 46)+ t445×2(integration 30)
- 変更: `tla-authoring.ts`(applicability/hold/advisory verbs)、`plugin.json`(advisories 宣言 + tools 登録)、`amadeus-plugin-activation.ts`(spec-hash 専用へ戻し)、`amadeus-advisory-choice.ts`(宣言分岐 + **next/report 対称化**)、`amadeus-orchestrate.ts`(hostRoot 配線3箇所)、`amadeus-directive.ts`(AdvisoryCode 拡張)

## 独立レビュー(§12a 相当、iteration 2/2)

- iteration 1: **REVISE(GoA 6)** — BLOCKER: `formalCheck: null` 宣言 advisory の next/report 非対称(next=run-now で素通り / report=TLC artifacts missing で永久拒否)。conductor が実測確定(report 側 `isDeclaredAdvisoryCode` grep 0 hit)
- 是正: DECLARED_RELEASE_RULE 1定義共有 + `raisedDeclaredCodes`(report 側の鏡、host 未解決は fail-closed)。落ちる実証 = symmetry describe 4テスト(是正前 9 pass/2 fail の両方向赤 → 是正後 11 pass/0 fail)
- iteration 2: **READY(GoA 1-2)** — BLOCKER 閉包を verbatim 再適用で確認、BR-U2-05/06/08 整合(defer-with-risk 両側解除は BR-U2-06 の明示例外で矛盾なし)、slop なし、NIT 是正済み

## 検証(実測 exit code)

- builder(HEAD d116479da → 496c1f7f0): typecheck 0 / lint 0 / 対象5 + pin = 95 pass 0 fail / full CI RESULT: PASS(840 files / 11,089 assertions。初回 FAIL 2件は dist staleness、`bun run build` 後に解消)
- conductor 裏取り: typecheck 0 / 対象5 + pin 2 = **114 pass / 0 fail**
- referee: `amadeus-swarm check applicability-hold` converged=true / tampered=false
- 統合ツリー(U3 マージ後): typecheck 0 / lint 0 / **full CI RESULT: PASS(842 files / 11,142 assertions / 0 fail)**。統合時に U3 の runTlaAuthoring async 化へ追随する t445 の機械的 await 化を conductor が適用(assert 不変)

## 逸脱・裁定

1. **既存 pin sentinel 改訂**(t-advisory-human-choice-boundaries: "unknown" → "not a code"): 宣言 advisory 導入で "unknown" が正当 slug 化したことから一意に導出される執行として conductor 受理
2. **FD 委任2決定**: (a) 登録済みモデルの trace subjects = model-map エントリの evidence.digest が指す bundle の applicability part から解決(receipt へ subjects 追加) (b) checkpoint 時の subject 決定 = specs/tla/authoring-subjects.json 読取、不在は真の no-hold — レビュー確認済み
3. **既知ギャップ(スコープ外)**: projection が plugin.json を host へ投影しないため、宣言 advisory は自己開発リポジトリでのみ機能する。U6/projection 面の課題として Issue 起票(下記 Refs)

## 申し送り

- decisions.md ADR-6 の「engine 無変更」文言は 2026-08-04 改訂裁定の転記で是正済み(レビュー FOLLOW-UP)
