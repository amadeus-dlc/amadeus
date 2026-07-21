# Initiative Brief — upstream-sync-230

上流入力(consumes 全数): intent-statement(`../intent-capture/intent-statement.md`)、scope-document(`../scope-definition/scope-document.md`)、intent-backlog(`../scope-definition/intent-backlog.md`)、feasibility-assessment(`../feasibility/feasibility-assessment.md`)、constraint-register(`../feasibility/constraint-register.md`)

## Intent と問題

intent-statement より: upstream `awslabs/aidlc-workflows` v2.2.0→v2.3.0 の変更窓(19 パッチ+プラグイン機構)に Amadeus が未追従。実測済み欠陥(bolt_dag 無音 degrade、フックのパス脆弱性等)への修正と拡張基盤(プラグイン機構)が未取り込み。事前分析はユーザー承認済み(ledger 8/8 APPROVED、24 ADOPT/ADAPT+6 SKIP)。

## 市場検証サマリ

N/A — market-research は SKIP(内部フレームワークの継続自己開発)。投資判断はユーザーの直接指示(2.3.0 追従 Intent の作成)として成立済み。

## 実現可能性とリスク

feasibility-assessment より: **GO(無条件)**。全ブロック実現可能性 高〜中。主要リスク(constraint-register / RAID): スキーマ変更の6ハーネス波及(dist:check で機械検証)、プラグイン機構の規模(walking-skeleton 規律で最小スライス先行)、MEDIUM confidence 4項目(inception で検証先行 — スコープ縮小方向)。ライセンス面 green(upstream MIT-0)。

## スコープ境界

scope-document より: In = 24 ADOPT/ADAPT(D1 正しさ6 / D2 機能4 / D3 検出2 / D4 ハーネス3 / D5 レビュアー2 / D6 プラグイン5 / D7 テスト / D8 docs)、全項目 Must。Out = SKIP 6件・upstream deferred 面・pre-2.2.0 認証・upstream 還流。

## コンセプトビジュアル

N/A — rough-mockups は SKIP(GUI なし)。仕様面の共有ビジョンは承認済み計画の項目定義が担い、UI-less 出力契約は requirements / functional-design で確定する。

## チーム計画

N/A(named mob の先取りはしない — approval-handoff:c3)。常設チーム(leader+e1〜e6、チームモード規範)を前提に、staffing・Bolt スケジュールは Delivery Planning で承認する。実行順序の骨格は intent-backlog の proto-Unit 8束(PU-1 検証先行スパイク → PU-2 正しさ修正 → … → PU-7 プラグイン本体)。

## Go/No-Go 推奨

**Go** — ただし実行形態はユーザー指示により2段階: (1) 本 intent は approval-handoff 承認後に **park**(ideation 完了状態で停止) (2) inception 以降(分析〜実装)は**ユーザーの明示的な再開承認後**に実施。再開時は `/amadeus --resume` で per-clone カーソルを復元し、origin/main 前進分の再接地(comparison_commit `a326f47bc` からの diff 再実測)を最初のタスクとする。
