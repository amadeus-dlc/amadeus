# UC002 wave の Task 生成をまとめて承認する

## ユースケース

Maintainer が、同じ wave 内の複数 Bolt の Task 分解をまとめて確認し、まとめて承認する。

## アクター

- ACT001 Maintainer

## 外部システム

- なし

## 事前条件

- 同じ wave 内の複数 Bolt の Bolt 実行準備が完了し、Task Generation Gate が `ready_for_approval` に到達している。

## 基本フロー

1. Agent は wave 内の全 Bolt の `tasks.md` と `notes.md` を準備し、まとめて `ready_for_approval` にして停止する。
2. Maintainer は承認待ちキュー一覧で wave 内の承認待ちを一望する。
3. Maintainer は各 Bolt の Task 分解を確認し、まとめて承認する。
4. 承認判断は decision に記録され、承認 evidence が Bolt ごとに `state.json` へ追加される。

## 代替フロー

| 条件 | 扱い |
|---|---|
| wave 内の一部の Bolt だけ承認された。 | 承認済みの Bolt だけが実装へ進み、未承認の Bolt は `ready_for_approval` のまま停止を続ける。 |

## 対応要求

- R003

## 未確認事項

- なし。
