# Security Test Instructions — 260807-failclosed-recovery-path

上流入力(consumes 全数): 各 unit の `code-generation-plan.md` と `code-summary.md`。requirements の非機能要件と各 unit の防御的実装(FR-2.3 の cross-intent 誤破棄防御)から適用面を導出した。

## 適用判定 — 専用 SAST/DAST は適用外、fail-closed 契約検証は適用

承認済み NFR にセキュリティ専用要件(認証・入力境界・機微データ)は存在せず、専用の SAST/DAST は新設しない(`cid:build-and-test:c3` — 実測明記のある場合のみ比例選定)。ただし本 intent の主題は**認可・監査系の fail-closed ガードの回復経路**であり、以下のガード整合検証がセキュリティ面の実質を担う:

- **#2330**: `recover-schema-1` の identity 検証(pending の intentRun 不一致 loud 拒否)+ receipts-only store の cross-intent 誤破棄防御(t470 で拒否側を fixture 固定 — 拒否を足すことはあっても許可を広げない)。
- **#2358**: 宣言と被覆集合の完全一致検証(不一致・無宣言は従来どおり refuse — t480 / t367 test 14 の非対称保存)。落ちる実証2独立注入で AC-3b の非空虚性を担保済み(code-summary.md 実測)。
- **#2313**: 第2段 tree 証明の縮小が「証拠3ファイル面」に限定され、freshness 検査の検出力が縮まないことを t427 の 2値 drift テーブルで固定。

## 依存監査

- 依存追加ゼロ(3 Bolt とも既存依存のみ)。repository 全体の依存監査は対象変更の判定と分離し、本 intent のスコープ外とする(`cid:build-and-test:c1-doctor-seam`)。
