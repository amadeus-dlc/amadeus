# Security Design — u1-asset-build

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` は engine nfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一存在する `business-logic-model` の GitHub Release 境界をfallback入力とし、認証基盤を新設せず既存 workflow 権限へ閉じる。

## 信頼境界と権限

- asset 生成は checkout 済みの固定 SHA と、repository 内の正本だけを入力にする
- 公開は既存 `github-release` job の GitHub App token / workflow permission を再利用し、生成スクリプトへ credential を渡さない
- `scripts/release-dist.ts` はローカル file I/O のみを行い、ネットワーク・shell 展開・任意コマンド実行を持たない
- version は release-it が確定した semver を parse した値だけ受理し、path separator、`..`、制御文字を拒否する

## 完全性と入力検証

tar、`SHA256SUMS`、manifest の三点を同一 job の一時ディレクトリで生成し、公開前に次を fail closed で照合する。

1. manifest の `harnesses` が archive wrapper 直下のディレクトリ集合(7ハーネス+`plugins` — u1 FD の同梱範囲申告と domain-entities 不変条件2に一致)と deep-equal である。**独自フィールド(payloadRoots / pluginRoot)は導入しない — BR-U1-3 の manifest schema に整合(旧記述は無申告拡張のため撤回、承認済み FD 契約へ是正)**
2. manifest の `fileCount` が archive entry 数と一致する
3. manifest の `sha256` と `SHA256SUMS` の tar digest が一致する
4. archive entry が wrapper 配下に正規化され、absolute path、`..`、symlink escape を含まない
5. secret に見える既知の credential file、`.env`、per-user runtime を同梱しない

生成DAGは `tar → tar SHA-256 → manifest(tar digestを格納) → manifest SHA-256 → SHA256SUMS(tarとmanifestの2行)` の一方向とする。checksum は転送破損検出であり署名ではない。改竄耐性は GitHub Actions の固定 SHA checkout、HTTPS、Release write permission、人間の `workflow_dispatch` 承認境界が担う。

## 監査とログ

成功時は asset 名、version、fileCount、harness 集合、digest を出す。失敗時は秘密や署名付き URL を含めず、検証項目と期待値/実測値を stderr に出して非0終了する。公開前検査の失敗を warning へ降格しない。
