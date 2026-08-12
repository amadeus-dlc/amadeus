# Security Design — U2 budget-sensor

**Intent**: 260810-grilling-frontier-resync / **Stage**: nfr-design / **Unit**: budget-sensor (library)

上流入力(consumes 全数): engine directive の解決済み consumes = `business-logic-model.md`(U2 functional-design — 判定フロー Phase 3→4 の単一 cutoff ゲートと fail-closed 縮退列の正本。本設計の §2/§3 が直接依拠)。stage frontmatter 宣言の security-requirements / tech-stack-decisions ほかは本スコープ(self-feature)が nfr-requirements を SKIP するため `consumes_absent`(`expected: true`)— fallback として `requirements.md`(FR-CONTRACT-3/4)と U2 functional-design の `business-rules.md`(BR-U2-1〜9)を設計出典として実参照する。欠落成果物の内容は発明しない。

## 脅威面の同定(library kind — 事後検査モジュール)

U2 は既存センサー dispatcher に embedded 実行される検査ロジック+契約テストであり、ネットワーク境界・認証主体・保存データストアを持たない。適用される脅威面は次の3つ。

1. **検査の偽装・空文化(検証劇場化)** — 検査述語が緩い受理・無音通過・語彙衝突を持つと、questions ファイル側の細工で「超過したのに記録がない」状態を PASS に見せられる。
2. **fail-open の残存** — 未知 depth 値・異形マーカーの無音通過は、検査対象外を装う迂回路になる。
3. **回帰面の完全性** — cutoff 前 record・マーカー非検知ファイルへの検査挙動変更は、既存の検査結果を無断で書き換える(過去 verdict の信頼を壊す)。

## 設計(各面の統制)

### 1. 検査の偽装耐性 — verbatim 照合+vacuity guard

- 超過記録行・マーカーの照合は verbatim 一致(BR-U2-1/2)— 部分一致・緩い regex を置かないことで、細工トークンによる偽 PASS の余地を述語設計段で除去する。
- 正本トークン3種が既存述語(ANSWER_TAG_RE・「承認」行走査・質問カウント述語)と交差しないことをテストで固定する(BR-U2-4 の2方向 assert)— 語彙衝突による検査の無音空文化(vocabulary-collision-vacuity-guard)と、逆方向の回答証跡偽装の両側を封鎖する。
- 刈りノード列挙節の判定は「節の存在のみ」(BR-U2-2b)— 項目本文を解釈しないため、本文内容による述語誘導の面がそもそも無い。

### 2. fail-open 封鎖 — loud finding と単一ゲート(enforced=true 時)

本節の loud finding 化は cutoff 適用後(enforced=true)の挙動である — cutoff 前 record への縮退(findings=[]・現行語彙 reason)は §3 の回帰面が定める。

- 未知 depth の `no-depth, pass:true` 無音通過を unknown-depth warning finding へ変更(BR-U2-3、FR-CONTRACT-4(ii))。異形マーカーは malformed-marker warning(BR-U2-1)。いずれも pass は維持(advisory 契約)だが loud — 「検査対象外を装う」迂回路を可視化する。
- cutoff 適用は分岐途中でなく単一ゲート点(BR-U2-8、business-logic-model.md 判定フロー Phase 3→4)— 新 finding が cutoff を迂回する経路の不在を、全入力組合せのテストで固定する(BR-U2-9)。ゲートの一点化は「どの分岐が検査を免れるか」という攻撃面の列挙を1点の検証へ縮約する統制である。

### 3. 回帰面の完全性 — 挙動変更の境界固定

- cutoff 前 record への verdict は全フィールド不変(BR-U2-9)。マーカー非検知かつ depthKind ≠ unknown のファイルへの verdict も不変(business-logic-model.md の限定形回帰不変)— 検査強化が過去・対象外の verdict を無断改変しないことを機械検証する。
- severity 必須キーの追加は stdout JSON の形を変える意図した契約変更として明示(判別を型で運ぶ parse-don't-validate — 省略可能フィールドで判別を曖昧にしない)。

## 実行権限・依存の不拡大

- 新規プロセス・ネットワーク呼び出し・環境変数・外部依存を追加しない — 既存 dispatcher の embedded 実行(exit 0 固定、verdict は JSON stdout+audit 行)という既存契約を維持する(component-methods.md)。runtime dependency の追加禁止(project.md Forbidden)に整合。
- テストは in-process seam(関数直接呼び出し)+実 FS 分は integration 層(BR-U2-7)— 検査ロジックへのテスト専用分岐を本番コードに置かない(construction phase guardrails)。

## 非適用の明示

- **認証・認可・暗号化・CSRF/XSS・secrets 管理・新規 audit logging 面**: 非適用 — U2 はネットワーク境界・認証主体・保存データストアを持たない library であり(unit-of-work.md「Deployment model: N/A」)、audit への書込は既存 dispatcher の SENSOR_PASSED/FAILED 経路をそのまま使う(新規面を作らない)。構造的非適用(cid:nfr-design:c1)。
- 宣言済み security requirement は存在しない(nfr-requirements SKIP)— requirements.md の FR 群が唯一の上流。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T08:18:44Z
- **Iteration:** 1
- **Scope decision:** none

READY(GoA 2): 2成果物はステージ契約(Step 5/6)と produces_kinds(library = security-design + logical-components)に適合。上流ヘッダは consumes_absent(nfr-requirements SKIP)を正しく開示し fallback 出典を明示。business-logic-model.md との実読照合で単一 cutoff ゲート引用は原本一致、回帰不変は限定形(マーカー非検知かつ depthKind≠unknown)を正しく反映。新規依存・id 発明・全称断定なし。障害ドメイン・爆発半径は library の実態(advisory・exit 0 固定)と整合。FOLLOW-UP 2件(関数命名の3関数正本統一 — conductor 同一ターン反映済み / FD 側 BLOCKER B ギャップの継続開示 — 本日のユーザー裁定で解消済みにつきゲートで開示)と NIT 1件(§2 の enforced=true 限定句 — 反映済み)。business-rules.md 等スコープ外引用の一次実在は未検証(限界開示)。

### Findings

- FOLLOW-UP | logical-components.md の検査述語群を business-logic-model.md Phase 2 の3関数(detectGrillingMarker / detectDeferredSection / parseJustificationLine)正本へ統一し component-methods.md 案との対応関係を明記 — 反映済み
- FOLLOW-UP | business-logic-model.md Review i2 の未解消 BLOCKER(FR-PROTO-8 AC)は 2026-08-10 ユーザー裁定(AC 機械面 = 事後検査の落ちる実証)+閉包確認 i3 READY で解消済み — ゲート報告で継続開示
- NIT | security-design.md §2 に enforced=true の限定句を追加し §3 との守備範囲を明示 — 反映済み
