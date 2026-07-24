# Business Rules — mirror-github-gateway

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## Rule Sources

`unit-of-work.md`のUnit 3、`unit-of-work-story-map.md`のAS-02〜05／08、`requirements.md`のGitHub／security要件、`components.md`のC5境界、`component-methods.md`のGateway interface、`services.md`のremote call sequenceを正本とする。

## Repository Rules

| ID | Rule |
|---|---|
| GW-R01 | 全methodは`RepositoryIdentity`を必須引数にする |
| GW-R02 | 全`gh api` commandのrequest pathへ`repos/{owner}/{name}/issues...`を埋め込む |
| GW-R03 | cwd／git remote／`gh` default repositoryへ依存しない |
| GW-R04 | response repositoryが期待値と違えば`invalid-response` |
| GW-R05 | Issue numberはpositive integerだけを受理する |
| GW-R06 | owner／nameはASCII英数字と`-_.`だけを許可し、lowercase canonicalで比較する |
| GW-R07 | remote `repository_url`をparseしrequest canonicalと一致検証する |

## Process Rules

| ID | Rule |
|---|---|
| GW-P01 | shell command stringを作らずargument arrayを使う |
| GW-P02 | credentialをargument、state、audit、summaryへ入れない |
| GW-P03 | exit statusとresponse shapeの両方を検証する |
| GW-P04 | fake runner専用branchをproductionへ追加しない |
| GW-P05 | readiness／view／searchはmutation commandを実行しない |
| GW-P06 | create／edit／closeはC6発行のoperation-bound permitを必須とする |
| GW-P07 | create／edit／closeは単一`gh api` commandでIssue objectを返す |

## Outcome Rules

- successはtyped valueを持つ`ok`だけ。
- failureはclassification、redacted summary、retryableを必須とする。
- stderr文字列の単純一致だけでpermissionとnetworkを混同しない。
- unknown errorを成功やempty resultへ変換しない。
- search failureを候補0件として扱わない。
- create failureをIssue未作成と断定しない。remote outcome不明の解釈はC6がreceiptと候補検索で行う。
- mutation failureはeffect certaintyを必須とし、`outcome-unknown`を通常retryへ変換しない。
- paginationを完走できないsearchはfailureであり、empty successではない。

## Mutation Rules

Gatewayはcreate／edit／closeのlow-level mutationだけを提供する。provenance未検証用のunsafe overload、implicit repository method、force close methodを持たない。C6だけがpermit constructorとmutation portをimportできる。dependency testは他moduleのmutation callを拒否する。Gatewayもpermit binding、引数、repository response validationを省略しない。

## Acceptance Scenarios

1. create commandは期待repositoryを`repos/{owner}/{name}/issues` API pathで1回指定する。
2. cwdが別repositoryでもmutation targetは変わらない。
3. searchが2件返した場合、2件をそのまま返す。
4. response repository不一致はinvalid-response。
5. unauthenticatedはtyped failureで、raw credential outputを含まない。
6. readiness／view／searchのfake runner記録にmutation commandは0件。
7. shell metacharacterを含むtitle／bodyも単一argumentとして渡される。
8. page 2取得失敗はsearch failureとなり、候補0件にならない。
9. request送信後timeoutは`outcome-unknown`、spawn失敗は`not-started`になる。
10. token、query、absolute pathを含むstderrでも、summaryはclassification、effect、exit code、HTTP statusから再構成した固定形式だけになる。
