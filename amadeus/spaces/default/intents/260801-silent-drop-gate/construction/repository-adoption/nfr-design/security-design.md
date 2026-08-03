# Security Design — repository-adoption

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。trusted base、immutable evidence chain、human approval、canonical ledger promotion、read-only fork CIを主な信頼境界とする。

## Trusted base authority

`BaseRevisionResolver` はevent kindを閉集合でparseし、pull requestではbase SHA、pushではbefore SHAだけを選ぶ。値は正規化せず40 hex、nonzeroを検証し、short SHA、symbolic ref、HEAD、merge-base fallbackを拒否する。

`BaseObjectMaterializer` は `git cat-file -e <sha>^{commit}` をshellなしliteral argvで実行する。欠落時だけ `git fetch --no-tags --depth=1 origin <sha>` を一回行い、同じobject確認を再実行する。fork headや別remoteを使わず、`contents: read`、secret 0、write permission 0を維持する。

## Evidence provenance

raw、classification、approval receipt、approved evidence、baseline candidate、bootstrap provenanceを別のimmutable artifactにする。各段はschema version、pre／post full revision、前段exact bytes digest、identity集合digestを検証し、不足／余剰／重複／1 byte改変を拒否する。

human approvalはU1の `ApprovalAuditAuthority`／`ApprovalAuditVerifier` を再利用し、caller指定audit manifestを許さない。active intent state、固定audit root、event bytes digest、raw／classification digest、reviewer、承認時刻をapproved evidenceへ結合する。別census／別intentへのreceipt再利用を拒否する。

## Ledger権限

evidence command、CI workflow、gateにcanonical baseline／exemptionのwrite capabilityを与えない。`baseline-candidate` はFP=0、`B0 ⊂ B_pre`、approved issue identityだけのremoved、added 0を満たすnew-output-only candidateとprovenanceだけを生成する。canonical昇格は人間review済みrepository changeに限定する。

通常checkはbase Git objectのexact ledger bytesをprevious setとする。初回base ledger欠落時だけU1 bootstrap validatorがledger外provenanceを検証し、二回目以降はfallbackを禁止する。baselineとexemptionを同一変更で増やしてもtrusted-base subset検査から逃れられない。

## CI process防御

- workflowはliteral full SHAだけをargvへ渡し、finding／source／event文字列をshell codeへ連結しない。
- `continue-on-error`、`|| true`、warning-only、stderr文字列判定、stdout schema再実装を禁止する。
- Bun 1.3.13、`@ast-grep/cli` 0.45.0、`package.json`、`bun.lock`をfrozen installで固定し、`bunx`／latest downloadを使わない。
- command recordはargv、cwd、revision、environment contract、exit、stdout／stderr digestを持つが、token、authorization header、runner secret、一時pathを保存しない。
- networkは欠落base objectを同一originからfull SHAでfetchする場合だけ許可し、remote analysis／artifact uploadを追加しない。

## Distribution integrity

canonical sourceだけを編集し、`bun scripts/package.ts` でdist全projectionを生成した後、`bun run promote:self`（`promote-self.ts --apply`）でself-hosted rootへ投影する。次に `bun scripts/package.ts --check` と `bun run promote:self:check` を実行する。generated treeの直接編集を禁止し、package／promotion apply／checkの各digestをacceptance reportへ結合する。一部harnessだけの手動同期を成功扱いしない。

## Security verification

- PR base、fork PR base、push before、short／zero／nonhex／unresolvable SHA、fetch failureを検証する。
- evidence chain各段、approval event、candidate、bootstrapの1 byte改変とreceipt流用を拒否する。
- baseline／exemption同時growth、同数replacement、stale exemptionをtrusted base比較で拒否する。
- workflow argvへのshell metacharacter注入、secret／write permissionなしのfork fixtureを検査する。
- direct generated editをdrift guardで検出する。

HTTP、database、cloud IAM、credential発行、remote artifact storeは本Unitに追加しないため非適用である。
