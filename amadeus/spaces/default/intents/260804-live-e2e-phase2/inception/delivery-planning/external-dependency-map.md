# External Dependency Map — live E2E Phase 2

## 入力と境界

外部依存は [requirements.md](../requirements-analysis/requirements.md)、[components.md](../application-design/components.md)、[unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md) と [bolt-plan.md](./bolt-plan.md) から抽出した。

新しいcloud service、DB、常駐process、Kiro IDE GUI/CDPは導入しない。外部依存はローカルCLI、既存認証・設定、model/provider到達性、follow-up時のGitHub Issue公開に限定する。

## Gated dependencies

| Dependency | Owner | Lead time | Blocks | Preflight / gate | Mitigation |
|---|---|---:|---|---|---|
| Kiro CLI ACP/TUI binaryとversion | Builder | 即時 | Bolt 1・2 direct | binary/version/capabilityを認証前に実測 | 不成立をsanitized evidence化しqualified follow-upへ |
| Kiro local auth/config | Human + Builder | 数分 | Bolt 1・2 local live | source pathを記録せず、存在・安全なbindingだけ確認 | secret複製禁止。安全にbind不可ならfollow-up |
| tmux local executable | Builder | 即時 | Bolt 1 direct | private socket/session作成とcleanup probe | direct不可ならTUI follow-up。ACP証拠へ代用しない |
| Kimi CLI binaryとversion | Builder | 即時 | Bolt 3 | `kimi` preflight | 不足時は環境修復後に再実行。Kiro証拠で代用しない |
| Kimi local credential/config | Human + Builder | 数分 | Bolt 3 local live | scratch `KIMI_CODE_HOME`と安全なbinding | secret値・source pathをledger/diagnosticへ残さない |
| Model/provider network availability | External provider | 不定 | 各local live | bounded timeoutとcanonical failure分類 | skip、timeout、実failureを分離し再実行可能にする |
| GitHub認証とIssue作成権限 | Human + Builder | 数分 | Kiro follow-up branch、Bolt 4 closure | `gh auth status`後、sanitized本文を人間確認 | 権限なしではfollow-up branchを完了扱いにしない |
| PR review/merge | Human | 不定 | 各次Boltの正式着地 | Bolt単位PR、review READY、明示merge承認 | 未mergeなら次の正本baseへ進めない |

## Data and approval windows

- 通常CIはlive processをhard denyするため、live receiptは人間が許可したlocal opt-in windowでだけ取得する。
- 認証情報そのものを成果物、test fixture、ledger、Issueへ保存しない。保存するのはadapter ID、version、SHA、canonical outcome、bounded diagnostic、Issue URLである。
- GitHub Issueが必要な場合、阻害要因、sanitized evidence、推奨seam、再開条件、検証可能ACを揃えた後に公開する。

## Dependency closure criteria

- direct branchは対象transport自身のcontract/integration/local live greenで閉じる。
- Kiro follow-up branchは対象transport自身のsanitized evidenceとqualified Issue URLがregistry/matrixへ結合されて閉じる。
- 一つのtransportのbinary、auth、green receiptを別transportの完了根拠へ流用しない。
- Bolt 4は3 transportの各dependency dispositionがdirectまたはfollow-up-linkedとして確定するまで開始しない。
