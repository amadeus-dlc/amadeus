# Security Requirements — guard-integration

`business-logic-model` の preflight/strict status 境界と `business-rules` の fail-closed 規則を、`requirements` の FR-05〜FR-07・NFR-04、および `technology-stack` のローカル filesystem CLI に適用する。

## Trust boundaries

- registry、active cursor、state、park marker、audit、transaction journal は信頼済み入力ではない。workspace lock 取得後、journal recovery を終えてから strict parser で読む。
- intent 名、record-dir、既存 selector、symlink、re-export・alias を含む source corpus は境界入力として扱い、解決不能・曖昧・未分類なら fail closed にする。
- utility が解決した dirName は権限証明ではない。state subprocess が新しい lock 内で対象存在、status、journal、human-presence を再検証する。

## Rejection data

- archived rejection は resolved dirName、固定語彙の status、operation、実行可能な `intent unarchive <resolved-dirName>` のみを公開する。
- journal 本文、任意ファイル内容、環境変数、credential、絶対 home path、未検証 selector を diagnostic に含めない。journal の位置が必要な fatal diagnostic では workspace-relative path のみを表示する。
- `intent-not-found` と `intent-archived` を別 variant とし、存在しない対象へ status を付与しない。公開 CLI の既存 stdout/stderr/exit code shape を維持する。

## Threat scenarios

- selector traversal・symlink escape: 解決時に canonical workspace/record boundary 外を拒否する。
- TOCTOU: utility 解決後の削除・差替え・status 変更は state 側の再観測を正とし、再試行や暗黙補正をしない。
- stale cursor: archived intent を指しても `next` は stage directive を生成せず、state/audit mutation 前に終了する。
- bypass: `--force`、implicit unarchive、read-only selection 等の迂回 option を追加しない。
- corpus gap: dynamic import、computed property、解決不能 alias、未分類 sink を検査失敗にする。

## Local attacker boundary

- 保証対象は repository CLI が workspace lock を保持して行う操作と、呼出し開始時に存在する filesystem topology である。
- 同一 OS user が check 後に symlink や directory entry を raw filesystem API で差し替える攻撃は workspace lock に従わず、完全な防止を保証しない。書込直前の canonical boundary 再確認で検知できる差替えは fail closed とするが、same-user raw write への isolation は OS 権限境界の責務とする。

## Compliance and verification

- 個人情報・認証情報を新規処理しないため、追加の外部 regulatory control は N/A。既存 repository access control と audit 保持を変更しない。
- 敵対 selector、symlink、対象消失、status 差替え、stale cursor、park marker 有無を試験し、拒否時の永続 bytes 不変を確認する。
