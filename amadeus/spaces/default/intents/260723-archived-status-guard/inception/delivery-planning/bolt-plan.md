# Bolt Plan — archived intent lifecycle

上流入力は `requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices`。`stories` と `mockups` はスコープによりSKIPされており、存在しない内容は補完しない。3 Boltは同一framework releaseへ統合するが、ConstructionはBolt単位のPRと承認境界を持つ。

## Bolt 1: status-registry

- Unit: `status-registry`
- Walking Skeleton: いいえ。依存元のないregistry契約をdependency-complete sliceとして着地させる。
- Definition of Done: 4値`IntentStatus`、runtime validator、限定transition capability、migration専用raw decoderを実装し、`260713-swarm-driver-migration`だけを`closed`から`archived`へ移行する。全registryが4値に適合し、他row bytes不変、正本・dist・self-install drift 0。
- Confidence hypothesis: status契約を一元化しても既存lifecycleを壊さず、legacy `closed`を一件だけ安全に排除できる。
- Expected demo: 4つの有効値の受理、不正値のloud拒否、対象一件だけのmigrationと再実行no-op。
- Go/no-go: validator迂回書込み、対象外row変更、配布driftのいずれかがあればBolt 2へ進まない。

## Bolt 2: lifecycle-transaction

- Unit: `lifecycle-transaction`
- Walking Skeleton: いいえ。Bolt 1のstrict status contractを消費する。
- Definition of Done: archive/unarchive、opaque locked capability、journal recovery、idempotent lifecycle audit、protected verb横断HUMAN_TURN消費を実装する。7 failure injection境界でbytes、同一operationId、監査一件性、reader前recoveryを検証する。
- Confidence hypothesis: audit・registry・cursorの複数ファイル更新を、公開CLIから中間不整合を観測させず同じoperationIdで収束できる。
- Expected demo: audit commit後とregistry write後の障害を注入し、再実行で監査を重複させず成功状態へ回復する。
- Go/no-go: human-presence迂回、operationId差替え、重複監査、公開readerからの中間状態観測があればBolt 3へ進まない。

## Bolt 3: guard-integration

- Unit: `guard-integration`
- Walking Skeleton: いいえ。Bolt 1・2のcontractを消費して利用者経路を閉じる。
- Definition of Done: selector、stale cursorからの`next`、`unpark`でarchived intentを拒否し、utilityからstate verbへ安全に委譲する。typed diagnostics、corpus caller coverage、正本・dist・self-install同期を検証する。
- Confidence hypothesis: archived intentへ通常操作で再侵入する全公開経路を、force overrideなしで機構的に閉じられる。
- Expected demo: selector・`next`・`unpark`の3拒否経路、bytes不変、human-presence付きunarchive後の通常選択。
- Go/no-go: stage進行・cursor設定・park marker削除の副作用、迂回caller、配布driftがあればreleaseを止める。

## Execution contract

順序は `Bolt 1 → Bolt 2 → Bolt 3` の厳密な直列とする。各BoltはConstruction 3.1–3.7を一度通り、独立PRでreview・squash mergeする。後続Boltは先行Boltのcontractと検証証跡を消費し、未承認の先行Boltを仮定して開始しない。
