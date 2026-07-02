# Domain Entities

## 目的

finalization 再開契約で扱う概念を Functional Design の Domain Model として整理する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Unfinalized Intent | gate が passed でなく、検証済み証拠を持ちながら PR 記録を欠く Intent を表す。 | DE002, DE004 |
| DE002 | Detection Report | 検出スクリプトの出力（未 finalize の一覧、対象外通知、終了コード）を表す。 | DE001, DE003 |
| DE003 | Resume Rule | auto 判定表の再開行と、その評価順序を表す。 | DE002 |
| DE004 | Finalization Evidence | `test-results.md`、`pr.md`、`construction.gate` の組を表す。 | DE001 |

## 関係

Finalization Evidence の組が Unfinalized Intent の判定条件になる。

Detection Report は Unfinalized Intent を列挙し、Resume Rule と Decision Review の入力証拠になる。

Resume Rule は、条件を満たす場合だけ finalization を選び、満たさない場合は通常の判定へ戻す。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | なし | 新しい Bounded Context やコンテキスト間依存は追加しない。 | Domain Map と Context Map は更新しない。 | U001 は BC001 内の完了工程契約を扱うため。 |

## 未確認事項

なし。
