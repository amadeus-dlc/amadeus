# #1664 Code Generationサマリー

## 根因と修正

`t224` fixtureのmigration／doctor subprocessが、他の並列test processとOS一時領域のaudit-lock namespaceを共有していた。生存中processのlockを同じnamespaceへ配置する制御fixtureでは、修正前にdoctorが5秒の再試行後に`Failed to acquire audit lock after retries`となり、2026-07-28のCIと同じmigration `status=1`へ決定的に到達した。

migration／installed doctor subprocessへfixture固有の`.git/amadeus-test-audit-locks`を`AMADEUS_LOCK_BASE_DIR`として渡した。明示的な`extraEnv`は後勝ちのままなので、lock failureを注入する既存・将来testは上書きできる。製品のclone-id導出、migration、doctor、lock timeoutは変更していない。

過去CIはsubprocess出力を保存していなかったため、その1回が同じlock競合だったことを事後に証明することはできない。一方、共有namespaceが同じstatus 1を起こす実在の非決定性と、その隔離によるGreenは制御fixtureで固定した。

## 診断

過去ログには`expect(result.status).toBe(0)`の失敗しかなかった。修正後は対象caseが非0なら、次を1つのassertion errorへ保存する。

- clone-id symlinkのfixture内論理pathとtarget path
- 実行command
- exit-status／signal／spawn-errorの終了経路
- status、signal、spawn error
- stdout、stderr

成功時は追加dumpを出力しない。

## 検証証拠

- exit-status、signal、spawn-errorの各制御結果: 3 PASS
- 共有audit-lock占有Red: migration `status=1`、doctor `Failed to acquire audit lock after retries`
- fixture固有lock base適用後の同条件: PASS
- symlink clone-id対象case: PASS
- 対象5件: 5 PASS / 0 FAIL / 36 expects
- t224全体: 62 PASS / 0 FAIL / 571 expects
- coverage runner（並列4）: 62 PASS / 0 FAIL / 571 expects
- typecheck: PASS
- lint: PASS（既存baseline warningのみ）
- `git diff --check`: PASS

fixture cleanupはmigration subprocessがresultを返した後の`afterEach`で走るため、今回のstatus 1経路には関与しない。symlink target内容、symlink種別、clone-id安定性、Git workspace／index rollback、doctor audit append契約はt224全体で維持した。

- 対象: [#1664](https://github.com/amadeus-dlc/amadeus/issues/1664)
- timeout延長、serial化、推測的なproduct変更は行っていない。
