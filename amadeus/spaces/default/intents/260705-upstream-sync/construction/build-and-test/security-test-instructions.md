# security-test instructions（260705-upstream-sync）

上流入力: [code-summary.md](../upstream-sync/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

認証情報・外部入力境界・権限チェックに触れる変更はない。取り込んだ compose 機構は human gate（approve/edit/reject）を必須とし、composed scope の書き込みは人間承認後に限られる（上流設計）。専用の security-test 工程は不適用と判断する。

## 検証

- ハードコードされたシークレットがないことは取り込み diff のレビュー（reviewer READY）で確認済み。
- stop hook の compose-pending marker は fail-open 設計（読み取りエラーは従来の cap-bounded block へフォールバック）であり、無言の失敗を作らない。
