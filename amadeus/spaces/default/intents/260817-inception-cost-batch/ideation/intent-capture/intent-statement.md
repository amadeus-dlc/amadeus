# Intent Statement — インセプション固定費バッチ(#3181 + #2415)

## Problem Statement

Amadeus の self-fix ワークフローは、インセプション(reverse-engineering + requirements-analysis)に修正規模と無関係な固定費を毎 intent 支払っている。実測は2系統:

1. **既確定事実の再導出**(#3181): issue-first の self-fix はクロスレビュー(独立2名・実測エビデンス付き)を通過済みで、機序・file:line・受け入れ基準の一次資料が Issue 上に揃っているのに、RE/RA の `consumes` に Issue 系 artifact が存在せず、Request 自由文への人手要約転記だけが流入経路である。結果、RA は同じ事実を成果物様式へ載せ直すために再導出し、直近時代 21 intent で RE+RA active 中央値 47分/intent(コード生成の6割強に相当する 17.0h)を消費している。
2. **RE 入力の自己増幅**(#2415): RE 差分リフレッシュの入力は「前回スキャンコミットからの全リポジトリ差分」で除外規定がなく、他 intent の工程記録が入力の 53.3%(クロスレビューで独立再現、直近7区間の排出物比は 46.5〜86.5%)を占める。チームの活動量が増えるほど 1 intent あたりの RE コストが上がる自己増幅ループになっており、除外規定の不在は契約・ノルム・実装のいずれにも確認済み(0 hit / exit 1)。

## Target Customer

- **一次**: self-fix / self-feature intent を回す conductor(AI)— インセプション所要時間の直接短縮
- **二次**: 成果物を裁定する人間とレビュアー — upstream-coverage 引用が一次資料(Issue 本文・クロスレビューコメント)へ接地し、監査可能性が上がる

## Success Metrics

- **#3181 完了条件4**: 導入後の self-fix N 件で RE+RA active 中央値を同一手法で再実測し、ベースライン(中央値 47分/intent)と比較する。N と目標低下幅は requirements-analysis で観測レンジ内に確定する
- **#2415 完了条件2**: 除外適用後の intent で RE の差分区間を再測し、入力サイズの縮小率と RE 系 subagent 実時間(現状 83.2分 / 4 intent)の比較値を記録する
- 取り込み・除外にゲートを新設する場合は落ちる実証(欠落 fixture で FAILED)を伴う(team.md Mandated)

## Initiative Trigger

ユーザー明示指示(2026-08-18): 「#3181 のようなボトルネック解消が急務」。バッチ編成(#3181 + #2415)と軽量プラン方針(儀式は削り、設計裁定と audit trail は残す)もユーザー裁定済み。両 Issue はクロスレビュー2名成立済み(xrev-3181-20260817 / xrev-2415-20260818、後者は収束 ESTABLISHED_WITH_REFINEMENTS)。

## Initial Scope Signal

- **スコープ**: self-feature(ユーザー裁定 2026-08-18。両 Issue とも enhancement = 契約の追加・意図的変更であり、project.md § Scope Overrides と整合)
- **構成**: 2 Issue = 2 Unit。units-generation / delivery-planning を EXECUTE(engine-singleton 制約 `cid:code-generation:oq-singleton` により必須)。共有ファイル(`reverse-engineering.md` / `requirements-analysis.md` / `project.md`)の競合直列化を delivery-planning で計画する
- **実装形は未確定(設計裁定事項)**: #3181 は artifact 化 / consumes 拡張 / CLI fetch の3案、#2415 は除外集合の範囲(`intents/` 単独 vs `intents`+`elections`+`codekb` の3面)を application-design で裁定する
- **temp scope**: 未作成(ストック self-feature + recompose 経路を採用)につき削除対象なし
