# Business Logic Model — u4-conduit-parity

上流入力(consumes 全数): requirements.md(FR-5 受け入れ基準)、components.md(C6/C7)、component-methods.md(テスト契約)、unit-of-work.md(境界)、unit-of-work-story-map.md(Bolt 内実装順の物語根拠)、services.md(read-only 検査)。

## フロー: 面ごとの Red→Green 反復(bolt-plan の実装順どおり)

```
1. stage-protocol.md へ semi の decide-question 操作段落を新設
   (書式: :135 の full 段落と並ぶ semi 段落 — :131 の契約宣言に対応する操作手順。
    carrier 様式・fail-closed 分岐(human-required/conflict/parked)・AUTO_DECIDED 記録は
    full 段落と共通である旨を明記し、milestone 検収(unreviewed キュー)の提示義務を含める)
2. SKILL.md 6面+commands 2面へ導線追記(1面ずつ: 追記 → パリティテスト該当面の Red→Green)
   - 起動宣言: `/amadeus --scope <name> --autonomy <none|semi|full> "<説明>"`(u2 確定仕様)
   - :248 整合: 「AUTONOMY IS NEVER INFERRED」に「canonical audit に記録された mode による
     エンジン主導の自動裁定は『推論』ではない」の1文を追加(全面同旨)
3. utility help / README / docs/reference/24 対訳(日英同時 — docs-language-ownership)
4. パリティテスト完成: 全面 Green → 落ちる実証(1面から語彙を除去して赤 → 復元 → 残渣ゼロ確認)
```

テキストfallback: protocol → 8面 → help/README/docs → テスト完成の順に、面単位で Red→Green を回す。

## パリティテストの検査ロジック

1. `harness/*/skills/amadeus/SKILL.md` と `harness/*/commands/amadeus.md` を glob(検出0件は設定エラーとして赤 — 空集合 fail-closed)
2. 固定4面(help 文字列は amadeus-utility.ts の usage 定数を読み取り、README、docs 対訳2ファイル、stage-protocol)を追加
3. 各面 `--autonomy` ≥1 を assert。stage-protocol は semi × decide-question の共起段落を追加 assert
4. 失敗時: 欠落面パス+欠落語彙の列挙

## エラー分類

- 面 glob 0件 = テスト設定の欠陥 → 赤(fail-closed — e-lsscg-empty-argv-unscoped-guard の空集合規律)
- 語彙欠落 = 導線 drift → 赤(本テストの目的)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:49:33Z
- **Iteration:** 1
- **Scope decision:** none

面集合8面実測一致・:248/:125/:131/:135 逐語確認・count-free/fail-closed/落ちる実証設計妥当・u2 仕様整合。NIT 2(parked vs fail-closed 語彙・unreviewed キューと milestone gate の概念分離)は CG 起草時是正指示

### Findings

- NIT | business-rules.md:9 — parked は hard stop、fail-closed は human-required/conflict/aborted の3値 — :135 逐語区別を CG 起草時に写す
- NIT | business-logic-model.md:11 — unreviewed キュー(事後検収)と milestone 人間ゲート(同期)は別機構 — 融合表現を semi 段落起草時に分離
