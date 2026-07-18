# Business Rules — fix-1170-retreat-guard(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## ルール一覧(テスト可能形)

| # | ルール | 由来 | テスト |
|---|---|---|---|
| BR-1 | set-status は checkbox が completed/awaiting-approval のステージを in-progress へ戻さない(Current Stage 同時巻き戻しも単一述語で被覆) | FR-1a/ADR-2 | unit: 両状態で no-op を assert |
| BR-2 | 後退検出時は state 全体を書かない(部分書込なし)・stderr advisory 1行・exit 0 | FR-1c(E-SMF-RA Q1=A) | unit: ファイル内容不変+stderr 実測+exit 0 |
| BR-3 | 判定は withAuditLock 内で再 read した現在値に対して行う(lock→read→compare→write) | FR-1d(Q2=A+留保) | integration: set-status ∥ advance 並列 spawn で lost-update 非再現(t145 様式) |
| BR-4 | pending/in-progress/revising への書き込みは従来どおり成功する | FR-1b | unit: 3状態で従来フィールド群の書き込みを assert |
| BR-8 | skipped(`[S]`)および checkbox 行なし(cb=undefined)のステージへの書き込みは従来どおり通過する(述語が禁止集合を x/? の2状態に限定していることの検証) | NFR-1/ADR-2(reviewer Finding 2 是正) | unit: skipped+行なしの2ケースで書き込み成功を assert |
| BR-5 | エンジン RMW ハンドラ・setCheckbox 純変換は不変 | FR-1e | 既存スイート green(t145 ほか)+diff 検分 |
| BR-6 | CLI 引数契約(--stage/--project-dir/--intent/--space)不変・audit 非 emit 維持 | NFR-1/NFR-5 | 既存呼び出し(hook)無変更で通ることの実測+後退 no-op 経路で audit シャードが非追記であることの直接 assert(reviewer Finding 4 是正) |
| BR-7 | handleSetStatus は export(argv パラメータ化)し in-process で全分岐を駆動可能にする | NFR-4/ADR-5 | unit が spawn なしで直接呼ぶ+ローカル lcov 未カバー 0 |

## 落ちる実証(FR-4c)

新設ガードの述語(BR-1)へ、実行時に消費される行(判定分岐の実行行)で注入(例: 述語を恒偽化)し、BR-1/BR-2 の unit テストが赤くなることを実証してから完成扱いにする(inject-runtime-consumed-lines。注入→赤実測→revert push までを1セット — falling-proof-injection-one-set)。

## テスト層の読み替え注記(nfr-design 段で確定、2026-07-18)

本表の「unit:」表記は「in-process 駆動(spawn なし)」の意味で書かれたが、handleSetStatus は実 FS に触れるため配置層は **tests/integration** が正(fs-tests-integration-first)。配置の正本は nfr-design/logical-components.md のテスト配置節 — nfr-design reviewer Finding 2 の解消として本注記を追加(検証内容・BR の意味は不変)。
