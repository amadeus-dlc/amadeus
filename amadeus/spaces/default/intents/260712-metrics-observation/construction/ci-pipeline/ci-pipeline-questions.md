# CI Pipeline Questions

## 質問と確定回答

| 質問 | 回答 | 根拠 |
|---|---|---|
| CI toolは何か | GitHub Actions | `.github/workflows/ci.yml` と各unitの `code-summary.md` |
| branch strategyは何か | short-lived branchからPR、統合先は`main` | 既存workflow triggerとteam branching規範 |
| merge前quality gateは何か | `ci-success`がcheck、coverage、codecov-statusを集約する | `.github/workflows/ci.yml` |
| artifact repositoryは何か | 永続registry追加なし。job間受渡しはGitHub Actions artifact `amadeus-coverage-report` | `ci-snapshot-job/code-summary.md` |

## 判断結果

新しいCI provider、branch、registryを導入しない。`build-and-test-summary.md` と `build-test-results.md` が全検証greenを示し、既存GitHub Actionsへの局所追加が実装済みであるため、上記回答を確定事項として扱う。

## 未決事項

人間判断を要する未決事項はない。landing後にmain上の実job、bot author、queue挙動を観測する運用確認だけをparkする。repository `GITHUB_TOKEN` pushの非再帰性はGitHub公式仕様で確定済みである。
