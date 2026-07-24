# Services — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, architecture.md, component-inventory.md, team-practices.md

## N/A(独立サービス)

本 intent は Amadeus 内部の同一プロセス内機能(intent birth 時の同期呼出)であり、独立したサービス(マイクロサービス・外部 API・非同期通信)を持たない。architecture.md の RE 実測どおり、Amadeus はローカル CLI/ファイル操作で完結し、requirements.md の NFR にも外部インフラ依存はない。

## サービス相当の内部呼出関係

| 呼出元 | 呼出先 | タイミング | 通信 |
|---|---|---|---|
| `handleIntentBirthStateBuild()`(`amadeus-utility.ts:3926`) | `detectHarnessType()`(`amadeus-lib.ts` 新設) | intent birth 時 | 同一プロセス内の同期関数呼出 |

stories.md の利用シナリオ「intent を birth したとき自動記録」は、この単一の同期呼出で充足する。非同期・イベント駆動は不要(requirements.md に該当要件なし)。
