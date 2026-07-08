# Business Rules — install-flow

> ステージ: functional-design (3.1) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../../../inception/requirements-analysis/requirements.md`(CLI Contract、FR-003/004/009/010/011/013)、`../../../inception/application-design/services.md`(プロセストポロジー)、`../../../ideation/scope-definition/scope-document.md`(対称文法)

## CLI 契約ルール

| ID | ルール |
|----|--------|
| BR-I01 | サブコマンドなしはヘルプ表示+終了コード 0。install/upgrade を暗黙実行しない(対称文法、scope W8) |
| BR-I02 | 非対話モード = `--yes` あり **または** stdin が非 TTY。`--force` は非対話モードを含意しない(FR-009) |
| BR-I03 | 非対話モードでは `--harness` と `--target` が必須。欠落は UsageError(missing-required)で終了コード 2(FR-011) |
| BR-I04 | `--target` の cwd 既定は対話モードのみ。非対話は明示必須(CLI Contract) |
| BR-I05 | ハーネスは1実行1つ。複数指定は multiple-harnesses エラー+1つずつ実行する案内(FR-003) |
| BR-I06 | 終了コード規約: 0=成功 / 1=実行時失敗 / 2=使用方法エラー(上流 FR に規定なし — 本 Unit が導入する規約。POSIX 慣行準拠で、FR-011/013 の「バリデーションエラー/検証失敗で非ゼロ終了」を具体化) |

## 導入済み検出ルール(FR-004)

| ID | ルール |
|----|--------|
| BR-I07 | `Installation.detect` が manifested / manual-or-unknown / partial のいずれかを検出した場合、`--force` なしの install は `refuse-suggest-upgrade` — ファイルを一切変更せず upgrade を案内して終了コード 1 |
| BR-I08 | `--force` 付き install は `proceed-forced` として続行(強制再導入)。その場合も退避規則(FR-008)は免除されない |
| BR-I09 | 判断は `installation.admitsInstall(force)` が所有する。cli/planner が kind を取り出して分岐しない(Tell, Don't Ask) |

## 衝突・確認ルール(FR-010/009)

| ID | ルール |
|----|--------|
| BR-I10 | 対話モードで plan.hasConflicts(): 確認プロンプトを提示し、承諾時のみ適用 |
| BR-I11 | 非対話モードで plan.hasConflicts() かつ `--force` なし: 衝突レポートを出力して中断(終了コード 1) |
| BR-I12 | `--force` は衝突確認/中断のバイパスのみ。必須引数は補完せず、force 適用エントリは `forced: true` でレポートに明示(FR-009) |
| BR-I13 | 適用前レポート(FR-007)はモードを問わず適用/終了の前に必ず標準出力へ出す(CI 監査可能性) |

## 導入後検証ルール(FR-013)

| ID | ルール |
|----|--------|
| BR-I14 | 検証 = マニフェスト由来の必須ファイル存在 + doctor 相当チェック(harness-dir / tools-dir / memory-shell / state-absence の4観点) |
| BR-I15 | 検証失敗は失敗チェックを列挙して終了コード 1(部分成功を成功と報告しない) |
| BR-I16 | マニフェスト書き込み(FR-016)は apply 成功後・verify 前。verify 失敗時もマニフェストは残す(次回 upgrade が partial/manifested を正しく検出する材料) |

## ウィザードルール(US-A2)

| ID | ルール |
|----|--------|
| BR-I17 | ウィザードは不足値(harness/target)のみ質問し、指定済み値を再質問しない |
| BR-I18 | 展開開始前に選択サマリーの最終確認を挟む(誤導入の防止 — intent の課題3) |
| BR-I19 | FileClass 分類規則(§12a コードレビュー裁定で明文化 — 2026-07-08): `owned` = ベース名が `amadeus-` プレフィックス(FR-008 の文言に直接根拠)、`user-preserved` = パスセグメントに `memory` を含む(dist ツリーでは `amadeus/spaces/default/memory/` の1箇所のみ — チーム所有の永続プラクティス記録でフレームワークが再所有しない設計と整合)、`shared` = 上記以外。U3 upgrade-flow はこの規則を再利用する |
