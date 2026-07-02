# B001 実行メモ

## 実行方針

dev-scripts ルールに従い、eval 先行（RED → GREEN）で進める。
遷移モデルと更新規則は Functional Design（BL001〜BL006、BR001〜BR007）と D001 に従う。

eval の置き場所は `dev-scripts/evals/state-scaffold/check.ts` とする。決定論的な検証スクリプトを `dev-scripts/evals/*/check.ts` + `package.json` の `test:it:*` 入口で運用する既存の repo 慣行に合わせる（R005 の許容範囲内）。

## 対象タスク

- T001: eval を先行追加し、RED を確認する。
- T002: 雛形生成スクリプトを実装し、GREEN を確認する。
- T003: amadeus-validator の昇格先を promote で同期する。

## 作業順序

1. T001 で eval と実行入口を追加し、RED を記録する。
2. T002 でスクリプトを実装し、GREEN を確認する。
3. T003 で promote 同期と配布先相当の実行確認を行う。

## 実装判断

- 引数は `<workspace> <遷移種別> --intent <intent-dir>` を基本形とし、functional-design は `--unit`（と `--frontend-surface`）、bolt-preparation は `--bolt` と `--unit` を取る。
- inception の必須成果物配列は、開始系と完了系の両方で実在ファイルの走査により確定する（実運用では開始時に空、補修や replay では実在分が入る一貫した規則になる）。
- `inception.codebaseAnalysis` は validator が inception phase で必須とするため、inception-start が未設定時の既定値（`requirement: unresolved`、`status: blocked`、`blockedReason: target_scope_unresolved`）を置き、stage skill の設定値を常に保持する。
- targetUnits と targetBolts は「準備が済んだ対象だけを載せる」リストとして扱い、functional-design と bolt-preparation の遷移が追加する。construction-start は空で開始する。
- bolt-preparation は construction ブロック不在時に construction-start を内包して実行する。
- 実装中の発見: 現行 validator は construction phase に「Bolt 準備済み（taskGeneration と notes.md）の Bolt が 1 件以上」を要求するため、construction-start と functional-design の直後の状態は単独では validator を通せない。検証チェックポイントは最初の bolt-preparation 完了後とし、スクリプトの usage コメントと eval に明記した。Issue #311 も「Construction 開始、Functional Design、Bolt 準備」を一括りに扱っており、この解釈は Issue の遷移分類と整合する。

## 未確認事項

- 変更 PR の説明は、レビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従う。
