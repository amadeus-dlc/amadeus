# Unit Coverage Map — archived intent lifecycle

上流入力: `components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`。User Stories stageはスキップ済みであり、未生成のstoriesを捏造せずFR/NFRを直接mappingする。

## Requirement mapping

| Requirement | status-registry | lifecycle-transaction | guard-integration |
|---|---:|---:|---:|
| FR-01 status語彙 | primary | consume | consume |
| FR-02 単一契約 | primary | consume | consume |
| FR-03 archive | support | primary | expose |
| FR-04 unarchive | support | primary | expose |
| FR-05 selector拒否 | support | support | primary |
| FR-06 next拒否 | support | support | primary |
| FR-07 unpark拒否 | support | support | primary |
| FR-08 legacy移行 | primary | verify | regression |
| NFR-01 原子性 | support | primary | recovery-entry verification |
| NFR-02 診断 | support | primary | primary |
| NFR-03 テスト容易性 | primary | primary | primary |
| NFR-04 配布整合性 | support | support | primary |

## Coverage verification

- すべてのFR/NFRにprimary ownerが1つ以上ある。
- すべてのUnitが少なくとも1つのprimary requirementを持つ。
- 横断contractはTypeScript exports、typed error、CLI exit/stdout、audit payload、journal schemaで検証する。
- story implementation orderは存在しない。Unit内の詳細なtest case順序はFunctional Design / Build and Testで定義する。
