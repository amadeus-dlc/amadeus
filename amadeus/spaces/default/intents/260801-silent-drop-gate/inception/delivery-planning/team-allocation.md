# Team Allocation — no-silent-drop

## 上流入力と割当原則

本割当は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`、承認済み `delivery-planning-questions.md` を入力とする。Team Formation は scope 上 SKIP であり、人間team／mobは定義されていないため、全 Bolt の実装責任者を `amadeus-developer-agent` とする。設計・品質・セキュリティの各stage personaはstage責務として支援し、Unit ownershipを共有しない。

各 Bolt は隔離 worktree、短命branch、独立した [Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)／スカッシュコミットを持つ。工程記録はcheckpoint commitで本線へ流し、実装変更へ混在させない。

## Bolt-to-agent allocation

| Batch | Bolt | Unit | Owner | 支援視点 | Review／gate |
|---|---|---|---|---|---|
| 1 | Bolt 1 | `static-gate-engine` | `amadeus-developer-agent` | architect、quality、devsecops | walking-skeleton gate |
| 2 | Bolt 2 | `mirror-persistence-propagation` | `amadeus-developer-agent` | architect、quality | parallel batch gate／stage gate |
| 2 | Bolt 3 | `text-mutation-loud-failure` | `amadeus-developer-agent` | architect、quality | parallel batch gate／stage gate |
| 3 | Bolt 4 | `repository-adoption` | `amadeus-developer-agent` | architect、quality、devsecops | final stage gate |

## Ownership API

| Unit | 書込みowner | 他Unitから許可する利用 | 禁止する共有 |
|---|---|---|---|
| U1 | gate source／schema／fixture、`package.json`、`bun.lock`、root script | U4がpublic CLI／schema／scriptを消費 | U4によるdetector／package編集 |
| U2 | canonical text mutation helper／callers／focused tests | U4が修正後source／test evidenceを消費 | U1／U3によるruntime編集 |
| U3 | canonical mirror executor／state store／focused tests | U4が修正後source／outbox evidenceを消費 | U1／U2によるmirror編集 |
| U4 | canonical ledger値、evidence値、CI workflow、generated projection | U1 CLIへclassification／approval／base SHAを入力 | U1〜U3 algorithmの再実装 |

## Parallel batch coordination

Batch 2 の2 worktreeは同じ `main` base revisionから分岐し、割当Unit外のgit状態を変更しない。Bolt 2はmirror source、Bolt 3はtext mutation sourceだけを所有するため、source conflictを想定しない。工程記録や監査shardの統合時は既存のappend-only／dedupe規律に従う。

Batch 2 の片方だけが失敗した場合、成功側の成果とworktreeを保持し、失敗Unitだけをretry／skip／abort判断へ送る。U4は2者とも合格し、U1も着地するまで開始しない。

## Escalation と handoff

- requirement、baseline／exemption基準、15秒、FP≤5%、fail-closedを変える必要が出た場合は仕様変更として人間へエスカレーションする。
- [Pull Request](https://github.com/amadeus-dlc/amadeus/pulls) のマージはno-AI-mergeに従い人間承認を要する。
- 各Boltのhandoffはrevision、検証command、実測値、残余riskを含む。
- external team hand-off、credential owner、運用当番は存在しない。
