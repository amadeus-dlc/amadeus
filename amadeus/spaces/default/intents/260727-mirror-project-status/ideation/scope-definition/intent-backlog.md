# Intent Backlog(proto-Units)— Intent Mirror の GitHub Project Status 同期(lifecycle フェーズ写像)

上流入力(consumes 全数): intent-statement, feasibility-assessment, constraint-register

proto-Unit の切り出しは scope-document の In Scope 17項目を、constraint-register の技術制約(C-T1: GraphQL 必須 / C-T3: 別 mutation 非アトミック / C-T5: gh optional)と feasibility-assessment のリスク順(R-3 mutation 未実測が最上位、R-2 期待選択肢不存在が現存)に沿って束ねたもの。正式な Unit 分割は units-generation で確定する — ここは優先順位付きの候補列。

> 2026-07-27 改訂(revision 1): 写像対象を lifecycle フェーズへ変更。parked 明示マッピングは廃止(常に維持)。受入条件は17項目。
>
> 2026-07-27 改訂(仕様変更 B): Project への item 追加を Amadeus が行う(auto-add 非依存)。In Scope 18 を PU-1 / PU-5 へ反映。

## proto-Unit 一覧(優先順)

| # | proto-Unit | 含む受入条件 | MoSCoW | 依存 | 備考 |
|---|-----------|-------------|--------|------|------|
| PU-1 | フェーズ→Status 同期の最小 end-to-end(単一の設定済み Project・既定マッピング): (未所属なら)item 追加 → Status フィールド/選択肢解決 → 現在フェーズ対応 Status への mutation → per-Project receipt。選択肢未解決時の safety-blocked 観測を含む | 1, 2, 10, 13, 14, 18 | Must | なし | **walking skeleton**。R-3(add/update 両 mutation 未実測)と R-2(期待選択肢不存在→safety-blocked が正)をここで確定。GraphQL argv ビルダー+envelope 対応を含む |
| PU-2 | 状態モデル拡張: per-Project receipt の永続化、pending / safety-blocked の codec・reducer・冪等 reconcile | 10, 11 | Must | PU-1 | C-T3(部分成功前提)の中核。write⇔read 対称と canonical レンダラ規律(cid:code-generation:c1-drift-canonical-renderer)適用 |
| PU-3 | Lifecycle 統合: create/sync/close チェーンと phase boundary での遷移同期(INCEPTION/CONSTRUCTION/OPERATION)、final sync → 全 Project Done → close の順序保証(close 阻止)、parked 維持 | 3, 4, 5, 7, 8 | Must | PU-1, PU-2 | 既存 eligible boundary / manual invocation のみ(C-T4)。boundary 種別(phase/park/completion)は既存 mirror lifecycle と整合 |
| PU-4 | 複数 Project の独立同期 | 6 | Must | PU-2 | Project 単位の receipt / reconcile 独立性 |
| PU-5 | 設定面: 追加対象 Project の指定、Project 別フェーズ Status 名上書き、既定照合規則(exact/case)の固定 | 9, 18 | Must | PU-1 | 置き場所は既存 amadeus-mirror-config.ts の3層流儀を実測して requirements/design で固定。parked 用マッピングは持たない(改訂で廃止) |
| PU-6 | 診断拡張: repair status に「現在フェーズから導出した期待 Status」との drift / 選択肢未解決 / 権限不足 / 部分成功の read-only 検出を追加 | 12 | Must | PU-2, PU-4 | remote mutation なしの不変条件維持 |
| PU-7 | 仕上げ(横断): 認証要件ドキュメント+運用手順(Project 選択肢の再構成 or 上書き設定)、gateway〜CLI 診断の unit/integration テスト完備、7ハーネス dist 再生成+drift guard | 15, 16, 17 | Must | 全 PU | テストは各 PU と並行作成(org.md Testing Posture)、本 PU は完備の検収面 |

## 価値ストリーム(capability → 顧客成果)

- PU-1〜PU-3(コア収束): 「ライフサイクル節目後、ボードの Status が現在フェーズを手動編集ゼロで反映」という intent-statement の成功指標を単一 Project で成立させる。
- PU-4〜PU-5(幅): 複数 Project・選択肢名の異なる実環境でも同じ保証を成立させる。
- PU-6〜PU-7(信頼): 乖離・失敗が常に可視で、配布先環境でも診断とドキュメントで自走可能にする。

## シーケンス上の不変条件

- PU-1 は単独ゲート(walking skeleton — org.md § Walking Skeleton)。承認前に PU-2 以降を着地させない(risk-first、Q2 裁定)。
- どの PU も非対象5群(scope-document § Out of Scope — 一般作業状態の同期を含む)に踏み込まない。
