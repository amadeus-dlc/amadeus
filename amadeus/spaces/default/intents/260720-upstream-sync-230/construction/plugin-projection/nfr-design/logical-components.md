# Logical Components — plugin-projection

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Component inventory

| Component | Responsibility | Boundary |
|---|---|---|
| Source Discoverer | repository rootの`plugins/<name>/`をcanonical列挙 | sourceはread-only、generated treeを読まない |
| C1 Contract Validator | identity、manifest、relative pathを全件検証 | 第二schema/parserを持たない |
| Plugin Projector | 1 pluginを既存`HarnessManifest`へ投影 | `buildPluginProjection`の既決seam |
| Harness Tree Builder | coreとplugin入力から6面のtemp treeを構成 | 全面成功までcommitしない |
| Ownership/Collision Guard | expected pathとownerを比較 | collision時write 0 |
| Drift Checker | expected/committed/read-setを全件比較 | closed 4分類、check write 0 |
| Self-install Adapter | generated distをclosed 4面へ渡す | C5内部helper、kiro系拒否 |
| Generated Tree Committer | generator ownership内を置換 | source・ownership外path非変更 |

## Seamとデータフロー

Source Discovererが返す`PluginSource`をC1 Contract Validatorで全件検証し、Plugin ProjectorとHarness Tree Builderへ同一snapshotとして渡す。Builderは6 harnessのtemp treeとexpected ownership/read-setを生成し、Ownership/Collision Guardが全件成功を確認した後だけGenerated Tree Committerが反映する。Self-install Adapterは成功したgenerated distからclosed 4面だけを既存promoterへ渡す。

Drift Checkerは同じ期待treeとcommitted treeを比較するread-only consumerである。`discoverPluginSources`、`buildPluginProjection`、`buildHarnessTree`、`checkHarnessTree`だけをpublic seamとし、内部componentを新APIとして露出しない。

## Failure domainとblast radius

- discovery/validation failure: projectionを開始せず、dist/self-install全体を不変に保つ。
- single plugin/harness projection failure: temp root内へ封じ、committed 6面へ影響させない。
- collision: ownership確定前に全体を拒否し、成功面だけをcommitしない。
- drift: check modeは診断だけを返し、sourceとgenerated treeの双方を変更しない。
- self-install対象外: kiro/kiro-ideだけを明示拒否し、package 6面の正当な生成とは分離する。

shared resourceはrepository source snapshot、既存`HarnessManifest`、temp root、generator ownership mapである。daemon、network、database、queue、cache、credential store、runtime serviceは存在しない。

## NFR mapping

`performance-requirements.md`の有界batchはDiscoverer・Validator・Builder、`security-requirements.md`のtrust/ownershipはValidator・Collision Guard・Committer、`scalability-requirements.md`の6×4 matrixはBuilder・Self-install Adapter、`reliability-requirements.md`のdeterminism/driftはBuilder・Drift Checker、`tech-stack-decisions.md`の既存stackは全component、`business-logic-model.md`の4 public seamとpipelineはcomponent間接続へ反映する。
