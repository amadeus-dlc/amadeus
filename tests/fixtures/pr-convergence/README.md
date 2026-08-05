# pr-convergence GraphQL fixtures

U2 (`convergence-toolchain`) の契約正本。`plugins/pr-convergence/tools/` の
台帳生成器・分類器・収束述語が消費する GraphQL 応答様式と、bot コメントの
severity 語彙・終端参照語彙をここで固定する。

採取クエリ(read-only、`gh api graphql`):

```graphql
query($owner:String!,$name:String!,$number:Int!){
  repository(owner:$owner,name:$name){
    pullRequest(number:$number){
      number mergeable mergeStateStatus
      reviewThreads(first:100){
        pageInfo{hasNextPage endCursor}
        nodes{ id isResolved isOutdated
          comments(first:50){ nodes{ author{ __typename login } body } } }
      }
    }
  }
}
```

採取日: 2026-08-05。採取対象は `amadeus-dlc/amadeus`。コメント本文は verbatim
のまま保持している(severity 語彙・終端参照語彙の一次証拠であるため)。

## 実測 fixture

| ファイル | PR | 実測内容 |
|---|---|---|
| `measured-pr-2268.graphql.json` | #2268 | 7 スレッド全て `isResolved: true`(うち 2 件 `isOutdated: true`)。人間返信が commit SHA(`734850b02`)を含むため `terminalized()` の正例。bot は `coderabbitai` |
| `measured-pr-2264.graphql.json` | #2264 | 1 スレッドが unresolved・bot コメントのみ = `ignored` の正例。severity `🔵 Trivial` の実測 |
| `measured-pr-2269.graphql.json` | #2269 | 9 スレッド全て unresolved・bot コメントのみ = `ignored` 9 件。`mergeStateStatus: BLOCKED` / `mergeable: MERGEABLE` の実測 |
| `measured-pr-1945.graphql.json` | #1945 | 2 スレッドが unresolved かつ人間返信あり = **`replied-unresolved` の実測正例**(BR-U2-1 の赤実証に使う)。bot は `cursor` で、severity 語彙が CodeRabbit と別系統 |

`mergeStateStatus` の実測値: `UNKNOWN`(#2268 / #2264 / #1945)、`BLOCKED`(#2269)。
`DIRTY` / `CONFLICTING` は採取時に #2140 で観測したが、fixture には採らず
`MergeStateStatus.parse` のユニットテストで直接固定している。

## 合成 fixture

| ファイル | 合成である理由 |
|---|---|
| `synthetic-paged-page1.graphql.json` / `synthetic-paged-page2.graphql.json` | **合成**。`hasNextPage: true` の複数ページ応答は実測 PR に存在しなかった(採取した全 PR が 1 ページで完結)。実測語彙(著者 `__typename`、severity マーカー、commit SHA 参照)から導出した 2 ページ構成で BR-U2-4(ページング全数)を固定する。あわせて human-only スレッドと、resolved だが終端参照を持たないスレッドを含める |

合成ページの内容は実測語彙の再構成であり、GitHub から採取した応答ではない。

## severity 語彙(実測)

`Severity.parse` の写像表は**実測した表記のみ**を持つ。未実測の表記は
`null` を返す(BR-U2-10「推測で埋めない」)。

| bot | 実測表記 | 写像先 |
|---|---|---|
| `coderabbitai` | `_🔴 Critical_` | `critical` |
| `coderabbitai` | `_🟠 Major_` | `major` |
| `coderabbitai` | `_🟡 Minor_` | `minor` |
| `coderabbitai` | `_🔵 Trivial_` | `info` |
| `cursor` | `**Medium Severity**` | `minor` |
| `cursor` | `**Low Severity**` | `info` |

実測所在: `🔴 Critical` は PR #2229 / #2170、`🟠 Major` は #2268 ほか、
`🟡 Minor` は #2239 ほか、`🔵 Trivial` は #2264 / #2269、
`**Medium Severity**` / `**Low Severity**` は #1945。

## 更新手順

GraphQL 応答様式が変わった(= `ReviewThread.parse` が throw する)場合は、
上記クエリで再採取してこのディレクトリを更新し、README の採取日と語彙表を
同じ変更で同期する。
