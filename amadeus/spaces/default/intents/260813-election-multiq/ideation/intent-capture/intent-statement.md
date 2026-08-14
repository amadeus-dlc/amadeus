# Intent Statement — Election CLI 多問対応

## Problem Statement

現在の Election は、一つの Election に複数の問いをまとめても、投票と集計では単一の choice・GoA・留保へ丸められる。このため、どの問いが成立し、どの問いが保留されたかを機械判定できず、保留後の再実行でも成立済みの問いを安全に除外できない。特に、全体を最悪の GoA へ縮約する挙動は、部分成立を失わせ、裁定を必要以上に fail-open にする。

## Target Customer

主な利用者は、solo または team の Election を実行する Amadeus conductor と、その裁定を監査・保守するメンテナーである。利用者は、問いごとの決定根拠を追跡でき、成立済みの結果を保持したまま保留分だけを再実行できる必要がある。既存の単問 Election を利用する開発者と自動化も、後方読み取り互換性の受益者である。

## Success Metrics

- 新形式の多問 Election では、各問いの識別子、choice、GoA、留保が tally の第一級データとして保持される。
- 同一 Election 内で成立した問いと保留された問いを分離でき、再実行対象を保留中の問いだけに限定できる。
- 既存の単問 Election と保存済みデータを後方読み取りでき、追記型の履歴を破壊的に書き換えない。
- Issue #2813 が指定する既存回帰テストと新規の多問・部分成立・部分再実行テストがすべて成功する。
- 多問対応後、重複した bundled norm を週次 distillation の通常経路で縮約できる。

## Initiative Trigger

[Issue #2813](https://github.com/amadeus-dlc/amadeus/issues/2813) が未完了であり、以前の Intent 記録を再開できないことが確認された。ユーザー判断により、新しい `self-feature` Intent `260813-election-multiq` として実装を再開する。

## Initial Scope Signal

変更は Election のドメインモデル、保存形式、集計、CLI、再実行契約、互換読み取り、テスト、関連 norm にまたがるため、Amadeus 自己開発向けの `self-feature` とする。新規権限、外部サービス、デプロイ基盤の変更は初期スコープに含めない。
