# Rollback Runbook

## Trigger

`quality-gates.md` と `deployment-architecture.md` に照らし、collector値の誤り、schema不正、意図しないmetrics file、bot commit範囲逸脱が確認された場合にrollbackする。jobの一時的NFFは自動retry対象であり、成功後のrollback理由にはしない。

## Procedure

1. GitHub Actions runとbot commit SHAを特定する。
2. `git show --stat <sha>` で変更が`metrics/*.json`だけか確認する。
3. 原因を分類する。collector/schema defectなら修正test・codeと `git revert <sha>` を同一PRに含める。一時的な入力異常で現行codeが正しい場合だけrevert単独PRを許容する。
4. `quality-gates.md` のmerge-blocking checksを通す。
5. main着地後、誤snapshotが削除され既存snapshotが不変であることを確認する。

## Failure handling

- revert conflict時は作業を停止し、対象metrics fileと後続commitを確認する。強制pushや履歴rewriteは行わない。
- credential、branch protection、GitHub Actions設定をrollbackのために緩和しない。
- 原因がcollector/schema defectなら修正test・codeとrevertを同一PRでmainへ着地させ、merge直後のsnapshot runが修正版を使う順序を保証する。

## Audit

revert PRへ原因、対象snapshot SHA、検証結果を記録する。外部deploy serviceやdatabaseは存在しないため追加rollback操作はない。
