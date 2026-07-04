# Functional Design Questions: U002-subagent-status-audit

## 上流文脈

この functional-design-questions は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`、`bolt-plan` を入力として作成する。

U002 は `SUBAGENT_COMPLETED` の success、failure、unknown 分類と audit taxonomy compatibility を扱う。

U002 は U001 の Shared Contracts と Error Audit evidence path に依存する。

既存 audit event 名は削除または改名しない。

## Questions

### Q1. Subagent outcome の分類基準

subagent outcome は何を信頼して分類しますか。

A. hook payload の message text から success と failure を推測する。

B. process exit code だけを信頼する。

C. transcript の最終行だけを信頼する。

D. すべて unknown にして、分類は後続 analysis に任せる。

E. 推奨: trustworthy status field がある場合だけ success または failure に分類し、ない場合は free text から推測せず unknown にする。

X. Other (please specify)

[Answer]: E

### Q2. `SUBAGENT_COMPLETED` の追加 field

既存 audit taxonomy を壊さず、どのように outcome を追加しますか。

A. event 名を `SUBAGENT_SUCCEEDED` と `SUBAGENT_FAILED` に分ける。

B. 既存 row を移行し、status field を必須にする。

C. message field に status 文字列を追記する。

D. audit ではなく doctor output だけに status を出す。

E. 推奨: `SUBAGENT_COMPLETED` に additive field として outcome、source、evidence ref を追加し、old row では missing status を valid unknown として読む。

X. Other (please specify)

[Answer]: E

### Q3. U001 との contract

U002 は U001 とどう連携しますか。

A. U001 の内部実装へ直接 import して audit writer を共有する。

B. U002 独自の audit writer を作る。

C. U002 から Verification Traceability を直接呼ぶ。

D. shared mutable module state に outcome を置く。

E. 推奨: U001 の Shared Contracts と Error Audit adapter contract だけを使い、outcome evidence は file-backed audit に append-only で残す。

X. Other (please specify)

[Answer]: E

### Q4. Doctor での subagent status 表示

doctor は subagent status をどう表示しますか。

A. success だけを表示し、failure は error として扱う。

B. failure だけを表示し、success と unknown は非表示にする。

C. unknown を failure と同じ重大度にする。

D. audit だけに残し、doctor では扱わない。

E. 推奨: success、failure、unknown を区別し、unknown は推測不能な evidence gap として concise warning または informational finding にする。

X. Other (please specify)

[Answer]: E

### Q5. 検証 fixture の範囲

U002 の deterministic verification は何を含めますか。

A. success fixture だけを含める。

B. failure fixture だけを含める。

C. missing status fixture だけを含める。

D. old row compatibility は後続に回す。

E. 推奨: success、failure、missing status、old audit row、new audit row の fixture matrix を含め、stdout JSON と typecheck に影響しないことを確認する。

X. Other (please specify)

[Answer]: E
