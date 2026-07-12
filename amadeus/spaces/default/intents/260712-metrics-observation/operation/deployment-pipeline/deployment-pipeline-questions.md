# Deployment Pipeline Questions

## 質問と確定回答

| 質問 | 回答 |
|---|---|
| deployment strategy | mainへのappend-only snapshot commit。blue/green、canary、rollingは非適用 |
| environment promotion | dev/staging/prodなし。PR quality gates通過後のmain pushが唯一の起動境界 |
| production approval | 既存PR merge controls。snapshot job自体に追加手動承認なし |
| rollback | 対象bot commitを `git revert <sha>` し、誤snapshotを履歴付きで無効化 |
| feature flags | runtime service/UIがないため非適用 |

## 上流根拠

`ci-config.md`、`quality-gates.md`、U3の `deployment-architecture.md` と `cicd-pipeline.md` は、クラウド環境を新設せずGitHub Actions jobがmainへ書き戻す構成を確定している。

## 未決事項

新規仕様判断はない。landing後のmain実run、bot author、queue挙動の観測のみOperation実行へ引き継ぐ。
