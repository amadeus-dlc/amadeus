# Security Design — goa-sparse-acceptance

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 脅威境界

変更面はversion-controlled MarkdownとローカルCLI引数を処理するpure parser/validatorである。network、credential、認証主体、秘密情報、共有databaseを追加しないため、authn/authz、暗号化、CSRF/XSS header、WAF、key rotation、PCI-DSS/HIPAA/GDPR controlはN/Aとする。防御対象は不正入力による集計tamperingと部分成功によるcorrectness破壊である。

## Fail-closed設計

`parseGoaLine`はcanonical候補とsparse候補を最初のbody tokenで分岐する。sparseは全segmentについて次の順で検証し、1件でも失敗すれば`ParseFailure`だけを返す。

1. labelが`/^[cC][1-9][0-9]*$/`に一致する。
2. ASCII小文字化したlabelがrecord内で一意である。
3. segmentに1個以上のvote tokenがある。
4. binは1〜8、strict ascending、重複なしである。
5. countは既存`GOA_TOKEN_RE`の非負整数文法に一致する。
6. 不正token、空segment、範囲外binを捨てず、record全体を拒否する。

成功時だけ8-bin vectorを生成し、欠落binを0にする。途中vectorを外部へ返さず、parserはfilesystem・store・timeline・global stateを書き換えない。canonicalの`2x...`順序不正と`1xz...` malformedは既存error経路へ到達させ、sparseとして救済しない。

## Errorと情報開示

新規errorは`ParseFailure`の既存型を維持し、`sparse/duplicate-label`、`sparse/bin-sequence`、`sparse/malformed-token`、`sparse/empty-segment`のstable prefixと入力token由来の最小詳細だけを持つ。path、環境変数、stack、他record内容を含めない。`GoaLineCode.parse`は複節E-codeのlexical受理域だけを拡張し、CLI`handleOpen`は期待形式の説明文だけを同期する。

## 検証

- 4 stable prefixごとの負testと、正当segment＋不正segment混在testでfailure atomicityをassertする。
- canonical正負fixtureを温存し、受理域の意図しない拡張がないことを対照検証する。
- `GoaLineCode`は複節正例、旧圧縮正例、小文字・空節・先頭末尾hyphen・非文字列の負例をtable化する。
- changed dependency、network、credential、runtime log、telemetryが0であることをdiffで確認する。
