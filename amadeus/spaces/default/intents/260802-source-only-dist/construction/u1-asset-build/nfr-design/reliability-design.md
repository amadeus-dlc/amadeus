# Reliability Design — u1-asset-build

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` は engine nfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一存在する `business-logic-model` の build→archive→digest→manifest→self-check をfallback入力とする。

## 失敗モデル

| 失敗 | 検出 | 回復 |
|---|---|---|
| package build 失敗 | subprocess 非0 | 即停止。修正後に job 全体を再実行 |
| archive entry 不正 | path 正規化検査 | 即停止。一時成果物を公開しない |
| digest / manifest 不一致 | self-check | 即停止。不一致内容を stderr |
| 再現性比較差 | byte 比較 | 即停止。差分ファイル一覧を保持 |
| upload / release API 失敗 | Action step 非0 | GitHub の同一 workflow 再実行を利用 |

## 原子性と再実行

- 三成果物は `mkdtemp` 相当の一時ディレクトリで完成させ、全 self-check 成功後だけ upload 対象ディレクトリへ昇格する
- 既存の同名成果物を部分上書きしない。出力先が非空なら明示的に拒否する
- archive仕様はregular file mode 0644、directory 0755、symlink拒否、entry名UTF-8/昇順、mtime=Unix epoch、uid/gid=0、uname/gname空、ustar形式(PAX禁止)へ正規化する。gzipはCIでpinしたGNU gzipを`-n -9`で使い、header mtime/filenameを消す
- 個別ファイルの retry は行わない。生成は決定的で副作用がローカル一時領域に閉じるため、job 全体再実行を唯一の回復手段とする

## 可用性と復旧

常駐サービスではないため health check、circuit breaker、multi-AZ は N/A。3 assetはdraft releaseへuploadし、3点upload+download再検証が完了するまでpublishしない。途中失敗時は当該runが作成した同名assetだけを削除して非0終了する。再実行は同一versionの同名assetが0件であることを前提とし、残存時は上書きせずfail closedする。復旧はcleanup確認後に同一固定SHAからworkflow全体を再実行する。
