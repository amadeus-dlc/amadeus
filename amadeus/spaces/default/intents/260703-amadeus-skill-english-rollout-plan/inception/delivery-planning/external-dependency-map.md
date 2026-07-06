# External Dependency Map：Amadeus skill 英語化実施計画

## 概要

この成果物は、Delivery Planning で扱う外部依存を整理する。

## 外部依存一覧

| ID | 外部依存 | 関連 Bolt | 依存する状態 | 対応 |
|---|---|---|---|---|
| ED001 | GitHub Issue #395 | B001 | 対応 PR merge または明示的な Issue close | 完了証拠として traceability へ反映する。 |
| ED002 | GitHub Issue #400 | B002 | 対応 PR merge または明示的な Issue close | 完了証拠として traceability へ反映する。 |
| ED003 | GitHub Issue #401 | B003 | 対応 PR merge または明示的な Issue close | #391、#392、#393、#394 の扱いを含めて traceability へ反映する。 |
| ED004 | GitHub Issue #402 | B004 | 対応 PR merge または明示的な Issue close | 完了証拠として traceability へ反映する。 |
| ED005 | GitHub Pull Request | B001、B002、B003、B004 | CI pass、レビューボット完了、コメント対応、merge | PR 説明、audit、traceability から確認できるようにする。 |
| ED006 | Maintainer | B001、B002、B003、B004 | merge 判断 | Agent は merge を実行せず、Maintainer の merge を完了証拠として扱う。 |

## チーム割り当て

`team-allocation.md` は作成しない。

Team Formation は skip 済みであり、この Intent は小さい自己開発チームとして扱うためである。
