# Security Design — U2 u2-install-verb

上流入力(consumes 全数): security-requirements.md、performance-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

SR-U2-1〜3(security-requirements.md)の実現:
- 書込面の限定: 書込パスは pluginSourceRootOf(hostRoot) 配下の dst/tmp/old のみ(business-logic-model.md Step 3)
- **plugin 名の健全性検査(本書の敷衍 — FD/NR に無い設計追加の hardening、申告)**: dst の名前は basename(sourcePath) 由来だが、導出結果が単純なディレクトリ名でない場合(空・`.`/`..`・パス区切り含み)は handleInstall Step 1 の source 検分で failure(stage:"install")として拒否する。staging 外への書込を名前経由で構成不能にする defense-in-depth であり、実施箇所は handleInstall(parseInstall は path 存在の構文検証のみ)
- symlink: lstat で判定しコピー対象から除外+stderr 警告(コピーは実体のみ — tech-stack-decisions.md TS-U2-1 の標準 FS API)
- 無音上書き禁止: different → failure、置換は --force+swap のみ(reliability-requirements.md RL-U2-1 の3値可視状態と同一機構)

## 境界確認

- trust 三層は不変(compose 委譲 — performance-requirements.md / scalability-requirements.md の N/A 判定にも影響しない)
