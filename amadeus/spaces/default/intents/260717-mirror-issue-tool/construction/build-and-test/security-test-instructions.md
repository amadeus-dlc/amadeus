# Security Test Instructions — 260717-mirror-issue-tool

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(amadeus-mirror-cli)

## 選定(build-and-test:c3 — 実測明記した攻撃面にのみ比例選定)

攻撃面は security-requirements.md S-2/S-3 の2点のみ。検査は既存テストへ組み込み済み:

- S-2(インジェクション排除): integration テストが fake GhRunner の受領引数が配列形であることを固定。シェル文字列経路は実装に存在しない(spawnGh の cmd 配列、実測 scripts/amadeus-mirror.ts:204-209)
- S-3(境界検証): unit テストの parseArgs 拒否5ケース(exit 2)
- S-1(シークレット非保持): 実装にトークン取り扱いコードなし(gh keyring 委譲)— 新規 scan 機構は導入しない(既存必須 scan の省略でもない: 本 repo に secret scan 必須ゲートは build 面に存在しない)
## 追加 scan の不在確認

新規のセキュリティ scan 機構・CI ジョブは導入しない — 攻撃面2点は既存テスト層でカバーされ、これは既存必須検査の省略ではない(選定根拠は上記)。
