# UC002: branch lifecycle を適用する

## システム境界

- Agent が Issue 起点の作業で branch を作り、`origin/main` 追従、PR 作成前検証、merge 後処理を policy に従って判断する。

## 事前条件

- Git ブランチ戦略 policy の配置方針が決まっている。
- 対応する GitHub Issue が存在する。

## 基本フロー

1. Agent は対応 Issue を確認する。
2. Agent は `origin/main` を基点に agent 作業 branch を作る。
3. Agent は作業中に必要なタイミングで `origin/main` への追従要否を確認する。
4. Agent は PR 作成前に validator と標準検証を実行する。
5. Agent は PR を作成し、対応 Issue と対象 Intent をリンクする。
6. Maintainer が merge した後、Agent は `origin/main` に追従し、次作業用 branch へ切り替える。

## 代替フロー

- 緊急修正や docs-only 例外が発生した場合は、policy で許容する条件を確認し、未定義なら後続 Issue 候補として扱う。

## 事後条件

- branch 作成から merge 後処理までの判断が、policy と PR 説明から追跡できる。

## BCE候補

| 種別 | 候補 | 責務 |
|---|---|---|
| 境界 | GitHub Issue and PR | Issue、branch、PR、CI、merge 状態を扱う。 |
| 制御 | Branch Lifecycle Control | branch 作成、追従、PR 作成前検証、merge 後処理を判断する。 |
| エンティティ | Work Branch | agent 作業 branch の識別と状態を表す。 |

## 責務候補

| 候補 | 判断 | 保持 | 依頼 |
|---|---|---|---|
| Branch Lifecycle Control | 採用候補 | 作業 branch の生成、追従、検証、merge 後処理の判断 | GitHub に PR と CI 状態を委ねる |
| Work Branch | 採用候補 | branch prefix、対象 Issue、基点 commit | Intent traceability に証拠参照を渡す |
