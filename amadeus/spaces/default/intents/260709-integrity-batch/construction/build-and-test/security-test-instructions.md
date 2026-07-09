# Security Test Instructions — integrity-batch

- #708 は human-presence gate(安全性機構)の修正そのもの: 偽陽性 HUMAN_TURN の排除を `t203-mint-presence-classify.test.ts` が固定(機械注入→mint 0 / 人間→mint 1)
- プライバシー: prompt 本文が監査ログへ混入しないことを同テストの SENSITIVE マーカーケースが検証
- 資格情報・シークレットのハードコードなし(4 PR とも diff 実測済み)
- 開発時の一時ペイロードキャプチャはコミット前に除去済み(600 パーミッション・セッション専用領域で運用、本線 revert 済み)
