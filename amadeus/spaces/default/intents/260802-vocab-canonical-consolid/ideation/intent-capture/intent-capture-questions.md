# Intent Capture 質問票 — 用語定義の正本一本化 (#2030)

> E-OC1 判定: 本 intent は事前裁定済み事項が多く(#2030 クロスレビュー xrev-2030-20260802081731 + ユーザー裁定 2026-08-02)、確定済み裁定は質問化せず前提として反映する(cid:intent-capture:c1)。以下は真に未決の判断のみ。[Answer] の記入はユーザー回答(実 HUMAN_TURN)受領後にのみ行う。

## 前提(裁定済み — 質問しない)

- 正本 = `docs/guide/glossary.md` / `glossary.ja.md` の EN/JA ペア一本化(ユーザー裁定 2026-08-02)
- `domain-language.md` は削除、チーム固有語彙(31語・表記規則)は正本へ吸収
- intent 実行時も同一定義を見る(全ハーネスのステージ実行コンテキストへ供給)
- シンボリックリンク禁止・定義を持たないポインタのみの用語 md 禁止 → 供給は機械投影+drift guard(dist 同型)またはロード経路の直接参照
- 実測矛盾(Unit of Work 三重定義・Guardrail 相互排他・件数語・Scope 外延)の解消と、落ちる実証付き検証ゲートの新設
- スコープ = self-document(ユーザー選択)

## Q1: CONTEXT.md の存廃

self-* 4語(Self Fix / Self Feature / Self Refactor / Self Document)を正本 glossary へ統合した後、リポジトリルートの `CONTEXT.md`(参照ゼロ・25行の孤立ファイル、スコープ分類の正準は project.md § Scope Overrides に既存)をどうするか。

- A) 削除する — 正本一本化の徹底。スコープ分類の定義は glossary(用語)+ project.md § Scope Overrides(運用裁定)で充足(推奨)
- B) 残すが、正本からの機械投影(全文生成+drift guard)に置き換える
- C) 現状のまま残す(独立定義が残るため裁定と矛盾 — 非推奨)
- X) その他(自由記述)

[Answer]: A — 削除する。ユーザー承認: 2026-08-02T09:50:10Z

## Q2: slo-sli-patterns.md の Key Terminology の扱い

`packages/framework/core/knowledge/amadeus-operations-agent/slo-sli-patterns.md:5` の `## Key Terminology`(SLI/SLO/SLA — 一般業界用語、7ハーネスへ出荷)を本 intent のスコープに含めるか。

- A) 統合対象には含めない。ただし「正本と衝突する定義を持たない」ことの検査対象(drift guard の走査面)には含める(推奨 — 領域知識の業界標準用語はプロジェクト用語と別クラス)
- B) 正本へ吸収し、当該節も投影化する
- C) 完全にスコープ外(検査対象にもしない)
- X) その他(自由記述)

[Answer]: A — 統合せず検査(drift guard 走査面)のみ対象。ユーザー承認: 2026-08-02T09:50:10Z

## Q3: 実行文脈への投影粒度(stage-protocol §9 / docs/reference/04 の Terminology 節)

正本から実行文脈・参照文書へ供給する語の範囲をどうするか。いずれも機械投影+drift guard 前提(手書き二重定義は全廃)。

- A) 正本の全語(57+吸収分)をそのまま投影する — 機構最単純、ただし protocol 内の表が大きくなる
- B) 正本側に投影対象マーカー(例: 実行必須フラグ列)を持ち、部分集合を機械抽出して投影する — §9 は現行同様のコンパクトさを保ちつつ単一正本から導出(推奨)
- C) §9 と docs/reference/04 の Terminology 節は削除し、正本(投影された knowledge コピー)への参照のみとする — ただし「ポインタのみ md 禁止」裁定との整合の解釈が必要
- X) その他(自由記述)

[Answer]: B — 正本側マーカーによる部分集合の機械抽出。ユーザー承認: 2026-08-02T09:50:10Z

## 裁定の記録

AskUserQuestion(実 HUMAN_TURN)による回答を受領し転記した。Q1=A / Q2=A / Q3=B(いずれも推奨案)。ユーザー承認: 2026-08-02T09:50:10Z。前提節の裁定(正本一本化・domain-language.md 削除・供給制約)は 2026-08-02 の会話で成立済み、#2030 本文に固定済み。
