# Initiative Brief — election-ts-foundation

> 上流入力(consumes 全数): intent-statement.md、scope-document.md、intent-backlog.md、feasibility-assessment.md、constraint-register.md

## 一言要約

エージェント選挙の運用をノルム(prose 規則+手作業)から TypeScript の決定的基盤+薄い SKILL ラップへ移す。構造(票・開票・記録)はツールが所有し、人間と LLM は判断だけを行う。

## 判定

**Go(条件付き)** — ideation として承認可能。Construction(実装)の実行判断はユーザー専権であり本 brief は確約しない(issue-selection-user-decides 準拠)。次の一手は mirror Issue 起票+park であり、実装 intent の起動はユーザーの将来決定。

## 問題と根拠(実測)

- 選挙系手作業の違反反復: 直近24時間で 5+件(開票集計誤記・タイムライン順序・件数記憶転記ほか — PM 台帳実測)
- ノルム肥大: team.md の選挙系 prose 約30項目が蒸留候補の高チャーン上位
- 全違反が「構造データ(票)を prose で運ぶ」ことに起因する同根クラス

## 解決の方向(裁定済み)

1. 選挙4類型のライフサイクル全体(S-01〜S-08)を TS 基盤で機械化 — 全 Must
2. ファイル正本+agmsg 短通知(truncate クラスの構造排除)
3. 投票は構造化票形式・leader 宛私秘 → 開票時一括ファイル化(blind 性と監査可能性の両立)
4. チーム内ツール(配布外)で開始 — 製品化は実証後の将来判断
5. 人間裁定(タイ・GoA 8・エスカレーション)は不変(constraint-register C-01)

## 成功指標

- 選挙系違反カウント(PM ラウンド)ゼロ / ノルム PR での照合指摘ゼロ — いずれも既存実測系で計測

## SKIP ステージの扱い(捏造補完なし — approval-handoff:c4 準拠)

- market-research: N/A — 内部運用ツールで市場は存在しない。代替根拠は PM 台帳の違反実測(需要の実証)
- team-formation: N/A — 実装 intent 未起動のため編成は確約しない(スタッフィングは将来 intent の delivery-planning 事項)
- rough-mockups: N/A — UI なし。CLI 出力契約の様式は将来 intent の requirements/design で既習様式(兄弟ツール)に揃える(ui-less-mockups-as-output-contract の適用は当該フェーズで)

## リソース確約(Ideation 範囲のみ — approval-handoff:c3 準拠)

本 intent が確約するのは mirror Issue の起票・同期と record の main 反映まで。Construction のスタッフィング・スケジュールは確約しない。

## 出口(このあとの手順)

1. 本ステージ承認 → phase-check-ideation 検証 → ideation 完了
2. `scripts/amadeus-mirror.ts create` で mirror Issue 起票(未決の申し送りは intent-backlog F-01〜F-06/X-01〜X-04 を record 参照で運ぶ)(タイトル+概要3〜5行+record リンク+状態行のみ — 設計詳細は record が正本)
3. workflow を park(実装 intent の起動はユーザー決定待ち)
