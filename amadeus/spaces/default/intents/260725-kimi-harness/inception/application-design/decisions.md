上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

# Decisions (ADR) — 260725-kimi-harness

> 上流入力の使用箇所: requirements.md の制約(TC/OC)と FR を各 ADR の Context に使用。architecture.md / component-inventory.md の現行節(amadeus-harness.ts 移管・cursor/codex 雛形構造・3閉集合)を ADR-2/ADR-3/ADR-4/ADR-6 の根拠として使用。team-practices.md の Walking Skeleton(最初の Bolt = M1 スライス)は ADR-2(emit なしで最初のスライスが manifest のみで完結する)の根拠として使用。

## ADR-1: harnessDir は `.kimi-code`

- **Context**: Kimi のプロジェクトレベル検出パスは `.kimi-code/`(skills/agents/mcp.json/local.toml)。旧記述(`.kimi`)は旧 kimi-cli 時代
- **Decision**: `harnessDir: ".kimi-code"` とする
- **Consequences**: skills/agents がネイティブ検出に載る。他ハーネスの `.agents/` 共有空間と衝突しない
- **Alternatives Rejected**: `.kimi`(旧製品のパス。バイナリ実測で legacy 移行元と確定)、`.agents/` 共用(codex と衝突)
- **根拠**: en docs + 0.28.1 バイナリ文字列 + 実機の3系統(2026-07-25 実測)
- **Reversibility**: 容易(manifest 1行 + 列挙。ただし利用者の記憶には残る)

## ADR-2: emit なし・デフォルト runner-gen

- **Context**: kimi の SKILL.md frontmatter 寛容性が未確定なら codex 式 emit で skills を compose する必要があった
- **Decision**: `emit: null` とし、runner-gen 既定で `.kimi-code/skills/` に生成する
- **Consequences**: 新規コード量が最小(manifest + authored のみ)。runner-gen の将来改善に自動追随
- **Alternatives Rejected**: codex 式 emit(skipRunnerGen + 自前 compose)。frontmatter 制御が不要と実証されたため
- **根拠**: このセッション(Kimi)がロードした `.agents/skills/amadeus-application-design/SKILL.md` の frontmatter(`argument-hint`・`user-invocable` 含む)が claude runner-gen 出力とバイト同一 = Kimi は未知フィールドを寛容に扱う(2026-07-25 実測)
- **Reversibility**: 容易(後から emit を足せる。dogfood で不寛容が判明した場合の fallback)

## ADR-3: adapter + lib 分割

- **Context**: hook adapter のテスト容易性。cursor は「薄い shim + ロジック lib」分割で lib を100%カバーする構造
- **Decision**: cursor 踏襲(`amadeus-kimi-adapter.ts` shim + `amadeus-kimi-lib.ts` ロジック)
- **Consequences**: 変換表の契約テストが in-process で書ける
- **Alternatives Rejected**: 単一ファイル(codex 式)。テスタビリティで劣る
- **Reversibility**: 容易(実装初期の構造選択)

## ADR-4: managed block の正本スニペットを dist 同梱の authored file とする

- **Context**: ユーザー config に書き込む `[[hooks]]` 群の内容をどこに置くか。installer・doctor・docs の3者が同じ内容を参照する必要がある
- **Decision**: `packages/framework/harness/kimi/hooks/amadeus-hooks.snippet.toml` を authored file として dist/kimi に同梱し、installer(マージ)・doctor(検査)・docs(手動手順)が参照する単一ソースとする
- **Consequences**: 配線内容の変更が1ファイルに集約され、dist:check で drift 検出される
- **Alternatives Rejected**: installer へのハードコード(二重管理)、docs のみ(機械検査不能)
- **Reversibility**: 容易

## ADR-5: ユーザー config マージは既存インストーラ流儀

- **Context**: ユーザーグローバル config への書き込みは外部境界(OC-1)
- **Decision**: plan report で差分事前表示 → wizard `confirm()` で承認 → atomic apply + バックアップ。拒否時は変更なし + 手動手順表示。非対話環境も既存規則に従う
- **Consequences**: kimi 独自 UX なし。既存のテストパターン(tty port の fake 注入)がそのまま使える。既存の確認導線と一貫した UX になる一方、managed block 差分表示のため plan report の組立てに C3 由来の項目を足す変更が必要
- **Alternatives Considered**: (a) `--apply-hooks` フラグ必須(非対話既定は安全だが、対話利用の既定 UX と二流儀になる) (b) 対話プロンプト新設(既存 confirm と重複する独自 UX) — いずれも「kimi 独自仕様を入れない」のユーザー裁定に反するため不採用
- **根拠**: `packages/setup/src/cli.ts:190/:194/:296`、`ports/tty.ts:7-9`、`reporter.ts:101-104`(実測)
- **Reversibility**: 容易(新規モジュール内の選択)

## ADR-6: swarm は HARNESS_VALUES 追加のみ(subagent フロア)

- **Context**: scope-definition Q1 で有効化決定。ultra 系は実効を telemetry で検証不能
- **Decision**: `HARNESS_VALUES` に `"kimi"` を追加し、`resolve --harness kimi` は subagent floor。kimi-ultra は作らない
- **Consequences**: kimi 上の construction で swarm(ネイティブ subagent fan-out)が使える。resolve 分岐テストの追加が必要。cursor/opencode 非収録との非対称は維持される(意図的な opt-in 構造)
- **Alternatives Considered**: (a) 非対応で出す(cursor/opencode 方式) — ユーザーが有効化を裁定済み (b) kimi-ultra 新設 — 実効を検証不能
- **Reversibility**: 容易

## ADR-7: Windows 考慮は既存同等

- **Context**: ユーザー裁定(既存レベルと同等。完全対象外にはしない)
- **Decision**: bun 直実行・実行ビット不要・ポータブルなパス処理を既存 adapter/hook と同じ規律で守る。専用の Windows 検証プログラムは設けない
- **Consequences**: 実装規律は既存と同一で追加コストなし。Windows 実機検証は行わないため、Windows 固有の不具合は利用者報告で検出する運用となる
- **Alternatives Considered**: (a) Windows 実機/CI live 検証 — 環境がなく過剰 (b) macOS/Linux のみサポート明記 — ユーザーが「完全対象外にする必要ない」と却下
- **Reversibility**: 容易
