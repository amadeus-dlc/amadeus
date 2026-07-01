# D001: Functional Design scope

## 背景

Issue #245 は、完了済み Construction の traceability 条件を skill から読み取れないことを扱う。
Inception では、validator の成果物契約を変更せず、skill guidance と template alignment を更新対象にした。

## 判断

Functional Design は、Construction finalization の追跡表契約と template 整合に限定する。
新しい Domain Map と Context Map の更新は行わない。

## 理由

今回の変更は自己開発 governance の中にある成果物契約の明文化であり、新しい bounded context やコンテキスト間依存を追加しないため。

## 影響

Construction 成果物は Intent 配下に閉じる。
共有境界の索引は更新しない。
