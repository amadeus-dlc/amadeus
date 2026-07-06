# ドメインエンティティ — unit: parallel-policy-docs

本 unit が扱う概念と関係を定義する。実装のデータ構造ではなく、文書化の判断単位を表す。

## エンティティ一覧

| エンティティ | 説明 | 主な属性 |
|---|---|---|
| Intent worktree | Intent ごとに分ける外側の隔離単位。並行運用ポリシーの並行単位 | 対応 Intent、branch、占有状態（通知・引き渡し） |
| Bolt worktree | Construction 内の実行隔離。エンジン（amadeus-bolt）が fork・merge を所有し、Intent worktree の内側に作られる | 対応 Bolt、fragment（state / audit）、attestation イベント |
| Attestation イベント | `WORKTREE_*` / `STATE_FORKED・MERGED` / `AUDIT_FORKED・MERGED`。エンジン内部の整合証跡 | emit 主体（エンジン）、gate evidence には含めない |
| Gate evidence | PR gate 運用で人間が検証する証拠。Bolt PR の merge と `BOLT_COMPLETED` | 検証者（人間）、記録先（audit / PR） |
| 接触面 | 並行可否の判断単位。ファイル接触に加え、意味的接触（挙動変更×文書化）と機械ローカル状態（cursor、hooks）を含む | 種別（ファイル / 意味 / 状態）、申し送りの要否 |
| 指示系統の委任 | Maintainer → 代理セッション → worker セッションの分配構造 | 委任範囲、相談経路（agmsg）、承認の帰属 |
| Disposition | Issue の後始末判断 | 対象 Issue、判定（実装済み / 文書化 / 未確定）、根拠、提案 |

## 関係

```
Intent worktree 1--* Bolt worktree（内側に fork される）
Bolt worktree --> Attestation イベント（エンジンが emit）
Bolt PR + BOLT_COMPLETED = Gate evidence（Attestation は含めない）
接触面 --> 並行可否判断（並行運用ポリシー）
指示系統の委任 --> 接触面判断の一元化（代理が持つ）
WF1〜WF3 の文書化 --> Disposition（#407 / #342 の close 提案）
```

## 不変条件

- Bolt worktree の fork・merge はエンジン所有であり、手動の worktree 操作と混ぜない。
- Attestation イベントを gate evidence に昇格させない（変更する場合は policy 改訂として明示的に行う）。
- 並行運用ポリシーの判断基準は、根拠表の実例と 1 対 1 以上で対応する。
