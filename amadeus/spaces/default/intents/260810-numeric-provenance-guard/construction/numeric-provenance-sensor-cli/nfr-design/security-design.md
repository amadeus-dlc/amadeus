# Security Design — numeric-provenance-sensor-cli

唯一のpresent consume `business-logic-model.md` のrelative-link pipeline (`business-logic-model.md:61-72`)、module-level Generated Mapping検証 (`business-logic-model.md:74-80`)、CLI境界 (`business-logic-model.md:101-111`) を保護対象とする。NFR Requirements成果物はabsent-and-expectedであり、SEC-* IDは新設しない。

## Threat model

untrusted inputはMarkdown本文、`--stage`、`--output-path`、Markdown内relative linkである。保護対象はrepository境界、Generated Mapping integrity、process availability、verdict JSON integrityである。

新規network、credential、secret store、user session、database、AWS resourceは存在しないため、authentication、authorization service、TLS、KMS、IAM、VPC、CSRF/XSSは非該当である。

## Input and path controls

### Output path

Adapterはfile read前にoutput pathをproject root基準でlexical normalizeする。root外ならfileを開かず `{ kind: unavailable, reason: outside-root }` をEvaluatorへ渡す。pathが存在する場合はcanonical realpathがproject root内であることとregular-file性を確認し、pre-open device/inodeを保持する。

canonical targetをread-only + `O_NOFOLLOW` でopenし、descriptorを `fstat` してregular file性とpre-open device/inode一致を検証する。さらに元requested pathのpost-open realpath/statを取り直し、project root containmentとdescriptorのdevice/inode一致を確認する。いずれかの不一致、root外、`ELOOP` はdescriptorを読まず閉じ、`{ kind: unavailable, reason: path-race }` とする。検証成功後はpathを再openせず、同一descriptorからだけ読みfinallyでcloseする。

allowlisted root内で同一object性を確認したregular fileだけを1回読む。不在またはopenまでのENOENTはmissing stateとし、intents外、undatable、excluded、mapping不能という業務分類は安全なread後にEvaluatorがtyped skippedへ写す。これによりrepository外contentを業務分類より先に読まず、preflight/read間の置換も拒否する。

### Relative provenance link

EvaluatorはURL scheme、protocol-relative、absolute path、lexical root escape、別intent、許可artifact外をfilesystem probe前に拒否する。productionの `fileExists` / `isRegularFile` closureは、targetのcanonical realpathがallowlisted intent/codekb root内にあり、regular fileであるときだけtrueを返す。symlinkがroot外へ解決される場合はfalseとする。

テストdependencyはfilesystemに触れず、path→existence/regular-file factを固定mapで返す。Evaluator自身へraw filesystem、process、network capabilityを渡さない。

## Content controls

- backtick内command tokenは検出対象であり、実行しない。
- Markdown linkは存在/種類だけ確認し、内容読込やnetwork fetchをしない。
- untrusted textをshell、regex source、glob sourceへ挿入しない。
- regex patternはcompile-time fixed vocabularyだけで構築する。
- finding excerptは対象claimのbounded normalized textと位置だけを返し、file全体やabsolute pathを出力しない。

## Mapping integrity

module初期化後にreadonlyなGenerated Mappingを使用する。CLI AdapterはEvaluator呼出前にschema revision、authority digest、lookup key重複、mode/searchScopeを検証する。不一致は業務上のskippedではなくprogram/configuration defectとしてstartup failureへ写し、fallback mappingを生成しない。

## Availability protection

catastrophic backtrackingを避けるregex形状とsingle-pass region indexingを使用する。100KB adversarial testはsecurity availability controlでもあり、timeoutまたはlinearity予算超過を失敗とする。入力由来でunbounded recursion、process spawn、network retryを開始しない。

## Failure disclosure

通常verdictはpathをrecord-relativeで示す。startup failureはflag名またはmapping validation reasonを示すが、環境変数、absolute home path、Markdown全体を含めない。dispatcher/auditの既存保存contractを変更しない。

## Verification matrix

| Threat | Expected control |
| --- | --- |
| `../../` link | lexical rejection、filesystem probeなし |
| symlink to outside root | root-aware closureがfalse |
| `https://` link | URL rejection |
| Markdown内 `` `rm ...` `` | command token非該当または文字列検出のみ、非実行 |
| malicious regex-like text | fixed patternでdataとして処理 |
| tampered Generated Mapping | startup failure、fallbackなし |
| huge non-match line | timeoutなし、performance budget内 |
| missing output file | `file-not-found` skipped、exit 0 |
| output path outside root / escaping symlink | readなし、`not-applicable` skipped、exit 0 |
| preflight/open/post-openでdevice+inode不一致 | descriptor readなし、`path-race` unavailable→skipped、exit 0 |

## Residual risk

runner/repository自体が侵害された場合は既存CI security boundaryの責任である。固定predicateの意味的偽陰性はsecurity enforcementではなくmapping/sweep改善対象であり、runtime heuristicを追加しない。
