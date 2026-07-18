# Decision Log — election-ts-foundation(ideation)

> 上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md、scope-document.md、intent-backlog.md

全裁定はユーザー直接回答(Grill Me、user decision 2026-07-19「質問は私に」による選挙不要の本 intent 限定上書き)。

| # | ステージ | 論点 | 裁定 | 承認 |
|---|---|---|---|---|
| D-01 | intent-capture Q1 | 機械化範囲 | E: 選挙ライフサイクル全体 | 2026-07-19(D7 確定) |
| D-02 | intent-capture Q2 | 裁定機構の境界 | A: 選挙4類型のみ(E-OC1/クロスレビュー/PM は拡張点申し送り) | 同上 |
| D-03 | intent-capture Q3 | 成功指標 | D: 正確性複合(違反カウントゼロ+照合指摘ゼロ) | 同上 |
| D-04 | intent-capture Q4 | ノルム関係 | A: 蒸留で縮約(ツールが正) | 同上 |
| D-05 | intent-capture Q5 | トリガー | C: 技術負債+品質問題(確信度高の推定を確認) | 同上 |
| D-06 | intent-capture Q6 | 投票契約 | A: 構造化票形式(根拠自由文は保持) | 同上 |
| D-07 | feasibility Q1 | 位置づけ | A: チーム内ツール(配布外)。製品化は将来判断 | 2026-07-19T00:45:00Z |
| D-08 | feasibility Q2 | 正本 | A: ファイル正本+ポインタ配信 | 同上 |
| D-09 | feasibility Q3 | blind 性 | A: ハイブリッド(票は leader 宛私秘→開票時一括ファイル化) | 同上 |
| D-10 | scope-definition Q1 | MoSCoW | A: 全部 Must(Won't 厳格除外) | 2026-07-19T00:52:00Z |
| D-11 | approval-handoff | ideation 最終ゲート | Approve(Go 条件付き) | 2026-07-19T01:08:00Z |

## 実施上の決定(ユーザー指示由来)

- 本 intent は ideation のみ実施し、approval-handoff 後に mirror Issue 同期(`scripts/amadeus-mirror.ts`)して park する
- 明確化質問はユーザー直接裁定(エージェント選挙の本 intent 限定上書き)

## 未決の申し送り(将来 intent — intent-backlog F-01〜F-06 / X-01〜X-04 参照)

構造化票形式の具体様式・ツール配置・記録配置(constraint-register U-01〜U-03)・落ちる実証テスト群・並記照合期間・ノルム縮約の実行(constraint-register P-01)。確定制約 C-01〜C-08 は将来 intent の requirements が引き継ぐ。
