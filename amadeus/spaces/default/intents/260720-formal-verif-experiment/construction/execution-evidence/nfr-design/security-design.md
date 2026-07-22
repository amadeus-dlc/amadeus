# Security Design — execution-evidence

## 上流と保護対象

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。保護対象は frozen executable/input identities、command receipt、raw evidence、bundle/ledger integrity、blind arm isolation である。

## ExecutionPolicy

`ExecutionPolicy.validate(request)` は spawn 前に次を一括検査し、検証済み `AuthorizedProcessRequest` だけを生成する。

1. Bun/Java executable の realpath、version、content hash が frozen allowlist と一致する。
2. cwd と input/output path が repository-relative canonical path で、absolute、`..`、symlink escape を含まない。
3. argv は string array のままで、shell、glob、command substitution を介さない。
4. environment key は explicit allowlist 内であり、credential、home、無関係な CI secret を含まない。
5. arm、subject、freeze、baseline、input-set identity が実行契約と一致する。
6. executable、cwd、inputs を content-addressed read-only execution snapshot に materialize し、snapshot directory sync 後の再読 hash が frozen identity と一致する。snapshot を作れない platform capability は fail closed とする。

`AuthorizedProcessRequest` は元 path ではなく、検証済み snapshot root と snapshot-relative argv/path だけを保持する。`ProcessPort` はこの型だけを受け取り、spawn 直前に snapshot seal と read-only metadata を再確認し、同じ snapshot identity を process receipt に記録する。実行中の書込み対象は snapshot 外の専用 output directory に限定する。これにより検証後から child open/exec までに元 executable、input、symlink が差し替わっても実行対象は変わらない。receipt は executable identity と allowlisted environment key 名を記録するが secret value を保存しない。

## Evidence integrity

`BundleVerifier` は5 payload role、各 hash/length、manifest domain separation、bundle ID、envelope hashを再計算する。`LedgerVerifier` は runner/store の sequence、previous head、transaction cross-reference を両方検証する。orphan、片 ledger、unknown role、same identity/different bytes、handwritten JSON は成功 evidence に昇格しない。

stdout/stderr は opaque bytes のまま保存し、terminal 表示 adapter だけが制御文字を escape する。metadata serializer は sealed fixture content、別 arm private path、credential field を schema 上持たない。SHA-256 は authentication ではなく改変検知用 identity として扱う。

## 検証

red fixtures は shell metacharacter argv、PATH shadowing、executable drift、検証後の元 path/symlink 差替え、snapshot seal 差替え、path escape、environment leakage、payload/envelope 改竄、ledger fork、orphan、same-ID/different-bytesを含む。合否は未承認 spawn=0、snapshot identity drift spawn=0、secret value receipt=0、network client/runtime dependency 追加=0、改竄 evidence 採用=0である。
