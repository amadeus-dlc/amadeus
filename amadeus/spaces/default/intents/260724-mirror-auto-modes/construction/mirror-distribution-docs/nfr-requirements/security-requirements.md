# Security Requirements — mirror-distribution-docs

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Supply-chain Boundary

core source、manifest、generator、docs sourceをtrusted repository input、generated dist／self-installとtemporary outputをderived artifactとして扱う。generated artifactを手編集した変更は正本として受理しない。

## Security Requirements

| ID | Requirement | Verification |
|---|---|---|
| SEC-DD-01 | tool／skill payloadはcore raw bytesのSHA-256と全surfaceで一致 | byte mutation test |
| SEC-DD-02 | payload digestではUnicode／newline正規化を行わない | CRLF／NFC fixture |
| SEC-DD-03 | manifestにないpathをgeneratorがcopyしない | extra file negative test |
| SEC-DD-04 | output pathをmanifest root内へcanonicalizeし、`..`／absolute／symlink escapeを拒否 | traversal fixtures |
| SEC-DD-05 | 6 dist面と4 self-install面の公開生成物全体へtoken、credential、absolute user pathを生成しない | public projection secret scan |
| SEC-DD-06 | check／docs parserはshell文字列を作らずargument array／in-process APIを使う | command-shape test |

## Documentation Integrity

- `amadeus-topic`／`amadeus-contract` markerの重複、unknown topic／key、missing localeをfailする。
- canonical JSON stringのcase、hyphen、space、array orderを変更しない。
- modes、compatibility、failure／retry、close guards、scope exclusionsをruntime contractと直接比較する。
- Markdown proseをcommandとして実行せずdataとしてparseする。

## Compliance

生成物は公開repository向けcode／docsであり新しいPII／PHI／cardholder dataを処理しない。scanner対象はmanifestから導出した6 dist面と4 self-install面のtool payload、skill、registration／wrapper、およびGuide／Reference日英4文書の全pathである。`bun scripts/scan-public-projections.ts --manifest <projection-manifest> --fixture test/fixtures/public-projection-secret-sentinels.json`を固定入口とし、repository credential policy、絶対user path pattern、fixtureのdummy tokenを検査する。許容除外はfixture内の明示的なdummy値とその期待pathだけで、path globや環境変数による除外を認めない。credential scannerは既存repository policyを再利用し、規制適合を主張しない。

## Acceptance

1. traversal／symlink fixtureでworkspace外write 0件。
2. tool、skill、registration／wrapper、docsの各artifact種別へsecret sentinelを1件ずつ注入し、対象10面を列挙するscanが各checkをfailさせる。
3. Kiro／Kiro IDEのself-install対象外をmissing security artifactとして誤判定しない。
