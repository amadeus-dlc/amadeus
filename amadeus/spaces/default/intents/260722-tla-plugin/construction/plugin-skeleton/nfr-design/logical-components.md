# Logical Components — U2 plugin-skeleton

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Components

| Component | Responsibility |
|---|---|
| plugin composer | trust grant、journal apply/drop |
| safe stage walker | boundary検証とfd read |
| graph merger | slug indexとschema validation |
| graph publisher | atomic graph publish |
| formal stage | U3 CLIをsingle実行 |

## Isolation

- 依存方向はplugin composer → filesystem tree、graph compiler → safe stage walker → graph merger → graph publisher、formal stage → U3 CLIとする。composerとcompiler間の直接呼出し、逆依存を禁止する。
- composerはjournal/trust digest/workspace lock、walkerはopen fd、mergerはin-memory slug index、publisherはstage graphを所有する。lockとfilesystem treeだけが共有資源である。

## Failure domains and blast radius

- compose/drop失敗はjournalで当該pluginへ封じ、既存graphを変更しない。walker/merge失敗は新graph publishを止め、直前graphを保持する。
- slug collisionは衝突したcompile全体を失敗させるが、plugin fileやcore stageを変更しない。formal stageの失敗はsingle runだけへ封じる。
- pluginはstock scopeへ自動加入せず、明示single実行だけを許可することで通常workflowへのblast radiusを遮断する。
