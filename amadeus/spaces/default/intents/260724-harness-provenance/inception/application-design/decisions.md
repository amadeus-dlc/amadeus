# Design Decisions (ADRs) — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, architecture.md, component-inventory.md, team-practices.md

> 注(Alternatives Rejected の件数について): 本 intent は既存モジュールへの数十行の追加という小規模・低自由度の変更であり、各 ADR の設計空間は狭い。application-design stage file の「唯一の実行可能案しかない場合は理由を述べてブロックを省略してよい」に従い、各 ADR は「採用案+それと実質的に競合した1案の却下理由」を記す形とした(他に真に検討に値する代替が存在しなかったため2案目は割愛)。inception guardrail の「代替案最低2つ」は自由度の高い設計判断向けの要求であり、本 intent の低自由度な各決定には比例適用する。

## ADR-1: 検出関数を core 中立層(`amadeus-lib.ts`)へ配置する

- **Context**: ハーネス検出は全ハーネス(claude-code/codex/cursor/opencode/kiro)で共通して必要。team-practices.md の cid:code-generation:harness-tools-placement は「harness 専用ツールを `packages/framework/core/tools/` に置かない(全ハーネス dist へ漏出するため)」と定めるが、本検出関数は harness 専用ではなく全ハーネス共通の汎用機能である。
- **Decision**: `detectHarnessType()` と `HARNESS_DIR_TO_TYPE` を `amadeus-lib.ts`(既存 `deriveHarnessDir()` `:168-183`・`KNOWN_HARNESS_DIRS` `:158` と同じファイル・同じ core 中立層)へ配置する。
- **Consequences**: `bun scripts/package.ts` で全 dist ツリーへ投影される(既存 `deriveHarnessDir()` と同じ扱い)。core 中立層の汎用関数として一貫。セキュリティ/コンプライアンス影響: なし(env 読取と文字列マッピングのみ、外部 I/O なし)。
- **Alternatives Rejected**:
  - harness 別表層(`packages/framework/harness/<name>/tools/`)へ各ハーネス専用の検出関数を置く案 → 5ハーネス分の重複コードとなり、canonical な1定義原則(construction guardrail)に反する。却下。

## ADR-2: manual 上書きを `AMADEUS_HARNESS_TYPE` env override で実現し、docs へ反映する

- **Context**: requirements.md FR-1 AC-1d は「自動検出が unknown を返した場合に manual を明示指定できる経路(CLI フラグまたは env var override)を design 段階で確定する」と委任。leader 補足(2026-07-24T12:37:08Z): env var 名はユーザー可視契約になるため既存規約に忠実にし、docs 反映も設計に含めること。
- **Decision**: `AMADEUS_HARNESS_TYPE` env override を新設する。既存の `AMADEUS_HARNESS_DIR`(`amadeus-lib.ts:190`)・`AMADEUS_RULES_SUBDIR`(`:236`)と同じ `AMADEUS_<領域>` 命名規約に従う。`detectHarnessType()` はこの env が設定されていれば最優先で採用する(FR-1 AC-1d)。ユーザー可視契約であるため、`docs/reference/` の該当ドキュメント(環境変数一覧)への追記を construction スコープに含める。
- **Consequences**: ユーザーは Cursor/OpenCode/Kiro 等で自動検出が不確実な場合に手動でハーネス種別を確定できる。env var の値検証方針(既知の HarnessType 値のみ許容するか、任意文字列を許容するか)は functional-design で確定する(external-seam-vocab-measurement の観点)。docs 更新が construction の produces に加わる。
- **Alternatives Rejected**:
  - CLI フラグ(`--harness <type>`)を第一手とする案 → intent birth の呼出経路(`amadeus-orchestrate`/`amadeus-utility`)への引数追加は影響範囲が広く、既存の env override パターンより変更コストが高い。env override を第一手とし CLI フラグは将来 enhancement へ回す。却下(将来拡張余地は残す)。

## ADR-3: state.md のみを一次記録面とし、memory.md は非構造的記録に留める

- **Context**: requirements.md FR-4 と承認系譜(ユーザー承認 2026-07-24T11:53:04Z)のとおり、reverse-engineering(architecture.md)の実測で stage memory.md は `memory-template.md` のバイトコピーのみで構造を持たず、t100 テストが「見出し正確に4つ」「total=0」を固定している。
- **Decision**: 機械的に参照可能な一次記録面は `amadeus-state.md` の Project Information ブロック(`Harness` フィールド)のみとする。stage memory.md への記録は非構造的(既存4見出しのいずれかへの本文1行)に限定し、`ensureStageDiary()`(`amadeus-lib.ts:1252-1266`)のテンプレートコピー処理・`memory-template.md` の構造は変更しない。
- **Consequences**: t100 テストは変更後も green を維持(FR-4 AC-4a)。ハーネス種別の機械的抽出は state.md からのみ行う。memory.md 側は人間可読の補足に留まる。
- **Alternatives Rejected**:
  - memory.md にYAMLフロントマターを追加して両面を構造化する案 → t100 テスト(「exactly four headings」)を破壊し、後方互換レイヤーの追加を要する。inception guardrail(後方互換シムは既定スコープ外)にも反する。ユーザーエスカレーションを経て却下済み(承認系譜参照)。

## ADR-4: 新規コンポーネントを追加せず既存モジュールへ最小追加する

- **Context**: requirements.md の規模は数十行の内部スキーマ拡張。architecture.md の RE で既存の `getField`/`setOrInsertField`/`harnessDir`(内部で `deriveHarnessDir` へ委譲)が再利用可能と判明。
- **Decision**: 新規クラス・モジュール・パッケージは作らず、`amadeus-lib.ts`(検出関数・定数)と `amadeus-utility.ts`(埋込)への追加のみとする。
- **Consequences**: 変更面が最小(surgical、team.md P5)。既存の dist/self-install ドリフトガードで整合が担保される。新規パッケージの lint/typecheck 配線(Mandated)は不要。
- **Alternatives Rejected**:
  - 独立した `amadeus-harness.ts` モジュールを新設する案 → 数十行のために新規ファイル+全 dist ツリーへの投影+import 配線を増やすのは過剰。既存ファイルへの凝集追加が適切。却下。
