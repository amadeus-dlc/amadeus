# Security Test Instructions — 260726-plugin-host-delivery

> 上流入力(consumes 全数): code-generation-plan、code-summary — 各ユニットの code-generation-plan.md が引くセキュリティ NFR(U2 の fail-closed CLI・安全契約、U3 の OutDirRefusal、U6 の advisory 限定)へ trace できる検査のみを選定した(bt-proportional-selection — SAST/DAST 等の機械追加はしない。攻撃面は CLI 引数とファイル書込境界に閉じる)。

## 検査対象(承認済み NFR への trace)と検証テスト

1. **fail-closed CLI(U2 security-requirements「fail-closed CLI(mutation 前拒否)」)**: 未知 verb/フラグ/余剰引数は usage+exit 2 で mutation 前拒否 — t300(parser 全列挙)/ t302(失敗分岐の in-process 駆動)
2. **安全契約(同「trust / no-clobber / atomic / path escape」)**: 未解決 anchor / slug 衝突の事前拒否、drop の record-owned 復元 — t299(verify 失敗の三面不変、drop→baseline 復元)
3. **出力先安全(U3 SEC-U3-1 / OutDirRefusal)**: symlink / 通常ファイル / 非空 dir の書込前拒否を**本番書込経路**(writeNeutralBundle)で発火 — t309(関数境界)+ t312(実経路の落ちる実証、§12a iteration 2 で配線を是正済み)
4. **advisory 限定(U6 / ADR-1 案A)**: formal-model-check は spec-hash advisory のみで自動実行・外部プロセス起動を持たない — t319/t320/t321(自動実行経路の不在をテスト固定)
5. **認証情報の非保持(U2 同名節)**: プラグイン CLI は credential を読まない・保持しない(コード面 grep で該当 API 使用なし)

## 実行方法

- 上記テストはすべて `bash tests/run-tests.sh --ci` に含まれる(個別実行: `bun test <path>`)

## 依存監査の分離(c1-doctor-seam)

- 対象変更のセキュリティ回帰(上記)とリポジトリ全体の依存監査は別判定とする。本 intent は runtime dependency を追加していない(Bun-only 前提維持 — Forbidden 準拠)
