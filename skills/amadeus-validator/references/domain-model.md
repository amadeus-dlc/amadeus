# Validator Domain Model

## 目的

Validator Domain Model は、Amadeus Validator の検証構造と、型で守る最小のドメインモデルを説明する。

旧契約（schemaVersion 1）向けの Typed Document 群（UnitIndex、BusinessRules ほか）と evidence policy は #381 で退役した。

## 基本構造

検証の流れは次である。

```text
aidlc/ 配下の成果物
  -> AmadeusValidator（workspace 検査、Intent 検査の入口、検査台帳）
  -> lifecycle-v2（aidlc-state.md と audit イベントの Intent 状態契約）
  -> Report Formatter（検査カテゴリ別の pass / fail / blocked）
```

`AmadeusValidator` は、Space（`memory/`、`knowledge/`）、`intents.json` の registry 整合、Domain Map、Context Map、Event Storming、Grilling Decision Trail を検査する。
`intents.md`（共有インデックス）と Intent のモジュールファイル（`<dirName>.md`）は GD009 で廃止された成果物であり、存在する場合だけ検査する。

`lifecycle-v2` は、`aidlc-state.md` の scope、depth、Stage Progress、Phase Progress、Current Status と、`audit/audit.md` のイベント（`WORKFLOW_STARTED`、`STAGE_COMPLETED`、`PHASE_VERIFIED`、`PHASE_SKIPPED`、`BOLT_COMPLETED`、`WORKFLOW_COMPLETED`）、completed ステージの必須成果物を検査する。
契約は `docs/amadeus/lifecycle/state.md` と `scopes.md` に従い、scope とステージの対応表は `skills/amadeus/references/stage-catalog.md` と一致させる。

## Domain Modules

`domain/` には、型で守る最小のドメインモデルだけを置く。

- `ArtifactPath`：成果物ルート内に収まる相対 path。絶対 path とルート外への脱出を拒否する。
- `artifact-links`：Markdown リンクの正規化（anchor とタイトルの除去）と、成果物ルート内での解決を扱う。

リンク解決は `resolveArtifactLinkTarget` が行い、外部 URL とルート外への解決を拒否する。
