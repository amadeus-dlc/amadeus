# Domain Map and Context Map validation

## 対象

- `amadeus/spaces/<space>/knowledge/domain-map.md`
- `amadeus/spaces/<space>/knowledge/context-map.md`

## Domain Map

`domain-map.md` は、次の見出しを持つ。

- `Subdomains`
- `Bounded Contexts`

`Subdomains` の表は、次の列を持つ。

- `識別子`
- `名前`
- `種別`
- `役割`
- `状態`
- `根拠`

`識別子` は `SDnnn` の形式にする。
`種別` は `コア`、`支援`、`汎用`、`未分類` のいずれかにする。
`状態` は `adopted` または `retired` にする。
`根拠` は存在する相対リンクにする。

`Bounded Contexts` の表は、次の列を持つ。

- `識別子`
- `名前`
- `サブドメイン`
- `役割`
- `状態`
- `根拠`

`識別子` は `BCnnn` の形式にする。
`サブドメイン` は `Subdomains` に存在する `SDnnn` を参照する。
`状態` は `adopted` または `retired` にする。
`根拠` は存在する相対リンクにする。

Domain Map の行は、Construction の承認済み成果物（Functional Design の反映候補の採用判断）から更新される。
validator は行の構造、許可値、根拠リンクの存在を検証し、採用判断の内容妥当性は検証しない。

## Context Map

`context-map.md` は、次の見出しを持つ。

- `Dependencies`

`Dependencies` の表は、次の列を持つ。

- `Downstream`
- `Upstream`
- `依存内容`
- `組織パターン`
- `統合パターン`
- `状態`
- `根拠`

`Downstream` と `Upstream` は、Domain Map の `Bounded Contexts` に存在する `BCnnn` を参照する。
`依存内容` は空欄にしない。
`組織パターン` は `パートナーシップ`、`別々の道`、`順応者`、`顧客／供給者` のいずれかにする。
`統合パターン` は `共有カーネル`、`巨大な泥団子`、`公開ホストサービス（OHS）`、`公表された言語（PL）`、`腐敗防止層（ACL）` のいずれかにする。
`状態` は `adopted` または `retired` にする。
`根拠` は存在する相対リンクにする。
