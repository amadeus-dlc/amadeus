# Requirements Analysis — 明確化質問(260712-metrics-observation)

> 既決照合: 委譲台帳6点のうち5点は実測証拠・既決ノルムで一意に閉じた(requirements.md FR-1〜FR-6 に根拠併記)。真に未決の設計判断は Q1 の1点のみ(RE が確定した唯一のギャップ)。

## Q1. テスト数 collector の取得方式(FR-1 の tests 行)

RE 実測: run-tests.ts の printSummary(:899)は Test files / assertions を stdout print するのみで、機械可読 seam が存在しない。

- A. **run-tests.ts に JSON 出力 seam を追加**(coverage-totals.json と同型の tests-totals.json を --ci 実行時に書き出す — 既習様式の対称拡張。run-tests.ts への小改修が発生)
- B. **snapshot 側で SUMMARY stdout をパース**(run-tests 無改修だが、表示文言への結合 = 文言変更で silent 破損のリスク。loud-fail 契約(FR-4)でパース失敗は検出可能)
- C. **tests collector を初期セットから除外**(スコープ縮小 — ギャップ解消を待たず出荷、バックログへ)
- X. その他
- [Answer]: (RA-Q1 選挙の裁定受領後に記入 — cid:election-answer-after-ruling)
