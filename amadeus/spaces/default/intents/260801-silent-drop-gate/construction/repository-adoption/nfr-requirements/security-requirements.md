# Security Requirements — repository-adoption

## 上流入力と資産

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とする。保護対象はtrusted previous ledger、canonical baseline／exemption、raw／approved evidence、classification、approval receipt、bootstrap provenance、CI blocking判定である。

## 信頼境界

| ID | 境界 | 必須制御 |
| --- | --- | --- |
| SEC-RA-01 | CI event → base revision | `pull_request` はbase SHA、pushはbefore SHAだけを選び、lowercase／uppercase hexを正規化せず40 hex、非zero、commit objectとして検証する |
| SEC-RA-02 | Git object取得 | shell展開なしのliteral argvで `git cat-file`／必要時の `git fetch origin <full-sha>`／`git show` を実行し、HEADやmerge-baseへfallbackしない |
| SEC-RA-03 | evidence chain | 各段が前段exact bytesのSHA-256 digest、full revision、schema versionを検証し、不足／余剰／重複／改変で次段を生成しない |
| SEC-RA-04 | human approval | rawとclassification digest、reviewer identity、承認時刻、audit event identityをreceiptへ結合し、別censusへの再利用を拒否する |
| SEC-RA-05 | canonical promotion | evidence commandとCIにはledger更新権限を与えず、人間レビュー済みrepository changeだけで昇格する |
| SEC-RA-06 | untrusted fork | base repositoryのbase SHAだけをread-only `contents: read` で取得し、fork headのsecret／write権限を要求しない |

## 入力・path・実行制御

- short SHA、symbolic ref、空、全zero、非hex、object不在、unsupported eventをblocking failureにする。
- ledger path、rule path、authored rootsはU1のrepository-local contractから取得し、workflow inputやfinding bytesから任意pathを組み立てない。
- evidence outputは既存path、symlink、repository外escapeを拒否し、new-output-onlyを維持する。
- runtime install、remote analysis service、credential、artifact uploadを追加しない。networkはcheckout後の欠落base objectを同一originからliteral full SHAで取得する場合だけ許可する。
- `continue-on-error`、`|| true`、stderr文字列判定、current ledgerだけを信頼するfallbackを禁止する。

## Supply chainと機密性

- Bun 1.3.13、exact dependency `@ast-grep/cli` 0.45.0、`package.json`、`bun.lock`をfrozen installで固定する。CI中の`bunx`／npm latest解決を禁止する。
- command recordはargv、cwd、full revision、environment contract、exit、stdout／stderr digestだけを保持し、token、credential、authorization header、runner固有secretを保存しない。
- raw findingのsource excerptは承認に必要な最小範囲だけとし、environmentやrepository外fileをevidenceへ収集しない。
- generated treeを直接編集せず、canonical sourceとpackagerのdigest chainを維持する。

## セキュリティ検証

- short／zero／nonhex／symbolic／unresolvable SHA、fork head SHAの誤選択、fetch failureを注入し、gate未実行またはtyped nonzeroとなることを確認する。
- raw、classification、receipt、approved evidence、candidate、bootstrap provenanceの各1 byte改変を次段で拒否する。
- baseline／exemptionをsource findingと同時に増やしてもtrusted base subset比較が拒否することを検証する。
- workflow fixtureでargvがliteral値として渡され、shell metacharacterをcodeとして解釈しないことを確認する。
- PR base、fork PR base、push beforeでsecret 0件、write permission 0件のままobject materializationと実 `git show` が成立することを確認する。

## 非適用

HTTP認証、TLS、CORS、database encryption、cloud IAM、DASTは実行面がないため非適用である。新しいremote service、credential、artifact storeを導入する場合はscope changeとsecurity reviewを要求する。
