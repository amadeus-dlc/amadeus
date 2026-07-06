# Security Test Instructions

Unit: u001-presence-evidence（Test Strategy: Minimal、docs 変更）

## 適用判断

自動のセキュリティテストは追加しない。本 Intent のセキュリティ要求（[security-requirements.md](../u001-presence-evidence/nfr-requirements/security-requirements.md) の SEC-1、SEC-2）は文書内容の性質に関する要求であり、検証手段は次の 2 点で確定している。

## 検証方法と結果

- SEC-1（誤ったセキュリティ保証の禁止）: FR-2.3 の執筆時再読了（[boundary-section-draft.md](../u001-presence-evidence/code-generation/boundary-section-draft.md) の行番号付き再読了記録）と §12a review 反復 1・2 の実装照合で、"deliberately NOT verified" の明示を含め遵守を確認済み。最終確認は PR レビューで行う。
- SEC-2（credential・秘密情報の不含）: 追加した文の diff レビューで確認済み（イベント名・ファイルパス・Issue 番号のみを含む）。
