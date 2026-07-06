# コード生成計画 — unit: overlay-reverse

上流入力は [requirements.md](../../../inception/requirements-analysis/requirements.md)（FR-1.1〜FR-1.3、FR-2.1〜FR-2.2、FR-3.1〜FR-3.2、FR-4.1〜FR-4.3）と [requirements-analysis-questions.md](../../../inception/requirements-analysis/requirements-analysis-questions.md)（Q1 = A、Q2 = A）である。
scope bugfix により functional-design / nfr-design / infrastructure-design は SKIP（設計どおりの不在）。要求と、流用元の既存実装（`dev-scripts/apply-model-overrides.ts` の export 済み `readModelOverrideLine` / `setModelOverrideLine`、`dev-scripts/parity-check.ts` の `normalizeModelOverlay` 233〜252 行目）を事実上の設計として参照する。
Test Strategy は Minimal（要件駆動。TDD: RED 先行）。実行単位は単一 unit / 1 PR である。

## トレーサビリティ

| Step | 対応要求 | 対象 |
|---|---|---|
| Step 1 | FR-4.1 | eval 先行: unit レベル分岐（純粋関数）を `dev-scripts/evals/installer/check.ts` へ追加 |
| Step 2 | FR-4.1、FR-2.1、FR-3.1、FR-3.2 | eval 先行: 実 source 相手の E2E（`ws` 再利用）+ manifest 整合 assertion を追加 |
| Step 3 | （RED 確認） | 追加した assertion が実装前に FAIL（または import 不能で全体 crash）することを確認する |
| Step 4 | FR-1.1、FR-1.2、FR-1.3 | `scripts/amadeus-install.ts`: `reverseModelOverlay` 純粋関数と `loadModelOverlay` を追加し、export する |
| Step 5 | FR-1.1、FR-3.1 | `copyEngine` の per-file ループへ、`agents` dir 配下 md ファイル限定で `trackedWrite` 直前の変換として組み込む |
| Step 6 | FR-4.2、FR-4.3 | 検証一式（eval 全 GREEN、`npx tsc --noEmit`）を実行し記録する |
| Step 7 | （stage 成果物契約） | code-summary.md 作成 |

## 実行ステップ

- [x] **Step 1: unit レベル eval（純粋関数）** — `reverseModelOverlay(content, agentName, overlay)` を import する前提で、次の 6 分岐を assert する: (a) 宣言 agent + 実値 = 宣言モデル → base 書き換え、(b) 宣言 agent + 実値 = 宣言済み fallback 先 → base 書き換え、(c) 宣言 agent + 実値が管理値集合外 → 無変更、(d) base 未記録（bootstrap window）→ 無変更、(e) agent が overlay に未宣言 → 無変更、(f) overlay が null（宣言ファイル不在、FR-1.3 の fail-open）→ 無変更。
- [x] **Step 2: E2E + FR-3 統合 eval** — 既存の `ws`（実 source からの 1 回目・2 回目 install が既に走っている temp workspace）を再利用し、(a) 配布された `amadeus-architect-agent.md` / `amadeus-design-agent.md` が `modelOverride: opus` を持ち `fable` を持たないこと、(b) 非対象 agent（`amadeus-developer-agent.md`）が source とバイト同一であること、(c) manifest（`.amadeus-install.json`）の記録 hash が実ファイルの sha256 と一致すること（FR-3.1）、(d) 2 回目 install で当該 agent md が「変更なし = skip」象限に落ち、backup 行にも `.amadeus-install-backup/` 配下にも現れないこと（FR-3.2）を assert する。
- [x] **Step 3: RED 確認** — `bun dev-scripts/evals/installer/check.ts` を実装前に実行し、fail することを確認する。実測: `reverseModelOverlay` が未 export のため ESM の named-export 解決で `SyntaxError` が発生し、eval スクリプト全体が起動不能になった（0 assertion 実行、353 件の既存 assertion を含め全滅）。これは部分 FAIL より強い RED 証跡として採用する。
- [x] **Step 4: `reverseModelOverlay` / `loadModelOverlay` 実装** — `scripts/amadeus-install.ts` に `dev-scripts/apply-model-overrides.ts` から `readModelOverrideLine` / `setModelOverrideLine` を import し（Q1 = A）、管理値集合判定（実測 3 行相当）だけを `reverseModelOverlay` として実装・export する。`loadModelOverlay(src)` は `dev-scripts/data/model-overrides.json` の読み込みを try/catch で包み、失敗時は `null`（FR-1.3）。
- [x] **Step 5: `copyEngine` への組み込み** — `copyEngine` の先頭で `loadModelOverlay(src)` を 1 回だけ呼び、per-file ループ内で `dir === "agents" && rel.endsWith(".md")` のときだけ `reverseModelOverlay` を通してから `rec.trackedWrite` へ渡す。変換は `trackedWrite` 呼び出し「前」に完了させ、manifest hash が自動的に書き込み後内容の sha256 になるようにする（FR-3.1 の帰結、設計どおり再導出不要）。
- [x] **Step 6: 検証** — `bun dev-scripts/evals/installer/check.ts`（全 GREEN 確認）、`npx tsc --noEmit`（pass 確認）を実行する。
- [x] **Step 7: code-summary 作成** — 変更ファイル、主要判断、RED→GREEN 証跡、FR 対応表、逸脱（本 Intent は逸脱なしの想定）を `code-summary.md` に記録する。

## 制約（requirements.md より）

- 変更対象は `scripts/amadeus-install.ts` と `dev-scripts/evals/installer/check.ts` の 2 ファイルに限定する。
- `dev-scripts/apply-model-overrides.ts` と `dev-scripts/parity-check.ts` は無変更（export 済み helper を import するだけ）。
- 逆変換以外の配布内容変換（新しい変換一般機構）は作らない（bugfix scope の Right-Sizing）。
- amadeus-state.md、audit ファイル、本 record 内の produces 2 点以外は変更しない。
