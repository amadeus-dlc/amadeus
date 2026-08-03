# Security Requirements — static-gate-engine

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とする。対象データはrepository内のsource、設定、baseline、exemption、evidenceであり、PII、PHI、決済情報、資格情報、外部規制対象データは処理しない。

## セキュリティ境界

| 境界 | 脅威 | 必須制御 |
| --- | --- | --- |
| CLI引数 | path traversal、短縮SHA、未知command | commandを閉集合でparseし、full SHAとrepository-relative literal pathだけを許可 |
| authored roots | symlink escape、読取不能、走査漏れ、TOCTOU | 各path componentのsymlink拒否、`O_NOFOLLOW` open、`lstat`／`fstat` のdevice・inode一致、descriptor経由read、走査前後digest照合 |
| ast-grep process | PATH hijack、shell injection、改変binary、probe後差替え | checked-in toolchain receiptで検証した私有コピーを、shellなしliteral argvで起動 |
| TypeScript解析 | filesystem再読によるTOCTOU | `SourceSnapshot` overlayを唯一の解析bytesとし、元source再読を分類根拠にしない |
| baseline／exemption | 違反の無断承認、同数置換 | base revisionのtrusted setとのsubset検査、追加とreplacementを拒否 |
| evidence出力 | 既存証跡の上書き、承認偽装 | new-output-only、全digest結合、human gate audit event IDとreviewerを検証 |

## Supply-chain要件

- ast-grepはmanifestと`bun.lock`でexact versionを固定し、`bun install --frozen-lockfile`で再現できること。
- `config/no-silent-drop/toolchain-lock.json` を人間review済みの信頼元とし、`@ast-grep/cli` version、platform／arch、package binary相対path、SHA-256を固定する。通常checkはこのtracked file自体のdigestもtool receiptへ結合すること。
- TypeScript、Bun、Biomeは既存repositoryの固定方法を維持し、未固定downloadを実行時に行わないこと。
- binary欠落、version不一致、rule bundle不正、stdout schema不正は `TOOL_MISSING` または `RULE_INVALID` のtyped Error、exit 2とすること。
- contributor-side gateのために新規remote service、API token、credential、privileged runnerを導入しないこと。

## 入力・パス防御

- absolute path、`.`／`..` traversal、repository外realpath、case-foldによる別identityを拒否する。
- 列挙時にrootから対象fileまでの全path componentを`lstat`し、symlinkを拒否する。対象fileは`O_RDONLY | O_NOFOLLOW`で開き、open前`lstat`とopen後`fstat`のdevice、inode、type、sizeが一致する場合だけ、そのdescriptorからEOFまで読む。読取後の`fstat`でdevice、inode、size、mtimeが変化した場合は `SOURCE_CHANGED_DURING_SCAN` とする。以後のast-grep mirrorとTypeScript overlayはこのdescriptor由来bytesだけを使う。
- `fixtures/`、`__fixtures__/`、`*.fixture.*`、生成物として明示されたpathは本番censusから除外し、除外規則自体を固定configとしてdigestへ含める。
- marker理由やsource textをshell commandへ連結しない。
- diagnosticはsource locationと固定templateを使い、secretや任意のsource全文をstdout／stderrへ複製しない。
- temp mirrorはread-onlyとして作成し、終了時にrepository内へ残さない。temp pathやPIDを機械可読stdoutへ含めない。

## 権限・整合性要件

- 通常 `check` はsource、config、baseline、exemption、canonical evidenceを変更しない。
- evidence commandは指定された未存在pathにだけ書き、既存fileがある場合は上書きせず失敗する。
- ast-grep起動前にpackage binaryを`0700`の私有temp directory内へ`O_CREAT | O_EXCL`でコピーし、close前後の`fstat`とSHA-256をchecked-in toolchain receiptへ照合する。合格した私有copyのliteral absolute pathだけを一度spawnし、PATH、`node_modules/.bin`、probe済み元binaryを直接execしない。これにより検証後の元binary差替えを実行bytesへ伝播させない。
- `NSD001`／`NSD003` は免除不可、`NSD002` exemptionもnode単位・非空理由・ledger全単射を満たす場合だけ適用する。
- baseline／exemption追加は通常commandで承認できず、scope changeと人間再承認を先行させる。
- FPをTP、baseline、intentional-dropへ移して合否を偽装しない。baseline promotion evidenceはFP=0を必須とする。

## Compliance判定

本Unitはrepository内の開発資産だけを処理し、個人データ、医療情報、カード情報、data residency、retention義務を新規に生じさせない。そのためGDPR、HIPAA、PCI-DSS等の個別control mappingは非適用である。ただし、依存固定、変更履歴、承認receipt、決定的evidenceはsoftware supply-chainと監査可能性の内部統制として必須とする。

## 検証要件

- traversal、全path componentのsymlink、`lstat`後差替え、open後書換え、tool receipt改変、package binary差替え、rule破損、schema破損、既存output path、ledger growth／replacementをnegative fixtureで検証する。
- before／after bytes比較により、通常checkと拒否されたevidence commandがcanonical fileを変更しないことを示す。
- child process起動がshellを経由せず、literal argvとfixed binaryを使用することをunit／integration testで固定する。
- security検査は実在する上記攻撃面へ限定し、HTTP DAST、IAM、VPC、KMS等の非適用検査を追加しない。
