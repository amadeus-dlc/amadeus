# Requirements Analysis — 質問票(グリリングモード)

対象 intent: 260731-formal-verif-value-chain(scope: self-feature)
モード: Grill me(1問ずつ動的生成)
上流入力(consumes 全数): intent-statement, scope-document, business-overview, architecture, code-structure

各質問の導出元: Q1/Q2 は architecture(54 ファイル 3+1 分類・CI 消費実測)と code-structure(実行器4群の配置)、Q3/Q4 は architecture(advisory 機構節)と business-overview(価値チェーン3切断点 — 拾われた実績 0 回の断線)、Q5 は architecture(compose 単一ハーネス制約)。スコープ枠は intent-statement(成功指標・Won't)と scope-document(WS 分類・順序裁定)。設計委譲分は requirements.md に「設計段判断」と明記する。

## Q1. CI ラッパ群(分類 B、7 ファイル)と診断(分類 C、1 ファイル)の帰属

CI(.github/workflows/ci.yml:584/:600)が消費する run-model-check-ci.ts 系 7 ファイルと run-model-check-diagnostic.ts の行き先。

A. 分類 B・C ともプラグイン所有ツリーへ同伴移設し、CI はプラグイン配下のパスを叩くよう付け替える(推奨 — scripts/formal-verif ディレクトリを完全消滅させ、境界ガードの検査対象を一元化)
B. 分類 B・C は repo 残置(scripts/formal-verif に CI 専用の最小集合を残す)
C. 分類 C は削除、分類 B のみ移設
X. Other (please specify)

[Answer]: A. 全移設(B・C ともプラグイン所有ツリーへ同伴、CI パス付け替え、scripts/formal-verif 完全消滅)— 2026-07-31 Grill me モード

## Q2. 分類 D(実験残骸 30 ファイル)とテスト面の削除範囲

分類 D はどの CLI からも到達不能だが、tests/ の 93 パスから広く参照される(provenance.ts 14 件等)。

A. 分類 D 30 ファイル+それを参照するテスト・fixture・support を全削除し、complexity-baseline 20 件・allowlist 該当エントリも同一変更で整理(推奨 — #1829 裁定「残りは削除」の完全実施。ノルムが引く出典は experiment/eligibility-report.md でありコードではない)
B. 分類 D は削除するがテストは個別判定(残せるものは残す)
C. 分類 D の削除を縮小(参照数の多い provenance.ts 等は残す)
X. Other (please specify)

[Answer]: A. 全削除(30 ファイル+参照テスト群+台帳エントリを同一変更で整理)— 2026-07-31 Grill me モード

## Q3. advisory の発火点(チェックポイントの配置)

#1738 は「発火点が build-and-test 直前では遅すぎる」とし、受け入れ基準はチェックポイント1(RA/US 段)・2(FD 段)の両貫通を要求する。現行発火点の扱いは。

A. チェックポイント1(requirements-analysis directive 発行前)+2(functional-design directive 発行前)を新設し、既存の build-and-test 直前は最終安全網として維持(計3点。推奨 — 上流検出と最終網の両立。複数呼出化に伴い run 単位のラッチを導入)
B. 発火点を1・2へ移し、build-and-test 直前は廃止(計2点)
C. チェックポイント1のみ新設(計2点: RA 前+build-and-test 前)
X. Other (please specify)

[Answer]: A. 3点+ラッチ(CP1 RA 前+CP2 FD 前を新設、build-and-test 前は最終安全網、run 単位ラッチ導入)— 2026-07-31 Grill me モード

## Q4. advisory チャネルの強化形

#1738 断線2「stderr 1行で conductor に拾われた実績 0 回」の是正形。stdout の directive JSON バイト純度は既存契約(stdout-directive-stderr-advisory)。

A. directive JSON に構造化フィールド(例 advisories: [...])を追加し、conductor が消費してユーザーへ表示する契約にする。stderr 1行も併用維持(推奨 — 機械消費可能な面を作るのが本質。stage-protocol 側に「advisories フィールドを提示する」規範を追記)
B. stderr のまま文面強化のみ(複数行・強調)
C. 専用ファイル(hooks-health 等)へ書き、statusline で表示
X. Other (please specify)

[Answer]: A. directive JSON へ advisories 構造化フィールドを追加(conductor 提示規範+stderr 併用維持)。ユーザーから advisory チャネルの初見向け説明を求められ、説明後に A を選択 — 2026-07-31 Grill me モード

## Q5. composition 多ハーネス化の要件形

現状 compose は単一ハーネスツリーのみ(staging も .claude/ 従属)。#1738 断線1の是正形。

A. install/compose verb に「検出された全ハーネスツリーへの一括 compose」を追加し、本 repo では全現存ハーネスツリー(.claude/.codex/.cursor/.kimi-code/.opencode/.kiro 等の実在分)へ compose 済み状態にする(推奨 — 断線の直接是正。個別 compose も維持)
B. 個別 compose のまま、本 repo の全ツリーへ手動で compose を実行して状態だけ揃える(機構変更なし)
C. SessionStart hook での自動 compose(各ハーネス起動時に自ツリーへ)
X. Other (please specify)

[Answer]: A. 一括 compose verb 新設+本 repo 全現存ツリーを compose 済みに(個別 compose 維持)— 2026-07-31 Grill me モード

## 裁定の記録

- Q1〜Q5 はいずれもユーザーの直接回答(Grill me モード、AskUserQuestion 経由)。Q4 は初見向け説明の対話1往復後に確定。ソロモードにつき選挙不要 — 根拠種別: ユーザー直接裁定(1問1行)。
- RE 裁定事項8件のうち残り4件(manifest スキーマの形 / canonical.ts 外部依存の扱い / MAX_RECEIPTS 有限化定数 / model-map 正準 impl 集合)は設計段判断として requirements.md に委譲を明記。
- ユーザー承認: 2026-07-31T09:52:36Z
