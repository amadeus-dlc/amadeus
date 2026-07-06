# コード生成サマリー — unit: overlay-reverse

対応 Issue: [#579](https://github.com/amadeus-dlc/amadeus/issues/579)
上流入力: `code-generation-plan.md`、`inception/requirements-analysis/requirements.md`（FR-1〜FR-4）、`requirements-analysis-questions.md`（Q1 = A、Q2 = A）

## 変更ファイル一覧

制約どおり、変更対象は次の 2 ファイルに限定した。`dev-scripts/apply-model-overrides.ts` と `dev-scripts/parity-check.ts` はどちらも無変更である。

### `scripts/amadeus-install.ts`

- import 追加: `dev-scripts/apply-model-overrides.ts` から export 済みの `readModelOverrideLine` / `setModelOverrideLine` を import（Q1 = A、行のパース・置換の重複を作らない）。
- 型追加: `ModelOverlayAgentEntry`（`{ model: string; base?: string }`）、`ModelOverlay`（`{ agents: Record<string, ModelOverlayAgentEntry>; fallbacks: Record<string, string> }`）を export。
- `loadModelOverlay(src: string): ModelOverlay | null` を追加。`dev-scripts/data/model-overrides.json` を読み JSON.parse する。読み取り・パースいずれかで例外が出た場合は catch して `null` を返す（FR-1.3、fail-open。宣言ファイル不在・不正 JSON いずれも同じ経路で吸収する）。
- `reverseModelOverlay(content: string, agentName: string, overlay: ModelOverlay | null): string` を追加・export。overlay が null、agent が overlay に未宣言、または `entry.base === undefined`（bootstrap window）のいずれかなら無変換で content を返す。それ以外は `readModelOverrideLine` で実値を読み、宣言モデルと宣言済み fallback 先の和集合（管理値集合）に実値が含まれる場合に限り `setModelOverrideLine` で base 値へ書き換える。`readModelOverrideLine` が例外を投げた場合（`modelOverride` 行が見つからない）は catch して無変換で返す。#554 parity の `normalizeModelOverlay`（`dev-scripts/parity-check.ts` 233〜252 行目）と同じ保守則（FR-1.2）。
- `copyEngine` を変更: 関数先頭で `loadModelOverlay(src)` を 1 回だけ呼び出す。per-file ループ内で `dir === "agents" && rel.endsWith(".md")` の場合だけ、読み込んだ Buffer を utf-8 文字列化して `reverseModelOverlay` に通し、その結果を `rec.trackedWrite` に渡す（変換は `trackedWrite` 呼び出し「前」に完了しているため、manifest hash は自動的に書き込み後内容の sha256 になる = FR-3.1、再導出不要）。それ以外のファイル・dir は従来どおり Buffer のまま `trackedWrite` に渡す（無変更）。

### `dev-scripts/evals/installer/check.ts`

- import 行に `reverseModelOverlay` を追加。
- 新規ブロック「FR579 — 純粋関数の単体分岐」（README セクションと Temp workspace セクションの間、既存の温存箇所を避けて追加）: 6 assertion。
- 新規ブロック「FR579 — 実 source 相手の E2E + FR-3 統合」（既存の `ws` を使った 1 回目・2 回目 install の直後、FR-2.13 セクションの直前に追加。既存の install/manifest を再利用し、新規の temp workspace は作らない）: 8 assertion。

## 主要判断

1. **Q1 = A どおり、`normalizeModelOverlay` 自体は再実装せず、export 済み helper だけを import した。** 管理値集合の判定（`managed = new Set(fallbackTarget ? [entry.model, fallbackTarget] : [entry.model])`）だけを `reverseModelOverlay` 内にインラインで書き、行のパース・置換ロジックの重複はゼロである。`dev-scripts/apply-model-overrides.ts` と `dev-scripts/parity-check.ts` は無変更で、`managedValues`（apply-model-overrides.ts 側の非 export 関数）も変更していない。
2. **`copyEngine` 内で dir ごとの Buffer→string 変換を `agents` dir の `.md` ファイルに限定した。** 他の engine dir（`amadeus-common`、`hooks`、`knowledge`、`scopes`、`sensors`、`tools`）や `agents` dir 内の非 `.md` ファイルは、従来どおり Buffer のまま `trackedWrite` へ渡す。UTF-8 有効なテキストファイル（agent md）に限り文字列往復させても bytewise 差分は出ないことを、非対象 agent（`amadeus-developer-agent.md`）のバイト同一性 assertion（FR579-2.2）で確認した。
3. **`loadModelOverlay` は 1 回だけ、`copyEngine` の先頭で呼ぶ。** per-file ループ内で毎回ファイルを読み直さない（宣言ファイルは実行中に変わらない前提であり、余計な I/O を避ける）。
4. **FR-3.1 は実装ではなく設計の帰結として扱った。** 変換を `trackedWrite` に渡す content へ適用してから呼び出す構造そのものが「manifest hash = 書き込み後内容の sha256」を自動的に満たすため、`InstallRecorder.trackedWrite` 内部のハッシュ計算ロジックには一切手を入れていない。

## RED→GREEN 証跡（TDD）

### RED 確認

`reverseModelOverlay` を export する前に、import 文と unit レベル eval・E2E eval を先に `dev-scripts/evals/installer/check.ts` へ追加し、`bun dev-scripts/evals/installer/check.ts` を実行した。

```
1 | })
2 | {
    ^
SyntaxError: Export named 'reverseModelOverlay' not found in module '/Users/.../scripts/amadeus-install.ts'.
      at loadAndEvaluateModule (2:1)

Bun v1.3.13 (macOS arm64)
```

ESM の named-export 解決の時点でモジュールロードが失敗し、eval スクリプト全体が起動不能になった。これにより、既存の 353 件を含む全 assertion が 1 件も実行されない（0/367 実行、実質全滅）という、部分 FAIL よりも強い形の RED を確認した。

### 追加ロジックのみを対象にした RED 再現（補強）

import crash による RED は「export の有無」しか検証しないため、`copyEngine` への実際の配線（`reverseModelOverlay` の呼び出し）を一時的に無効化し（export・純粋関数の実装自体は残したまま）、E2E assertion だけが狙いどおり FAIL することを個別に確認した。

```
FAIL: FR579-2.1 distributed amadeus-architect-agent.md carries modelOverride: opus (overlay base) — ---
FAIL: FR579-2.1 distributed amadeus-architect-agent.md does not carry modelOverride: fable (dev-only override) — ---
FAIL: FR579-2.1 distributed amadeus-design-agent.md carries modelOverride: opus (overlay base) — ---
FAIL: FR579-2.1 distributed amadeus-design-agent.md does not carry modelOverride: fable (dev-only override) — ---
```

（`FR579-1.x` の純粋関数単体テストと `FR579-2.2`/`FR579-3.1`/`FR579-3.2` は、配線を無効化した状態でも pass した。`FR579-2.2` はもともと無変換で通る assertion、`FR579-3.1`/`FR579-3.2` は「書き込んだ内容の hash を記録する」という `trackedWrite` の既存設計に対する自己無矛盾性の確認であり、変換の有無に関わらず成立する — 実装の正しさを損なわない設計上の性質であり、それ自体は本 Issue の主眼である FR579-2.1 の欠落を検出しない。主眼の RED 検出力は FR579-2.1 の 4 件が担保している。）

確認後、`copyEngine` への配線を復元し、実装を完了させた。

### GREEN 確認

配線を復元した状態で `bun dev-scripts/evals/installer/check.ts` を実行し、全 367 件（既存 353 + 新規 14）が pass した。

## FR 対応表

| 要求 | 対応する eval assertion |
|---|---|
| FR-1.1（agent md 配布時の逆変換） | FR579-2.1（実 source 経由の E2E、architect/design 両 agent） |
| FR-1.2（保守則: base 記録済み ∧ 実値が管理値集合） | FR579-1.2（純粋関数、宣言モデル一致／fallback 先一致／管理外値の 3 分岐） |
| FR-1.3（overlay 宣言ファイル不在・読取不能時の fail-open） | FR579-1.3（純粋関数、overlay = null） |
| FR-2.1（overlay 適用中の開発環境からの install で成立） | FR579-2.1（実 source = 本 repo 自体が fable 適用済みの状態で検証） |
| FR-2.2（逆変換は配布物側のみ、source 側は無変更） | FR579-2.2（非対象 agent のバイト同一性で間接確認。source 側ファイルは本作業で一切書き換えていないことは `git status` でも確認済み） |
| FR-3.1（manifest hash = 書き込んだ内容の sha256） | FR579-3.1（manifest 記録値と実ファイル sha256 の再計算一致） |
| FR-3.2（逆変換つき install → 再 install で「変更なし = skip」象限） | FR579-3.2（2 回目 install の backup 行・`.amadeus-install-backup/` 実体の不在） |

FR-4.1〜FR-4.3（検証プロセス要求）は本 code-summary 自体（RED→GREEN 証跡、検証結果セクション）で充足する。

## 検証結果

| 検証 | 結果 |
|---|---|
| `bun dev-scripts/evals/installer/check.ts`（RED 確認: import 失敗で 0/367 実行） | RED（実装前、記録済み） |
| `bun dev-scripts/evals/installer/check.ts`（配線無効化での補強 RED） | RED（`FR579-2.1` 系 4 件 FAIL、他は pass） |
| `bun dev-scripts/evals/installer/check.ts`（実装後、最終） | GREEN（367/367 pass、0 failure） |
| `npx tsc --noEmit` | pass（exit 0、エラーなし） |

## 逸脱

なし。承認済み設計（requirements.md、questions.md の Q1 = A / Q2 = A）どおりに実装した。変更対象ファイルも制約どおり `scripts/amadeus-install.ts` と `dev-scripts/evals/installer/check.ts` の 2 点に限定している。
