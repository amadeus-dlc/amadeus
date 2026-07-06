# Security Design — u001-presence-evidence（260705-presence-evidence）

上流入力: [security-requirements.md](../nfr-requirements/security-requirements.md)

## 適用範囲

実質要求は SEC-1 / SEC-2 の 2 件（他は不適用確定済み）。

## 設計

| 要求 | 設計 |
|---|---|
| SEC-1（誤った保証の禁止） | 文書の各主張を実装の該当箇所（verifyDocsOnlyEvidence の関数名・検査内容）へ 1:1 で対応させて書く。保証しない事項は "deliberately NOT verified" と明示形で書く（mockups の骨子どおり） |
| SEC-2（credential なし） | 追記は説明文のみ。例示にもトークン等を使わない |
