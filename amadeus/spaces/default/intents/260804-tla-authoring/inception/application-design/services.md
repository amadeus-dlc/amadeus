# Application Design: サービス設計

本 intent はデプロイされる常駐 service を持たない（`inception/requirements-analysis/requirements.md` §8 対象外、`application-design-questions.md` 冒頭の制約）。本書での「サービス」は、CLI ツール群と stage 実行が構成する**実行時の協調単位**を指す。AWS サービス・DB・Web/TUI は導入しない（aws-platform 観点のレビュー結論: 追加クラウド資源なし。既存の TLC child-process 境界と GitHub Actions CI のみを使う）。上流は requirements.md、`codekb/amadeus/architecture.md`、`codekb/amadeus/component-inventory.md`、Q1〜Q4 回答である。

## サービス一覧と責務

| サービス | 実体 | 責務 | ライフサイクル |
|---|---|---|---|
| S1: Applicability Service | `tla-authoring.ts applicability`（C1+C2） | Requirements Analysis から呼ばれ、適用判定 receipt を永続化 | 呼出しごとの短命 CLI プロセス |
| S2: Authoring Orchestration | authoring stage（C7）を実行する conductor | author/revise 作業、referee 呼出し、独立レビュー、人間ゲートの進行 | stage 実行の間 |
| S3: Evidence & Registration Service | `tla-authoring.ts bundle/commit`（C4+C6） | 検証済み bundle の確定と model-map atomic replace | 呼出しごとの短命 CLI プロセス |
| S4: Proof Referee | C5 + 既存 TLC toolchain | proof 完了条件の評価（TLC は child process） | TLC 実行の間（既存契約） |
| S5: Projection Guard | `scripts/plugin-projection.ts` + C8 | ビルド時の import closure 検査 | `bun run build` の間 |
| S6: Executor（既存・無変更） | `run-model-check.ts` ほか plugin tools | 登録済みモデルの決定論的 TLC 実行と verdict 正規化 | 既存契約のまま |
| S7: Authoring Hold Checkpoint | C9（`tla-authoring.ts hold`）+ 既存 engine advisory checkpoint（§11a） | requirements-analysis / functional-design / build-and-test の 3 checkpoint で hold を fail-closed 強制。解除は C9 の no-hold verdict のみ | checkpoint 発火ごとの短命 CLI プロセス（engine 側機構は既存のまま） |

## オーケストレーションパターン

**orchestration（指揮者主導）を採用し、choreography（イベント駆動の自律連鎖）は採用しない。**

- 進行の所有者は S2（conductor が実行する authoring stage）ただ一つとする。S1/S3/S4/S7 は決定論的 referee であり、自律的に次工程を起動しない。これは Amadeus 本体の「engine が routing を所有し、tool は判定だけを返す」既存アーキテクチャ（`codekb/amadeus/architecture.md`）と相似形であり、`memory/project.md` の「調査系サブエージェントはループの制御を持たず、状態遷移は conductor のみが行う」規律とも一致する。
- 進行を「止める」権限だけは例外的に engine 側にある: S7 の hold checkpoint は既存 advisory checkpoint 機構（fail-closed、人間相関必須）として engine が強制し、S2 も conductor もこれを迂回できない（FR-003 / FR-007 の hold 強制。decisions.md ADR-6）。
- 人間ゲート（FR-009）は S2 の進行内の明示 stop であり、いかなる receipt も人間承認の代替にならない（`memory/project.md` cid:approval-handoff:c2-grant-gates-only: standing grant はゲート承認のみで内容裁定に使えない）。

## 通信契約

| 経路 | 形式 | 契約 |
|---|---|---|
| conductor → 各 CLI | プロセス起動（argv） | JSON 1 行 stdout、exit 0/1/2。失敗は typed failure の全数列挙 |
| CLI 間のデータ受け渡し | ファイル（record dir / evidence store / model-map） | 中間状態は一時領域、可視化は atomic rename のみ（Q3） |
| S4 → TLC | child process（既存 `tlc-toolchain.ts` 契約） | 無変更で再利用（FR-013、NFR-004） |
| S5 → ビルド | `bun run build` 内の直列検査 | closure failure で build 全体を fail-closed（NFR-005） |

非同期メッセージング・キュー・イベントバスは導入しない。全経路が同期・決定論的であり、NFR-001（再現性）を通信設計で担保する。

## 整合性と可視化点

FR-010 の「部分更新を complete として観測させない」は次の 2 層で成立させる。

1. **evidence bundle 層（S3 前半）**: bundle は content-addressed であり、構成 receipt が揃って digest が確定するまで最終位置に現れない。
2. **model-map 層（S3 後半）**: 登録の可視化点は `model-map.json` の atomic replace（temp + rename）ただ一つ。rename 前の失敗は「未登録」を維持し、rename 後は「検証済み bundle を参照する完全な登録」だけが観測される。

読み手（既存 completeness sensor、S6 executor、監査者）は model-map → bundle の参照を辿ることで、登録時点の全 evidence を復元できる（NFR-002 監査性）。

## スケーリングと運用特性

- すべて開発者マシンと CI 上の短命プロセスであり、水平スケール・可用性設計は不要（要件外）。
- 同時実行の衝突面は `model-map.json` と evidence store の 2 面で、性質が異なる。**evidence store** は content-addressed のため同一内容の並行書込は同一パスに収束し、異内容は別パスに置かれる — lost update は構造的に起きない。**model-map.json** は read-modify-write のため atomic rename だけでは後勝ち lost update が可能であり、C6 が rename 直前の再読込 + 差分検査（`concurrent-modification` の typed failure、component-methods.md § C6）で拒否する。PR ベースの直列マージは第二の防衛線。
- セキュリティ面: 新規ネットワーク経路・秘密情報は増えない。evidence の完全性は content addressing で担保し、改竄は digest 不一致として検出される（NFR-003、`memory/phases/inception.md` のセキュリティ影響記載要求に対する回答）。

## 上流トレーサビリティ

- `inception/requirements-analysis/requirements.md`（FR-009、FR-010、FR-013、NFR-001〜NFR-005）
- `inception/application-design/application-design-questions.md`（Q1、Q3）
- `codekb/amadeus/architecture.md`（engine/tool 責務分離の既存パターン）、`codekb/amadeus/component-inventory.md`（既存 executor / sensor の再利用境界）
- team-practices: `memory/team.md`、`memory/project.md`（conductor 所有の進行規律、grant の限界）、`memory/phases/inception.md`
