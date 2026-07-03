# Decisions：Application Design

## D001：論理コンポーネントとして設計する

### 判断

Application Design では、実装クラスではなく論理コンポーネントを定義する。

### 根拠

Issue #399 は、Amadeus skill 英語化の実施計画と完了追跡を扱う Intent である。

現時点で GitHub API クライアント、永続ストア、Web UI を導入する要求はない。

### 影響

後続 stage は、成果物責務と PR gate を実現単位へ分割する。

実装コードの追加要否は Units Generation 以降で判断する。

## D002：完了証拠は GitHub 状態を外部依存として扱う

### 判断

対応 PR の merge または明示的な Issue close を、GitHub 上の外部証拠として扱う。

### 根拠

Requirements Analysis で、子 Issue の完了証拠は対応 PR の merge または明示的な Issue close と定義した。

### 影響

Agent は完了証拠を確認して成果物へ反映する。

merge 操作そのものは Maintainer が行う。

## D003：#401 配下 Issue は #401 の完了証拠へ内包する

### 判断

#391、#392、#393、#394 の扱いは、#401 の完了証拠として扱う。

### 根拠

Scope Definition と Requirements Analysis で、#391、#392、#393、#394 の個別完了そのものは #399 の直接完了条件にしないと定義した。

### 影響

親 Issue 完了判断は、#395、#400、#401、#402 の完了証拠を入力にする。
