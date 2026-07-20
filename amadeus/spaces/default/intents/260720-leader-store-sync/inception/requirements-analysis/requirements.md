# Requirements — 260720-leader-store-sync(#1281)

上流入力(consumes 全数): business-overview, architecture, code-structure

## Intent 分析

[Issue #1281](https://github.com/amadeus-dlc/amadeus/issues/1281) — leader 所有物(選挙 store・監査シャード・norm 差分)の main 同期を構造化する。`architecture.md` の「leader 所有物の機械的同定と main 同期運搬」節(RE 新設)が機序の正本: member record-sync は intent 完了イベント駆動だが leader に終端イベントがなく、persist を伴わない選挙 record は運搬車を持たない。実測: 51本中40本・531ファイル滞留(是正 #1280)。

## 機序(RE 実測、observed c4e4fca1a)

1. **抽出対象の決定的同定**: elections store = `amadeus/spaces/default/elections/`(origin/main 55 dir — 計測 ref 分離記録)。leader 自クローンシャード = `auditShardName`(`amadeus-lib.ts:2838`、host+`.amadeus-clone-id` 12hex)で機械導出。main の audit/ 配下には非シャード md が混在するため basename フィルタ必須(シャード100件実測)。
2. **実装配置**: `code-structure.md` の scripts/ 層(repo ローカル・配布外 = gh-scripts-boundary)。前例 idiom = mirror.ts(GhRunner port・no-shell・exit 0/1/2)。gh pr create の機械化前例は不在(grep 0 — 新規面)。
3. **規範**: norm-pr-from-main-base(origin/main 起点単独ブランチ)+E-PM10A(自所有物外 M 全数突き合わせ・memory 層 main 復元)。所有権境界は `business-overview.md` のワークスペース境界(elections は leader 実行文脈の所有)。

## 機能要件

### FR-1: 同期方式【裁定待ち — E 選挙 Q1(A ノルムのみ / B tool のみ / C 併用 / D / E)。裁定成立後に確定文を記入】

【裁定待ち】

### FR-2: 同期契機【裁定待ち — E 選挙 Q2(PM 毎 / N 選挙毎 / 二重契機 / leader 裁量)】

【裁定待ち】

### FR-3: 抽出・除外の決定性(方式に tool が含まれる場合)

- AC-3a: 抽出対象は決定的述語で導出する — elections/ 全量+自クローンシャード(auditShardName 導出・basename フィルタ)。LLM 判断を含まない(deterministic-function-direct-sweep)。
- AC-3b: E-PM10A 除外規則(自所有物外 M ファイル全数の origin/main 突き合わせ・memory 層 main 版復元・メンバー intent snapshot 非同乗)を機械述語として実装し、**除外を外すと赤になる落ちる実証**を完成条件とする。
- AC-3c: 生成 PR は origin/main 起点の単独ブランチ(norm-pr-from-main-base)。PR 作成まで — マージ実行は含めない(no-AI-merge)。
- AC-3d: 自己検査(純追加性・JSON parse・マーカー正準3語彙 grep -cE 単独 — E-PM10B 追補準拠)を生成時に実行し、検査結果を PR 本文へ機械転記する。

### FR-4: 分割条件(E-OC1 選挙不要判定 — leader 承認 2026-07-20T03:41:12Z)

生成対象が閾値超過時は分割を提案する。閾値の数値は design の named constant へ委譲(constants-from-code — 要件では発明しない)。

### FR-5: 非退行

- AC-5a: 既存 CI(typecheck / lint / tests --ci)グリーン維持。新規テストは t232 帯2層様式(unit 純関数+integration mkdtempSync+fake GhRunner)。
- AC-5b: 新設検査は既存 elections 全量(origin/main)への corpus sweep で「正当データで赤くならない」側も実証(corpus-sweep-for-new-guards)。
- AC-5c: 選挙 store への書込はしない(read-only 消費 — C-8)。

## 非機能要件

- NFR-1(配布境界): scripts/ 限定・Bun-only Forbidden 非接触・gh 不在時 loud exit 1(gh-scripts-boundary)。
- NFR-2(カバレッジ): 新規行は patch ゲート対象。gh 実行は GhRunner port 注入で in-process テスト(spawn 盲点回避)。push 前ローカル lcov 未カバー0(local-lcov-pre-push)。
- NFR-3(fail-closed): 抽出・除外の判定不能(clone-id 不在・git 実行失敗)は無音続行せず loud エラー(検証劇場 Forbidden)。

## 制約

C-1〜C-8(feasibility constraint-register)を全数継承。特に C-4(マージは人間承認)・C-7(engine/CLI 面へ触れない)・C-8(elections read-only)。

## 前提

- 並行 intent との交差: scripts/ 新規ファイル+ノルム面のみで、e1(engine 面 #1279)・e2(election CLI #1267)・e4(model/record #1254 系)と静的非交差 — 実装着手前に実 diff 目録で再確認(B-4)。

## Out of Scope

W-1〜W-6(scope-document)。特に方式 B(CLI advisory)は採用時も別 Issue 委譲、既存 store の遡及再編なし。

## Open Questions

- Q1/Q2 裁定(方式・契機)— E 選挙結果待ち。
- 分割閾値・PR 本文様式の詳細 — design 委譲(FR-4/AC-3d の範囲内)。
