# Security Test Instructions — 260704-question-rendering-ux

Test Strategy が Minimal であり、NFR にセキュリティ要求（requirements.md の非機能要求 N001〜N004 にセキュリティ項目なし）が存在しないため、セキュリティテストは対象外である。
変更範囲は `../implicit/code-generation/code-summary.md` と `../implicit/code-generation/code-generation-plan.md` を参照する。

## devsecops 視点の確認（記録）

- 変更対象は skill markdown と決定論的検査スクリプトであり、秘密情報、認証、ネットワーク境界、外部入力の処理を含まない。攻撃面の変更はない。
- Codex annex が案内する `experimental_request_user_input` は利用者環境の opt-in 設定であり、annex は設定値の変更を自動化しない（設定変更はスコープ外と requirements に明記済み）。
- Text fallback は表示書式の契約であり、ユーザー入力の解釈は既存の `[Answer]:` 書き戻し手順（exact label 記録）に従う。入力を要約しない規則（stage-protocol）を弱めない。

## 将来必要になった場合

skill が外部入力を処理する構造へ変わる場合は、その Intent で脅威モデリングを実施する。
