# Requirements Analysis 質問票 — 260810-numeric-provenance-guard

上流入力(consumes 全数): intent-statement(../../ideation/intent-capture/intent-statement.md — 効能範囲・設計委譲4点の正本)、scope-document(../../ideation/scope-definition/scope-document.md — In/Out 境界と sequencing)、business-overview(codekb — 検査対象となるワークフロー成果物の業務文脈)、architecture(codekb — センサー機構の構造面)、code-structure(codekb — 正本/dist 境界とテスト層区分)。加えて re-scans/260810-numeric-provenance-guard.md(本 intent の RE 実測)を全問の技術前提とした。

## 判定方針(E-OC1 ヘッダ)

intent-capture で設計段へ委譲された4点のうち、requirements 段でテスト可能に固定すべき3点(D1-D3)を full グラント下の decide-question 梯子で裁定した。対象クラスの定義方式(成果物種別 × 数値の意味クラス)はユーザー起動指示(b)とクロスレビュー収束が確定済みのため執行。

## 質問と裁定

### D1. 遡及適用 — enforcement cutoff の採否

[Answer]: adopt-answer-evidence-cutoff(answer-evidence 型 cutoff を採用: record dir 名先頭6桁 >= CUTOFF のみ検査、undatable は pre-cutoff 扱い fail-open)。AUTO_DECIDED `auto-decision-31132b8e29cfe1a140e8009cc68ff081`(basis: agent-recommendation、reviewState: unreviewed)。根拠: 既存コーパス 8,503 md(RE §9 実測)への無条件遡及は reviewer-1 実測(未併記率 27.6〜66.1%)により findings 3-4桁規模 = advisory 信号の希釈。answer-evidence の `intentDateFromPath`(amadeus-sensor-answer-evidence.ts:62-69)が既製の型

### D2. #1237(引用実在チェッカー)との述語エンジン共通化

[Answer]: no-shared-engine-defer-to-1237(本 intent では共有基盤を新設しない。nfr-budget 鋳型の自前近傍窓で実装し、共通化判断は #1237 実装時に委ねる)。AUTO_DECIDED `auto-decision-a35223978f0a434916db218f15ac19b2`(basis: agent-recommendation、reviewState: unreviewed)。根拠: RE §8 実測 — 汎用 md 走査ユーティリティは現存せず「各センサーが readFileSync+split を自前で持つ」のが現行の一貫パターン; adapter・外部契約の先行着地は inception.md N3 で禁止(実装+配線が同一 intent に揃わない共有面を作らない); sensor 間の相互 import は既存イディオム(amadeus-sensor-flags.ts:20-24)のため、#1237 側が将来必要になれば export 化で足りる

### D3. 観測レンジ内に閾値を置けない対象クラスの扱い

[Answer]: allow-measure-only-degradation(scope-sizing 型「測定のみ・閾値なし」への降格を pre-approved 分岐として認める)。AUTO_DECIDED `auto-decision-2883cefc78425f97b4bd17de5e554358`(basis: agent-recommendation、reviewState: unreviewed)。根拠: レンジ外閾値は全件赤/全件緑の検証劇場(project.md c1-threshold-inside-observed-range)。scope-sizing manifest の「so the depth-versus-size band can be set once the distribution exists」が既存先例(RE §4)

### Q4. 対象クラスの定義方式(執行 — 質問しない)

[Answer]: 「成果物種別 × 数値の意味クラス」で定義し、最終集合は corpus sweep の実測で確定する(執行: ユーザー起動指示(b) + クロスレビュー収束 ESTABLISHED_WITH_REFINEMENTS の申し送り。requirements は候補クラスと確定手続きを固定し、確定値は sweep 成果物が持つ)

## 裁定の記録

- D1-D3: full グラント下の decide-question 梯子で AUTO_DECIDED(unreviewed — 節目で人間検収可能)。Q4 は執行クラス
- ユーザー承認: 2026-08-10T08:32:24Z(HUMAN_TURN — full グラント発行。grant_id: intent-grant-637c32aed3f69d2db6a64fc18336aaa6)

### Q5. §12a レビュー上限到達後の処理

iteration 2 の Review で、定型 ack の機械識別規則と測定成果物リンクの許容境界に BLOCKER が残った。レビュー枠を使い切ったため、ステージを承認せず人間判断を待つ。

A. Targeted redo — 現行成果物をアーカイブし、残る2件だけを修正した新しい要件成果物としてレビューを再開する(推奨)
B. Redo from scratch — 現行成果物をアーカイブし、要件分析を最初から作り直す
C. Jump — BLOCKER のリスクを受容し、application-design への明示的ジャンプを要求する
D. Park — 現在地点でワークフローを一時停止する
X. Other (please specify)

[Answer]:
