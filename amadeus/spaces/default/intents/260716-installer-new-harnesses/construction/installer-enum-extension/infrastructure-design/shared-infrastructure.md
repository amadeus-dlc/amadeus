# Shared Infrastructure — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../nfr-design/performance-design.md`、`../nfr-design/security-design.md`、`../nfr-design/scalability-design.md`、`../nfr-design/reliability-design.md`、`../nfr-design/logical-components.md`、`../../../inception/application-design/components.md`、`../../../inception/application-design/services.md`、`../functional-design/business-logic-model.md`。

## 共有面(単一 unit — unit 間共有はなし、リポジトリ共有機構のみ)

| 共有機構 | 本 unit との関係 |
|---|---|
| dist 6ツリー+self-install 2ツリー(計8ミラー) | C6 変更の regen 対象(package.ts / promote:self)— 手編集禁止(project.md Forbidden) |
| tests/lib(fixture ビルダー・fakeHttp・test-size) | 再利用のみ — 変更なし(reuse inventory) |
| coverage 台帳(patch gate allowlist 等) | 共有台帳への追記が必要になった場合は shared-ledger-insert-collision 規律(挿入位置分散 / union→regen→再検証)に従う |
| scripts/package.ts・promote-self.ts | 呼び出すのみ — 本体へ非接触(promote-self.ts は FR-6 AC-6d の非接触対象) |

## unit 間共有

該当なし(単一 unit — Bolt 間の共有インフラ調整が発生しない)。
