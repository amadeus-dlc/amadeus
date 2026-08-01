# Team Allocation — otel-meta-schema

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md — Bolt 列は unit-of-work-dependency.md の YAML DAG(機械正)から、各 Bolt の中身と規模は unit-of-work.md の按分から、walking skeleton の位置づけは requirements.md FR-RES-3 と story-map の段1から、ゲート要件は components.md の pin 連動(U4)から導出した。

## 体制(solo mode)

- conductor: 本セッション(ゲート執行・選挙管理・レビュー dispatch・PR 管理)
- builder: Bolt ごとに worktree 分離の subagent を dispatch(並行上限は batch 2 の3本)
- reviewer: §12a 宣言に従う(FD/NFR 系 = architecture-reviewer ほか)+PR レビューは CI+Bugbot+conductor 検分

Construction Autonomy Mode は **gated**(batch 末尾ゲート)を既定とし、Bolt 1 は walking-skeleton gate で単独承認(常任グラントの除外対象 — Forbidden 準拠で都度ユーザー確認)。

## レビュー能力の確保

自己実装の自己レビュー禁止(role-model)に従い、§12a reviewer と builder は常に別 subagent。PR 面は Bugbot+conductor の独立検分を重ねる。
