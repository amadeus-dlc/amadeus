# Security Requirements — u5-docs-and-distribution

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## ドキュメントの秘匿(requirements NFR-4 の docs 面)

- 認証節(business-logic-model のドキュメント更新フロー)には必要権限の**名前**(`project` scope)と gh credential store 委譲の方針のみを記載し、token 値・実環境の識別情報・生の API 応答例を docs へ転記しない(requirements FR-10b — 「秘匿情報なしで診断」の docs 面適用)。
- 診断出力例を docs に載せる場合も、Project 識別子・選択肢名・状態ラベルのみのサンプルとする(requirements NFR-4 — U2/U4 の redact 流儀と同一水準)。

## リリース境界の不変(business-rules BR-U5-7)

- バージョン・バッジ・リリースノートに一切触れない — リリース(バージョンバンプ・タグ・npm publish)は release.yml の workflow_dispatch 一本で行う人間の承認境界であり、U5 の配布同期(dist 再生成)はこれと独立(technology-stack: 配布は projection 再生成のみ)。
- consent 境界の docs 記載は requirements FR-10a の scopeExclusions(pull-request / release / deploy / daemon / polling)を正とし、拡張しない(business-rules BR-U5-5 — parity テストで機械固定)。

## 生成物の完全性

- dist / self-install を独立の正本として編集しない(business-logic-model のエラー節 — 正本修正 → 再生成のみ)。drift guard(business-rules BR-U5-3)が正本と生成物の一致を機械保証し、生成物への無申告注入を検出する。
- 閉じた台帳の不変検収(business-rules BR-U5-4 — 台帳変化は設計逸脱シグナルとして停止・報告)は、意図しない配布面拡大の検出器を兼ねる。
