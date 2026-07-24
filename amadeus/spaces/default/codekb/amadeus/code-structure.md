# コード構造

## リポジトリ構成

| パス | 分類 | 責務 |
|---|---|---|
| `packages/framework/core/` | framework 正本 | tools、hooks、skills、stages、rules、sensors、knowledge |
| `packages/framework/harness/` | harness overlay | 6ハーネス固有の manifest、adapter、設定 |
| `dist/{harness}/` | 生成物 | 利用者へ配布する完成済みツリー |
| `packages/setup/` | 配布パッケージ | `@amadeus-dlc/setup` installer |
| `scripts/` | 開発・配布ツール | package、promote-self、release、team orchestration |
| `tests/` | 検証 | smoke、unit、integration、e2e と共通 runner |
| `docs/guide/` | 利用者文書 | harness 利用、workflow、設定 |
| `docs/reference/` | 開発者文書 | architecture、state、rules、tool contracts |
| `amadeus/spaces/` | 実行データ | memory、knowledge、CodeKB、Intent record |
| `.codex/`、`.agents/` など | self-install 面 | 開発リポジトリ自身で使う生成・設定面 |

## Core の内部パターン

core tools は、Bun で直接実行できる TypeScript CLI と、テスト可能な export 関数を同居させる構成である。`amadeus-lib.ts` が workspace/Intent 解決、監査、状態読取などの共有機能を持ち、`amadeus-state.ts` と `amadeus-orchestrate.ts` はその上に大きな状態機械を構築する。

dominant pattern は「判別 union を返す純粋な判定関数」と「filesystem/process を操作する handler」の分離である。ただし共有ファイルの規模が大きく、`amadeus-lib.ts` 7,602行、`amadeus-state.ts` 4,467行、`amadeus-orchestrate.ts` 3,675行であり、変更時の fan-in と回帰面は大きい。

## Mirror 関連ファイル

| ファイル | 行数 | 現行責務 |
|---|---:|---|
| `packages/framework/core/tools/amadeus-mirror-config.ts` | 小規模 | 3層 config path、parse、merge、resolve |
| `packages/framework/core/tools/amadeus-mirror.ts` | 525 | snapshot、render、gh 実行、create/sync/close/status |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | 3,675 | phase boundary policy、directive、report、park/complete |
| `packages/framework/core/tools/amadeus-state.ts` | 4,467 | receipt parser、state transition、workflow state |
| `packages/framework/core/tools/amadeus-lib.ts` | 7,602 | project/space/intent/record 解決、共有 I/O |
| mirror skill | 配布対象 | 利用者向けコマンドと操作手順 |
| `tests/*/t232-*` | unit/integration | mirror CLI、gh、status、部分成功 |
| `tests/*/t257-*` | unit/integration | config parse、merge、実ファイル解決 |
| `tests/*/t265-*` | unit/integration/e2e | boundary decision、receipt、6面配布 |

## 配布と self-install の分類

core と harness overlay が編集正本であり、`dist/` と self-install 面は生成物である。正本変更後は `scripts/package.ts` と `scripts/promote-self.ts` を通して同期し、生成物を個別に手編集しない。harness manifest が、どの core 資産と overlay を各出力へ含めるかを定義する。

## 今回の変更候補面

三モード化は少なくとも config、policy、boundary wiring、state/provenance、mirror handlers、skill、tests、manifests、日英文書に及ぶ。実装は「policy decision/result 型」を狭く追加し、既存の config/handler seam を再利用するのが最小である。tracker transport abstraction、汎用 scheduler、後方互換 shim は追加しない。

project root 解決は mirror 固有の階層計算を維持せず、既存 `resolveProjectDir()` の契約へ収束させる候補が最も小さい。non-default space は record path の構成を増やすのではなく、既存 selector を mirror call chain 全体へ通すべきである。
