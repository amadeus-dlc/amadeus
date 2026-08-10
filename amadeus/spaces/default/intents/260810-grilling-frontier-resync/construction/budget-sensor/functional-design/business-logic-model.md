# Business Logic Model — U2 budget-sensor

**Intent**: 260810-grilling-frontier-resync / **Stage**: functional-design / **Unit**: budget-sensor (library)

上流入力(consumes 全数): `requirements.md`(FR-CONTRACT-4 の3態)、`component-methods.md`(関数シグネチャの基底 — 本書が判定フローへ展開)、`components.md`(C3 の単一ファイル所有)、`services.md`(advisory 契約 — exit 0 固定・audit 行 verdict)、`unit-of-work.md`(U2 完了条件)、`unit-of-work-story-map.md`(スライス2)。

## 判定フロー(evaluateQuestionBudget の改訂形)

```text
入力: questionsファイル行列 lines、depth(state 由来 | null)、record 日付
1. marker = detectGrillingMarker(lines[0..9])
   ├─ 正本 verbatim 一致 → grilling モード
   ├─ amadeus-grilling: タグあり・異形 → finding(malformed-marker, warning) → 通常モードで続行
   └─ なし → 通常モード
2. depth 解決:
   ├─ null → no-depth(従来どおり静か pass)
   ├─ 3値内 → ceiling = {4,8,12}[depth]
   └─ 3値外 → finding(unknown-depth, warning)+ceiling なしで終了(pass)
3. count = 質問数(既存カウント述語を変更しない)
4. 通常モード: count > ceiling → over-budget FAIL(現行どおり) / 以内 → within-budget
5. grilling モード:
   ├─ count ≤ ceiling → within-budget(informational: grilling)
   └─ count > ceiling →
       ├─ 超過記録行(verbatim、depth 一致・questions 数値)あり かつ 刈りノード列挙節あり
       │    → PASS(informational: justified-overrun)
       └─ いずれか欠落 → FAIL(missing-justification / missing-deferred-list を個別 finding)
6. enforced = record 日付 ≥ cutoff(260809)— 全 finding に同一適用
```

テキストフォールバック: マーカーが grilling を宣言した questions ファイルだけが「記録付き超過」を許され、記録か列挙が欠ければ従来より厳しく FAIL する。マーカーが無ければ挙動は現行と完全同一。

## エラー分類(error-classification 適用)

| 状態 | 分類 | 扱い |
|---|---|---|
| 異形マーカー | fault(書き手の様式誤り) | warning finding(loud、pass 維持 — advisory) |
| 超過+記録なし | error(契約違反) | FAIL finding |
| 未知 depth | fault(上流 state の異常値) | warning finding(fail-open の封鎖) |
| ファイル読取不能 | 既存経路のまま(変更しない) | 既存 |

## 不変条件

- マーカー非検知ファイルの verdict は改訂前後で **byte 同一の判定結果**(通常モードの挙動不変 — 回帰面)。
- 全経路で exit 0(advisory 契約)・verdict は finding JSON と audit 行のみ。
- 記録行の parse は verification-numeric-parse 準拠(`questions=` は数値 parse、失敗は記録行不成立として扱う)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T06:55:21Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY(GoA 7): FR→BR 写像・マーカー2種の cross-unit verbatim 一致・語彙非交差(ANSWER_TAG_RE 実読)は健全。BLOCKER 2件 — (1) 刈りノード列挙節の検出仕様(見出し verbatim・走査範囲・型/parse 契約)が U1 の BR-U1-4 から未引用で未定義、vacuity guard の対象からも欠落 (2) cutoff/enforced の適用順序が判定フロー Step 2 の早期終了と BR-U2-8(unknown-depth へも cutoff 同一適用)で自己矛盾し、pre-cutoff record の回帰不変条件を破りうる。FOLLOW-UP 2件(pass 計算式の既習パターン依拠の明文化 / GrillingMarker の判別ユニオン化)

### Findings

- BLOCKER | 刈りノード列挙節の検出仕様が未定義 — U1 BR-U1-4 の見出し verbatim を U2 3成果物が未引用(grep 0 hit)、型・parse 契約が domain-entities に不在、走査範囲未指定、vacuity guard 対象外
- BLOCKER | cutoff(enforced)の適用順序が自己矛盾 — 判定フロー Step 2 の unknown-depth 早期終了が Step 6 の enforced を経由せず、BR-U2-8(cutoff 同一適用)と衝突。pre-cutoff record の回帰不変(改訂前後 byte 同一)を破りうる。malformed-marker の enforced 合流も未記述
- FOLLOW-UP | warning finding と既存 verdict() ヘルパー(pass = findings.length === 0)の整合 — reason 区別・findings 空の既習パターン依拠を明文化
- FOLLOW-UP | GrillingMarker を判別ユニオン({kind:none|valid|malformed})へ — 無効状態の構造的排除(parse-don't-validate)
