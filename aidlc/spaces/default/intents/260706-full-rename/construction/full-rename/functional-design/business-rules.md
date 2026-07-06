# Business Rules — full-rename

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 写像規則（FR-5 の設計）

nameMappings への追加は誤爆面積を最小化する具体パターンで行い、bare token `aidlc` の包括写像は追加しない。

| 対象 | 写像 | kind 設計 | 誤爆対策 |
|---|---|---|---|
| workspace ルート | `aidlc/` → `amadeus/`（path 接頭辞） | engine-dir 型（`(?=/)` 接尾） | `aidlc-workflows`（上流 repo 名）等のハイフン継続を lookahead で除外 |
| 状態ファイル | `aidlc-state.md` → `amadeus-state.md` | scope-file 型（.md 完全一致） | 既存 cli-token `state` の .md ガードと衝突しない順序で追加 |
| コマンド表記 | `/aidlc` → `/amadeus` | cli-token 型（`/` 込み prefix） | `/aidlc-compose` 等の派生表記は別エントリで網羅 |
| 内部マーカー | `.aidlc-` → `.amadeus-` | engine-dir 型（単純前方一致 = `new RegExp(escaped, "g")`） | cli-token 型は不採用: lookahead `(?![A-Za-z0-9_-]|…)` が prefix 直後の文字（`.aidlc-plan` の p 等 = 全マーカーが英字継続）で必ず失敗し一致しない（reviewer F-1 の実測）。`.aidlc-` は marker 名以外に出現しないため単純一致で誤爆しない |

追加写像は必ず往復（forward → reverse で純正に戻る）を機械検証してから採用する（#542 の recopy 手順と同じ規律）。

## 記録規律（FR-6）

- audit の記録済みイベント本文は一切編集しない。各 record の audit shard 末尾へ「移設注記」（旧 path → 新 path、移設 commit、日時）を新規イベントとして追記する。
- 過去 record 内の本文中 path 言及（decision の旧 path 等）は歴史的記録としてそのまま残し、rename-leftovers allowlist に「歴史的記録」カテゴリで宣言する。

## 互換の禁止（backward-compatibility.md）

- 旧 path（aidlc/）へのフォールバック解決・alias・shim を作らない。原子的 commit（Commit B）で一挙に切り替える。
- docs/backward-compatibility.md に旧名の維持対象は追加しない（維持対象ゼロのまま）。

## v2 互換の再定義（FR-7 の文言基準）

「Amadeus の成果物は、構造・意味論（状態機械、checkbox 語彙、audit イベント、英語ラベル）において上流 AI-DLC v2 と互換である。名前空間（workspace ルート、状態ファイル名、コマンド名、内部マーカー）は Amadeus 固有であり、上流との対応は parity-map の nameMappings が機械的に定義する」— この趣旨を AMADEUS.md 作業言語節と docs/amadeus/ の該当文書（.md / .ja.md 両方）へ反映する。

## 制約

- C-1: 挙動変更ゼロ（テスト・eval の期待値変更は「名前」由来のみ）。
- C-2: merge は人間。merge 直後に全 worktree 使用者へ新 path 前提の周知（leader 依頼）。
- C-3: 検証は同一 worktree 直列（並行ゼロ体制のため実質単独）。
