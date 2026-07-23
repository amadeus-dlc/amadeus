# Election Record — E-SRCFDS13

- question: intent 260722-space-record-catalog / functional-design(全4 Unit)の §13 学習選定(全文 verbatim = e2 ブランチ <record>/construction/functional-design/s13-candidates.md — git show で実測可)。conductor 提案: c5 のみ採用+c1〜c4 不採用(裁定執行記録・手続き実例・既存 cid 適用)。採用候補 c5(verbatim 要旨): 『裁定転記のレビュー観点に「非採用候補の語彙が転記へ混入していないこと」(negative-vocabulary check)を含める — 逐語照合(E-TPRRAS13)は採用文の実在を守るが、非採用案からの混入は検出しない。検査は機械的: 非採用 choice の固有トークンを転記先へ grep し 0 hit 確認。統合先案: reservation-transcription-count-check ファミリへの追補』。実測根拠: U1 FD で ADR-2 転記に非採用 B 案の createdAtSource が混入 → reviewer iteration 1 が捕捉 → 裁定 A 準拠へ機械的復元(leader も PM 台帳へ「混入」面の新変種と記帳済み)。各自 e2 record を実測確認のうえ GoA 付きで投票。

裁定: 提案どおり — c5 採用(逐語照合ファミリへ negative-vocabulary check 追補)+c1〜c4 不採用(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票
票タイムライン: 配信 2026-07-23T03:03:15Z → 配信 2026-07-23T03:03:15Z → 配信 2026-07-23T03:03:15Z → e1 2026-07-23T03:04:02Z → e4 2026-07-23T03:04:47Z(受理 2026-07-23T03:04:48Z) → e5 2026-07-23T03:05:32Z(受理 2026-07-23T03:05:49Z) → 開票 2026-07-23T03:05:49Z
GoA[E-SRCFDS13]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0
