# Scope Definition 質問票 — 260810-numeric-provenance-guard

上流入力(consumes 全数): intent-statement(../intent-capture/intent-statement.md を全問の前提として実読)。feasibility-assessment / constraint-register は self-feature スコープで feasibility ステージが SKIP のため未生成(設計どおりの不在 — 代替として Issue #2815 とクロスレビュー収束コメント2件を制約源に用いた)。

## 確定済みスコープ境界(上流出典 — 本ステージでは再質問しない)

capability 目録は全件 SETTLED のため、scope-boundary 質問2問(最小価値スコープ / Must-Nice 区分)は省略する:

| # | capability | 判定 | 出典 |
|---|---|---|---|
| 1 | 数値 provenance advisory センサー(manifest + 検査ツール) | SETTLED(in) | Issue #2815 対象範囲 + ユーザー起動指示「第1段」 |
| 2 | 落ちる実証 fixture(併記なし数値断定で FAILED) | SETTLED(in) | Issue 完了条件(1) |
| 3 | corpus sweep + 観測レンジ内閾値・適用範囲確定 | SETTLED(in) | Issue 完了条件(2) + reviewer-1「任意ではなく成立条件」 |
| 4 | 適用限定(定型 ack・軽量報告は対象外)の検査への写像 | SETTLED(in) | Issue 完了条件(3) |
| 5 | 第2段(併記コマンドの再実行可能書式検査) | SETTLED(out) | Issue「第2段(別裁定可)」+ ユーザー起動指示「第1段 = 併記存在の advisory センサー」 |
| 6 | 全数値の自動再実行照合(完全検証) | SETTLED(out) | Issue 代替案・非採用理由 |

境界内の実現方式判断(enforcement cutoff 採否・#1237 述語エンジン共通化・対象クラス定義)はスコープ境界ではなく設計判断であり、intent-capture questions で設計段へ委譲済み。

## 質問と裁定(operational — 常時質問3問)

### Q1. capability 間の依存関係

[Answer]: 執行(工程論理からの一意導出): 述語定義は corpus sweep の入力であり、sweep の実測が対象クラス・閾値(capability 3)を確定し、それがセンサー本実装(capability 1)の matches・閾値定数を決める。落ちる実証(capability 2)と適用限定検査(capability 4)は本実装後にのみ意味を持つ。すなわち 述語プロトタイプ → sweep → 確定 → 本実装+fixture の依存連鎖(reviewer-1 の実測「素朴述語は未併記率 27.6〜66.1% でスコープ依存 2.4 倍」が、sweep 先行なしの本実装が手戻りになることを裏付け)

### Q2. 実施順序の方針

[Answer]: measurement-first-dependency-order(測定先行・依存順)。AUTO_DECIDED `auto-decision-6c976c8de24f6ed352747b0c5212f5bf`(selected: `measurement-first-dependency-order`、basis: agent-recommendation、solo-election 劣化 loud 記録、reviewState: unreviewed)。norm 根拠: cid:code-generation:c1-threshold-inside-observed-range(閾値は観測レンジの内側 — 観測が先)+ team.md priority-vs-dependency(依存の根元を最優先)

### Q3. 特定 capability に紐づくハード期限はあるか

[Answer]: なし(執行: Issue #2815 は P3「いつか対応」、ユーザー起動指示にも期限の言及なし)

## 裁定の記録

- Q1・Q3 は執行クラス(一次証拠からの機械的一意導出、cid:requirements-analysis:always-elect の執行条項)。Q2 は full グラント下の decide-question 梯子で AUTO_DECIDED(unreviewed — phase 境界で人間検収可能)
- ユーザー承認: 2026-08-10T08:32:24Z(HUMAN_TURN — full グラント発行。INTENT_AUTONOMY_TRANSACTION_COMMITTED 08:32:28Z、grant_id: intent-grant-637c32aed3f69d2db6a64fc18336aaa6)
