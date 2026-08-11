# Components — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(FR-CBG-1〜16 を各コンポーネントの責務へ割付)、architecture.md(tests/ 層 = repo-only、core/harness = 全 dist 投影という配置制約)、component-inventory.md(既存走査系ゲート群 — no-silent-drop / unchecked-cast-guard / complexity-gate — と同族の配置・様式)。条件解決で除外された consumes: stories(required:false)— self-feature スコープで user-stories が SKIP のため不在(設計上の期待どおり)

## コンポーネント一覧

| コンポーネント | 種別 | 配置 | 責務 |
|---|---|---|---|
| control-byte predicate(純関数層) | 新規 | `tests/lib/control-byte.ts` | バイト列に対する検出判定(FR-CBG-3/4/11)。FS 非依存の純関数 — unit テスト対象(in-process seam) |
| control-byte-gate CLI | 新規 | `tests/control-byte-gate.ts` | `git ls-files -z` 列挙 → 各ファイルのバイナリ読取 → predicate 適用 → allowlist 適用 → 診断出力と exit code(FR-CBG-1/2/5/6/13、NFR-2/3)。`--check` verb |
| CI 独立ジョブ | 新規 | `.github/workflows/ci.yml` | 常時実行(needs.changes 非依存)の blocking ジョブとしてゲートを起動(FR-CBG-7/8、AD Q1 裁定 independent-job) |
| unit テスト | 新規 | `tests/unit/`(純関数のみ) | predicate のバイト集合・エスケープ非検出の固定(FR-CBG-12) |
| integration テスト | 新規 | `tests/integration/` | 実 FS(scratch 一時ディレクトリ)での走査・allowlist・stale 検査・診断書式の固定(FR-CBG-12、fs-tests-integration-first) |

## 責務境界

- **predicate は検出判定のみを所有**する(どのバイトが違反か)。ファイル列挙・allowlist・出力整形は CLI 側 — 判定と I/O の分離(core の判定/IO 境界様式の tests 層適用)。
- **CLI が走査母集団を所有**する(`git ls-files -z` の全 tracked — FR-CBG-2)。untracked/gitignored は構造的に対象外。
- **CI ジョブは起動条件のみを所有**する(いつ走るか)。判定には関与しない。
- 既存 canonical(`isUtf8`・`CONTROL_CHARS`)は**参照のみ**で改修しない(Out of scope)。

## 公開インターフェース

- `tests/lib/control-byte.ts`: `findControlByte(buffer)`(検出判定)、`CONTROL_BYTE_SET` 相当の集合定義(component-methods.md に署名)
- `tests/control-byte-gate.ts --check`: exit 0 = clean / exit 1 = 検出または stale allowlist / 読取不能は非 0(NFR-3 fail-closed)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T09:54:21Z
- **Iteration:** 1
- **Scope decision:** none

FR-CBG 16件+NFR 4件は5成果物へ矛盾なく写像。ADR-1〜3 は Context/Decision/Consequences/Alternatives Rejected/Reversibility を備え実質的トレードオフ分析が成立。実コード照合(CONTROL_CHARS 一致・isUtf8 一致・timeout 30s・detect-ci-changes に docs/amadeus 分岐不在・lint job の full ゲート)は全数検証済み。BLOCKER なし — MINOR 1件(timeout 逐語主張の精度)+ FOLLOW-UP 3件は conductor が是正済み。

### Findings

- NIT | component-methods.md/decisions.md — timeout の「逐語引用」主張は数値 30 のみが逐語で、ci.yml:157 の --signal=TERM --kill-after=5s を落としていた(是正済み: コマンド形全体を同形再利用と明記)。
- FOLLOW-UP | components.md — CONTROL_BYTE_SET 相当の対応関係(述語が特性関数として担う)を component-methods.md へ一文明記(是正済み)。
- FOLLOW-UP | component-dependency.md — git spawn 自体の失敗の扱いが未記述だった(是正済み: 列挙段エラーとして loud fail を明記)。
- FOLLOW-UP | components.md — consumes の stories(required:false)の負方向明示なし(是正済み: user-stories SKIP を明記)。
