# #1664 Code Generationサマリー

## 根因と修正

`t224` fixtureのmigration／doctor subprocessが、他の並列test processとOS一時領域のaudit-lock namespaceを共有していた。lock名は`projectDir`を含むidentityのMD5先頭32bitである。制御testは異なる2つの`projectDir`を探索し、実際に同じlock pathへ解決されるpairを作る。別identityの生存processがその共有lockを占有すると、doctorは5秒の再試行後に`Failed to acquire audit lock after retries`となり、2026-07-28のCIと同じmigration `status=1`へ決定的に到達し、workspaceをrollbackした。

migration／installed doctor subprocessへfixture固有の`.git/amadeus-test-audit-locks`を`AMADEUS_LOCK_BASE_DIR`として渡した。明示的な`extraEnv`は後勝ちのままなので、lock failureを注入する既存・将来testは上書きできる。製品のclone-id導出、migration、doctor、lock timeoutは変更していない。

過去CIはsubprocess出力を保存していなかったため、その1回が同じlock競合だったことを事後に証明することはできない。一方、異なるfixture identityの実在する32bit衝突、共有baseでの同じstatus 1、専用baseでのGreenは同一test内で固定した。

当初要件が探索対象にしたsymlink解決、clone-id導出、process起動、fixture cleanupではなく、実測根因はdoctorのaudit-lock取得だった。FR-CROSS-2に従い、4候補への汎用failure hook追加ではなく、実測lock境界のRed→Greenを受け入れテストへ採用した。broken symlink、doctor差替え、rollback、cleanupの既存integration testsは非退行確認として維持している。

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
- 異なるfixture identityが同じ32bit lock pathへ解決されることを実測
- 共有audit-lock占有Red: migration `status=1`、doctor `Failed to acquire audit lock after retries`、rollback成功
- fixture固有lock base適用後の同条件: PASS
- symlink clone-id対象case: PASS
- 対象5件: 5 PASS / 0 FAIL / 41 expects
- t224全体: 62 PASS / 0 FAIL / 576 expects
- coverage runner（並列4）: 62 PASS / 0 FAIL / 576 expects
- CI追補: subprocess argvを静的分類器が追跡できる配列定数へ戻し、診断fixtureの旧framework接頭辞を中立名へ変更した。
- CIで失敗したmechanism ratchetとgenerated-prefix contract: 10 PASS / 0 FAIL / 53 expects
- CI追補後の対象4件: 4 PASS / 0 FAIL / 33 expects
- CI追補後のt224全体: 62 PASS / 0 FAIL / 576 expects
- typecheck: PASS
- lint: PASS（既存baseline warningのみ）
- `git diff --check`: PASS

fixture cleanupはmigration subprocessがresultを返した後の`afterEach`で走るため、今回のstatus 1経路には関与しない。symlink target内容、symlink種別、clone-id安定性、Git workspace／index rollback、doctor audit append契約はt224全体で維持した。

- 対象: [#1664](https://github.com/amadeus-dlc/amadeus/issues/1664)
- Draft [PR #1687](https://github.com/amadeus-dlc/amadeus/pull/1687)
- timeout延長、serial化、推測的なproduct変更は行っていない。
