# Integration Test Instructions — mirror-auto-modes

## 対象と環境

各Unitの`code-generation-plan.md`と`code-summary.md`にあるintegration／E2Eを、temporary filesystemとin-process seamで実行する。実GitHub mutation、daemon、polling、外部databaseは使用しない。

- Contract/Policy: `t257`、`t268`、`t269`
- Gateway runner: `t273`
- State Store: `t278`
- Lifecycle/Repair: `t282`、`t284`
- Distribution: `t286`〜`t293`
- Engine boundary regression: unit／integration／E2Eの`t265`

## 実行方法

1. 対象ファイルを`bun test <full paths...>`で直接実行し、予定file数を照合する。
2. `bun run test:all`でsmoke、unit、integration、E2Eを含む全回帰を実行する。
3. `bun run distribution:check`、`bun run dist:check`、`bun run promote:self:check`でsource→dist→self→docsの統合contractを確認する。

## 成功条件

create／sync／closeのreconciliation、post-remote local failure、explicit Intent／non-default Space、process-group termination、atomic state、transaction rollback／roll-forward、195 payload／199 public files、release blockingがgreenであること。失敗はtest名、assertion実文、exit codeで記録し、summary行だけで帰属を推測しない。
