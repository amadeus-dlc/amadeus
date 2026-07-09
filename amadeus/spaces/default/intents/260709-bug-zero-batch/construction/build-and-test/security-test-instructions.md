# Security Test Instructions — bug-zero-batch

## セキュリティ関連の修正と検証(devsecops 視点)

- **#675(本バッチ唯一のセキュリティ性質のバグ)**: 承認ゲートの偽装 Request Changes(human-presence guard 迂回)を封鎖。検証 = t188 の fabricated reject 拒否テスト(HUMAN_TURN なしで state 遷移・GATE_REJECTED emit が発生しないこと)。委任 provenance(#671)との整合は t112。残余リスク: delegate-rejection の不在は #685 で追跡
- **#677**: 外部入力(GitHub API レスポンス)によるポート境界からの例外漏れを封鎖 — 不正入力の Result 化はエラーハンドリング境界の防御
- **#678**: 細工された tar(拡張ヘッダのチャンク配置)での誤動作を排除。パス保護(validateEntry 経路)は不変であることを PR レビューで確認済み
- 新規の認証情報・シークレット・入力サニタイズ面の変更なし
