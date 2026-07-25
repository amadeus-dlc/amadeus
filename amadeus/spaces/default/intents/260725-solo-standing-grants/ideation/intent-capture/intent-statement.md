# Intent Statement: Solo Standing Grant

## Problem Statement

Amadeusのsolo modeでは、通常stageのapproval gateごとに新しい`HUMAN_TURN`が必要である。人間が時間制限付きのstanding grantを明示的に発行していても、solo modeにはそのgrantをgateの認可根拠として利用する経路がない。このため、大きなscopeでは人間が意図した統制水準より細かい承認操作を繰り返す必要がある。

解決すべき問題は`HUMAN_TURN`要件を弱めることではない。有効で対象をカバーするstanding grantを、既存の監査イベントとしての性質を保ったまま、対象gateの正当な認可根拠にできるようにすることである。grantが有効でない場合は、通常のhuman gateが完全な形で維持されなければならない。

## Target Customer

主な利用者は、Amadeusのintentワークフローをsolo modeで運用し、承認頻度を意図的に調整したい人間のオペレーターである。この利用者は、通常stageの反復的な承認をstanding grantへ委ねつつ、phase boundaryやwalking skeletonなど意味の大きい境界では自ら判断できることを必要としている。

間接的な対象者は、既存のteam mode利用者、全ハーネスのconductor実装者、directive・state transition・audit契約を保守するAmadeusメンテナーである。これらの関係者には、既存挙動の互換性と同じ意味論が必要となる。

## Success Metrics

1. solo modeで、有効かつ対象をカバーするstanding grantがあれば、追加の個別`HUMAN_TURN`なしに通常gateを承認できる。
2. grantにより承認された`GATE_APPROVED`には、commit時に実際に再検証された正確なGrant Idが記録される。
3. route後からcommit前までにgrantが失効、取消、または対象外になった場合、stageを完了せず通常のhuman gateへ戻る。
4. そのフォールバックで`STAGE_COMPLETED`および`ERROR_LOGGED`を誤って記録しない。
5. team modeの既存leader/delegation経路を変更せず、既存テストが回帰しない。
6. phase-boundary gateと、適用規則上対象外となるwalking-skeleton gateを自動承認しない。
7. per-unit Constructionでは、全unit完了後の最終gateだけを認可対象とし、stage本体やreviewerを不必要に再実行しない。
8. directive、state transition、auditの契約がunit testとintegration testで検証され、全ハーネスのconductor手順が同じ意味論を持つ。
9. 型チェック、関連テスト、全テスト、生成物drift checkが成功する。

## Initiative Trigger

GitHub Issue #1466で、team modeではstanding grantにより承認頻度を償却できる一方、solo modeでは同じ人間が明示的にgrantを発行しても利用できない機能差が特定された。既存のhuman-presence保証、監査可能性、重要境界の人間統制を保持したまま、この差を解消する必要がある。

PR #1468は凍結済みの試作であり、問題理解や失敗し得る設計形状を知るための参考資料としてのみ扱う。その実装や表現を、新しいintentの設計前提または変更起点にはしない。

## Initial Scope Signal

本initiativeはAmadeus自身の利用者向け機能を拡張する`amadeus-feature`である。対象はstanding grantの発行からgate認可、commit時再検証、監査記録、失効時フォールバックまでの一貫した利用者体験と契約である。

非交渉境界は次のとおりである。

- Standing grantは新しい設定モデルにせず、現行どおり監査イベントとして扱う。
- gateの有無と、gateを誰または何が認可するかを別の概念として扱う。
- solo modeにはleaderが存在しないため、team modeの委任処理をそのまま流用しない。
- route時に選択したGrant Idを明示的に引き回し、commit時に同じgrantを再検証する。
- standing grant専用の擬似gate値や、stderr文字列判定による制御フローを導入しない。
- grantの失効、取消、対象外は通常の競合結果としてhuman gateへフォールバックし、エラー監査として扱わない。
- phase boundary、walking skeleton、per-unit Constructionの現行適用規則を維持する。
- 重要な設計判断はgateで人間に確認し、設計承認前に実装へ進まない。

## Source Traceability

- GitHub Issue #1466: `https://github.com/amadeus-dlc/amadeus/issues/1466`
- 凍結済み参考PR #1468: `https://github.com/amadeus-dlc/amadeus/pull/1468`
- ユーザー提示の前提および受け入れ条件: `intent-capture-questions.md`
