# Initiative Brief — Intent Mirror の GitHub Project Status 同期(lifecycle フェーズ写像)

上流入力(consumes 全数): intent-statement, scope-document, intent-backlog, feasibility-assessment, constraint-register

## Intent と問題(intent-statement より)

Intent Mirror は Issue 本文を自動同期する一方、Mirror Issue が所属する GitHub Project の `Status` は手動更新のまま残り、ボード表示が実状態から乖離する。本 initiative は Intent の **AI-DLC lifecycle フェーズ**を各 Project の Status へ安全・冪等に投影する(IDEATION→`Ideation` … OPERATION→`Operation`、Completed 時のみ終端 `Done`、parked は維持。一般作業ボード状態への写像はしない — 2026-07-27 ユーザー訂正済み)。加えて仕様変更 B(同日)により、**設定済み対象 Project への item 追加も Amadeus が create チェーン内で冪等に行い**、追加直後に現在フェーズ Status を設定する(auto-add workflow 非依存 — ユーザーが無効化)。

成功指標(収束性主軸): ライフサイクル節目後、所属全 Project の Status が手動編集ゼロで現在フェーズの期待値に収束(drift 0)。安全性(Done 未達時の close 阻止)と診断可能性(repair status)は支持条件。

## 市場検証サマリー

market-research はスコープ外スキップ — N/A(根拠: 自プロダクトの運用完成度向上が動機で外部市場仮説を持たない。代替内部証拠 = intent-statement の Initiative Trigger: mirror 実運用化で Project Status 更新だけが手動作業として残った運用ギャップ)。

## 実現可能性とリスク(feasibility-assessment / constraint-register より)

- **判定 GO**(実測6項: `project` scope 保有・GraphQL 到達・projectItems 照会・Project #5 実在・Status フィールド解決・gateway 拡張可能性)。
- 未実測は書込系 mutation(`updateProjectV2ItemFieldValue` と、仕様変更 B で加わった `addProjectV2ItemById`)— walking skeleton の最初の検証面に指定(live risk R-3)。
- **運用前提(R-2)**: 実 Project #5 の現選択肢(Backlog/In progress/In review/Done)に期待フェーズ選択肢が不存在(`Done` のみ実在)。Project 側の選択肢再構成または上書き設定が済むまで safety-blocked が正しい挙動。
- 主要制約: ProjectV2 は GraphQL 必須(C-T1)、Issue 本文と Status は別 mutation で部分成功前提(C-T3)、daemon/polling/Actions 不使用(C-T4)、gh は optional dependency で loud fail(C-T5)。

## スコープ境界(scope-document より)

- In: Issue #1560(2026-07-27 改訂版)受入条件17項目+仕様変更 B の追加1項(設定済み Project への冪等追加)= 18項目すべて Must。
- Won't: 一般作業状態の同期 / Project からの削除・アーカイブ / Project 固有 workflow・Actions / PR・release・deploy の Status 管理 / 双方向同期(「自動追加しない」は仕様変更 B で撤回)。

## コンセプトビジュアル

rough-mockups はスコープ外スキップ — N/A(根拠: UI を持たない CLI/ゲート系機能。出力契約は requirements 以降で verdict 別出力文言+exit code として固定する — cid:requirements-analysis:ui-less-mockups-as-output-contract の先例に従い、捏造 wireframe は作らない)。

## チーム計画

team-formation はスコープ外スキップ — N/A(ソロ運用。staffing / schedule は Unit と依存が確定した後の Delivery Planning で承認する — cid:approval-handoff:c3。実行順の骨子は intent-backlog の PU-1〜PU-7: walking skeleton(PU-1)単独ゲート → 幅(PU-2〜5)→ 診断・仕上げ(PU-6〜7))。

## Go / No-Go 推奨

**Go を推奨する。** 根拠: (1) feasibility 実測で技術的成立性を確認済み (2) 未実測(add/update 両 mutation)は skeleton で最初に潰す risk-first 順序を裁定済み (3) スコープは bounded(18項目)で非対象が明文 (4) 運用前提(R-2)は診断・ドキュメント要件として In Scope に含まれ、着地を妨げない。

次フェーズ: Inception(reverse-engineering から — 既存 codekb への差分リフレッシュ)。
