# Security Design — phase2-live-e2e-evidence

## 適用範囲と信頼境界

この Unit は executable transport を持たず、各 live E2E adapter が生成した canonical receipt と capability registry から、Phase 2 の検証証拠と matrix を決定的に投影する spec boundary である。NFR Requirements と tech-stack-decisions は active scope で意図的に SKIP され、Functional Design の business-logic-model も本 Unit の declared input には存在しないため、その内容を推測・再作成しない。

新しい AWS resource、network service、credential store、database は追加しない。保護対象は receipt の provenance、registry の正準性、follow-up Issue link、green SHA、projected Markdown の完全性である。

## Security controls

| Boundary | Accepted input | Rejected input | Control |
|---|---|---|---|
| Registry → evidence evaluator | 宣言済み adapter ID、status、follow-up link | unknown/duplicate adapter、自由文 status | closed vocabulary と一意ID検査 |
| Ledger → receipt parser | schema-valid one-line JSON、canonical outcome、provenance | malformed row、cleanup未完了を示す receipt、raw transport transcript | parse-don't-validate、fail-closed |
| Receipt → support ruling | adapter自身のcontract/integration/live evidence | 他transport receipt、measured-only、missing green SHA | adapter ID と evidence set の一致検査 |
| Follow-up → registry | qualified GitHub Issue URL と再開条件 | dangling/非GitHub link、secretを含む本文参照 | URL owner/repo/issue shape とstatus整合検査 |
| Evidence model → Markdown | canonical sorted model | 手編集済み status、時刻依存順序、ambient filesystem discovery | marker fence 内を決定的全置換 |
| Local data → durable docs | bounded diagnostic digest、outcome、SHA、Issue link | prompt、response、credential、source auth/config path | allowlist projection とsecret pattern rejection |

## Receipt admission and provenance

evidence evaluator は receipt を読み込む際に schema version、adapter ID、run/attempt identity、canonical outcome、cleanup-closed 証明、tested commit SHA を検査する。cleanup failure、identity不一致、unknown outcome、欠損 provenance は supported/green の根拠に使わず、projector を fail-closed error にする。

`supported` は対象 adapter 自身について、adapter contract、integration、明示 opt-in local live の全 green と最新の検証対象 SHA が一致する場合だけ許可する。TUI receipt を ACP/Kimi へ流用すること、Issue が存在するだけで supported とみなすこと、measured-only evidence を green に昇格することを禁止する。

## Follow-up and public evidence safety

direct 接続が構造的に不成立の transport は、sanitized blocker、推奨 seam、再開条件、検証可能 acceptance criteria を持つ qualified follow-up Issue へ結び付ける。registry status と follow-up link は対で検査し、未接続なのに link がない、supported なのに未解決 blocker を持つ、別 adapter の Issue を参照する状態を拒否する。

Issue や matrix へ出す情報は adapter ID、bounded failure category、再開条件、検証コマンド種別に限定する。credential、source path、raw prompt/response、JSON-RPC frame、pane capture、local username/worktree path は公開面へ出さない。

## Deterministic projection and integrity

- registry と receipt は adapter ID の正準順へ sort し、同一入力からbyte-identicalなmatrixを生成する。
- projector は marker fence 外を変更せず、fence の欠損・重複・入れ子を拒否する。
- green SHA は receipt の tested revision からだけ取得し、現在の ambient HEAD や時刻で補完しない。
- duplicate receipt は identity key と内容 digest で検出し、競合する同一identityをfail-closedにする。
- projection は一時ファイルへ生成・検証後にatomic replaceし、途中書き込みを正規成果物にしない。
- check mode は生成期待値とtracked projectionを比較し、差分があれば非0で終了する。自動的に古い状態を正しいとみなさない。

## Failure handling and verification

| Failure | Projection |
|---|---|
| malformed/unknown receipt | projector failure、supported更新なし |
| cleanup-closed proof欠損 | receipt不採用、green禁止 |
| adapter/receipt mismatch | provenance failure |
| missing qualified follow-up | registry integrity failure |
| marker fence不正 | write拒否、既存doc保持 |
| atomic replace失敗 | write failure、部分projectionなし |
| deterministic check差分 | CI/local check failure |

必須テストは、unknown/duplicate adapter、malformed receipt、cleanup failure receipt拒否、cross-transport receipt流用拒否、green SHA mismatch、follow-up link/status不整合、secret/path漏洩pattern、marker欠損/重複、入力順を変えたbyte-identical生成、atomic write failure、check mode差分を含む。外部CLIやcredentialを使わない純粋 fixture で検証し、live transport の再実行を evidence projector の前提にしない。
