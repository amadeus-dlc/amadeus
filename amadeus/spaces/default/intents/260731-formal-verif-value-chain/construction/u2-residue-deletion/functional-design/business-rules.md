# Business Rules — u2-residue-deletion

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## BR-U2-1: 削除は列挙照合の後にのみ実行

D1〜D4 の対象集合は実装時 grep/ls の機械算出で確定し、起草時スナップショット(30/20/14 件)と照合してから削除する(inventory-from-grep-each-time)。不一致は停止して報告(fail-closed — components.md C10 の削除面と unit-of-work.md u2 の AC に整合)。

## BR-U2-2: A/B/C 系への無接触

u1 が移設した 24 ファイル(plugins/formal-model-check/tools/)の実体と台帳エントリには触れない。ただし **barrel index.ts(D)経由で A/B/C シンボルを import している既存テストの import 文の書き換えは u2 の正規スコープ**(D2 (ii) — index.ts 削除の随伴であり A/B/C 実体への変更ではない)。混在テストは D2 (iii) の部分外科とし、残部 green を個別確認する(component-methods.md C10 の削除面契約)。

## BR-U2-3: 復活の禁止

削除は revert 可能な通常コミットで行う(履歴 rewrite なし)。ただし削除後に同機能を「便利だから」と部分復活させない — 復活は新規要件としてユーザー裁定を要する(services.md の配布面契約に D 系は含まれない)。

## BR-U2-4: TDD 適用外+前後 green

純削除のため TDD 適用外(NFR-2 の適用外 (2) 相当)。代替検証: 削除前ベースライン green の実測 → 削除 → 全検証コマンド green(BR-U1-6 と同一集合)+ローカル lcov。

## BR-U2-5: 削除目録の PR 明記

PR 本文に削除ファイル全数の目録(コード 30+テスト群+台帳エントリ数)を機械集計値で記載する(numbers-from-command-output-only)。
