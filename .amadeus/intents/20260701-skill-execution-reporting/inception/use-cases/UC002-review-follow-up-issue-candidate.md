# UC002: 後続 Issue 候補レビュー

## システム境界

- Maintainer が Agent の報告を読み、GitHub Issue 化するか、現在の Intent に戻すか、対象外にするかを判断する相互作用を扱う。

## 事前条件

- UC001 により、問題や懸念が後続 Issue 候補として分類されている。
- Issue タイトル案、背景、影響、推奨対応、根拠、現在の Intent から外す理由が提示されている。

## 基本フロー

1. Maintainer は Agent の実行時問題報告を確認する。
2. Maintainer は現在の Intent の対象境界と成功条件に照らして、後続 Issue 候補の妥当性を確認する。
3. Maintainer は GitHub Issue 化、現在の Intent へ戻す、報告不要のいずれかを判断する。
4. Agent は Maintainer が GitHub Issue 化を承認した場合だけ、EXT001 GitHub で Issue 作成へ進める。

## 代替フロー

- 報告内容が現在の Intent の必須対応である場合、Maintainer は後続 Issue 化せず現在の作業へ戻す。
- 報告内容が軽い感想または作業メモで足りる場合、Maintainer は Issue 化しない。

## 事後条件

- GitHub Issue 作成が人間承認付きで扱われている。
- 現在の Intent 成果物へ無関係な改善が混入していない。

## BCE候補

| 種別 | 候補 | 責務 |
|---|---|---|
| 境界 | Follow-up Issue Candidate Boundary | 後続 Issue 候補を Maintainer に提示する。 |
| 制御 | Human Approval Control | Issue 化の承認有無を扱う。 |
| エンティティ | Follow-up Issue Candidate | タイトル案、背景、影響、推奨対応、根拠、対象外理由を保持する。 |

## 責務候補

| 候補 | 判断 | 保持 | 依頼 |
|---|---|---|---|
| Maintainer | 採用 | Issue 化、現在の Intent へ戻す、報告不要の判断 | Agent へ次アクションを依頼する。 |
| Agent | 採用 | 後続 Issue 候補の提示 | Maintainer の承認後に GitHub Issue 作成を実行する。 |
| EXT001 GitHub | 採用 | Issue の登録先 | Agent が承認後に起票する。 |
