# Intent Backlog — codekb diff3 cleanup(Issue #1129)

上流入力(consumes 全数): `intent-statement.md`、`feasibility-assessment.md`、`constraint-register.md`。

## Prioritized Backlog(proto-Units)

| Order | ID | MoSCoW | Outcome | Owner | Depends On | Done Evidence |
|---:|---|---|---|---|---|---|
| 1 | B-01 | Must | Ideation成果物を検証し intent を park | conductor e1 | なし | phase verification PASS、park state、pushed SHA |
| 2 | B-02 | Must | parked record の reviewを開始 | leader | B-01 | [record PR 作成画面](https://github.com/amadeus-dlc/amadeus/pull/new/team/20260718-023505-0ccc/engineer-1)から作成されたreview URL |
| 3 | B-03 | Must | 既存 Issue #1129 へ record link と park状態を同期 | leader | B-02 | [Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129) から正本recordへ到達可能 |
| 4 | B-04 | Must | 起票者以外2名の独立reviewと人間承認を経てmainへ着地 | reviewer / user / leader | B-02, B-03 | 2名のreview verdict、人間承認、landing state |
| 5 | B-05 | Must | landed mainで sentinel 0/0・最新ヘッダ1/1を再計測 | leader / reviewer | B-04 | main ref付き全数走査出力 |
| 6 | B-06 | Must | Issue #1129 をclose | leader | B-05 | landing検証より後のCLOSED state |

## Dependency-First Sequence

`B-01 → B-02 → B-03 → B-04 → B-05 → B-06` を唯一の有効順序とする。価値順・risk-first の裁量余地はなく、B-04より前のmergeは no-AI-merge、B-05より前のcloseは close-after-landing-verification に違反する。

## Deferred and Rejected Items

| ID | Category | Item | Reason |
|---|---|---|---|
| D-01 | Won't | application / framework codeの変更 | 欠陥は修正済みMarkdownのbranch hygieneに限定 |
| D-02 | Won't | 新規AWS resource / account連携 | feasibilityで非該当確定 |
| D-03 | Won't | diff3 marker規範の再persist | 既存 `cid:reverse-engineering:diff3-marker-vocab` と重複 |
| D-04 | Won't | bug用の新しいミラーIssue | bug Issue-first運用により既存Issue #1129を共有面にする |
| D-05 | Won't | Inception / Constructionへ進む | ユーザー指示はIdeation完了後のpark |

## Delivery Notes

- calendar deadline はない。B-01〜B-03は main 着地前、B-05〜B-06は main 着地後という相対期限を守る。
- 本 conductor は B-01 までを実施し、B-02以降を leader へ handoff する。
- B-02以降の外部状態更新は、各操作後に着地面を実測してから成功通知する。
