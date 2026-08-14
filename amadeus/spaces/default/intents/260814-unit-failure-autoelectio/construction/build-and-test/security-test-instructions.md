# Security Test Instructions — Issue #2976

上流: `construction/unit-failure-autoelectio/code-generation/code-generation-plan.md` と `code-summary.md`。

## 適用判定

認証・認可、ネットワーク、シークレット、個人データ、依存関係を変更していないため、専用のSAST / DAST / penetration testは追加しない。

## 安全性の検証

- 外部入力である階層configのinvalid値は`errorDirective`でfail-closedにする。
- 欠落したattempt / batch識別子を受理しない。
- auditは既存の正準イベント語彙だけを使う。
- CIのcontrol-byte gate、dependency installation、lint、型検査を必須ゲートとして維持する。
