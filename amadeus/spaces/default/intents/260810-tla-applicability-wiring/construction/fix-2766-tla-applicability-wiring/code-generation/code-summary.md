# Code Summary — fix-2766-tla-applicability-wiring

上流入力（consumes 全数）: `requirements.md`（FR-1〜7 の受け入れ基準を実装・検証の合否条件として消費）。設計裁定は `code-generation-plan.md` D1〜D5。

## 実装（コミット列、base = `91f37ec85`）

| SHA | 内容 | FR / D |
|---|---|---|
| `75a6ba059` | `REQUIREMENTS_HEADING_RE` を実コーパス文法へ拡張（数字終端必須、3桁形維持） | FR-2 / Step 1 |
| `92abfaa3d` | `subjects declare` verb 新設 + `defaultSubjectsPath` を watch-glob 外（`specs/authoring-subjects.json`）へ移設 + t481:227 明示改訂 | FR-1 + D4 / Step 2 |
| `41b7bd639` | 宣言 schema `handoff: {stage}` + directive `handoff_stage` 搬送（parse は present-but-broken を invalid へ、absent は正当な null — 3 build site を `directiveItemFor` へ一本化） | FR-3 + D2 / Step 3 |
| `5d53d0344` | `applicability receipt --persist true` — 終端経路の terminal-route-receipt を EvidenceBundle.build 経由で永続化（新 failure kind `not-a-terminal-route`） | FR-4 + D3 / Step 4 |
| `8799acc16` | t528 端到端（供給→hold→handoff→非解除→receipt 解除）+ t529 痕跡ピン（FR-7 は既存機構で充足 — 生産コード追加ゼロ） | FR-5/6/7 / Step 5-6 |
| `f07798519` | docs 22（en/ja）+ stage-protocol §11a の handoff 契約明文化 | Step 7 同期 |
| `1a7037f46` | t529 の branded 型 assert 修正（conductor 是正） | — |

## 検証（conductor 引き取り再実行 — 実測 exit code）

builder が §6 記入前に停止したため、検証は conductor が全数直接実行した（`cid:code-generation:c5` 引き取り: 差分検分 + 検証コマンド再実行）:

- `bun run typecheck` → 初回 **exit 2**（t529:63 branded 型エラー = builder 検証未完の実証）→ 修正 `1a7037f46` → **exit 0**
- `bun run lint` → **exit 0**（Checked 1731 files）
- 新規 6 テスト（t524〜t529）→ **26 pass / 0 fail / 117 expect、exit 0**
- ピン 6 ファイル（t444 / t445×3 / t450 / t481）→ **95 pass / 0 fail / 497 expect、exit 0**
- `bun run build` → **exit 0**、実行後 `git status --porcelain -- packages plugins tests docs .claude` は意図した変更のみ（tracked 不変性確認）
- FR-5 absence: `find . -name authoring-subjects.json`（node_modules 除外）= **0 件**、`specs/tla-evidence` 不在 — 着地時に宣言ファイル・store を作らない AC を充足
- coverage patch / project gate: **PR CI を正とする**（`cid:code-generation:local-lcov-pre-push` — ローカル完走を必須にしない）

## Red/Green 証跡（builder 実測、notes 転記）

Step 1: Red exit 1（2 pass 2 fail）→ Green exit 0（4 pass）。Step 2: Red exit 1（unknown command）→ Green exit 0（4 pass）。Step 3: Red exit 1（Export not found）→ Green exit 0（7 pass）。Step 4: Red exit 1（--persist 無視）→ Green exit 0（5 pass）。Step 5: 初回 green は D5 設計どおり（生産コード追加ゼロの characterization pin — t529 test 1/test 3 が相互反証で非空文性を担保）。Step 6: 落ちる実証 = 患部 5 ファイルを base へ checkout して t528 再実行 → **exit 1（2 pass 1 fail）** → `git checkout HEAD --` で復元・残渣ゼロ確認（`falling-proof-no-stash` 準拠）。

## 逸脱

**申告 1 件（承認済み裁定からの一意導出 = 執行、事後開示）**: plan は明示改訂対象を t481:227 のみと宣言したが、CI が `t436-tla-evidence-identity.test.ts:135-139`「does not match ids whose digit run continues past the grammar」の赤を検出（PR #2779 初回 CI、Tests / Coverage(head) の失敗集合は本 1 件で完全 — ログ実文確認）。同テストの前腕（`FR-0061` = 4桁を不一致とする）は旧3桁文法のピンであり、FR-2（Q1=A ユーザー承認済みの文法拡張）と正面衝突する。承認済み裁定から一意に導出される執行として明示改訂（4桁 id は正当な抽出、`FR-006x` 接尾辞の不一致は維持 — 改訂理由をテスト内コメントに記載、コミット `t436 revision`）。builder のピン棚卸し（t444/t445/t450/t481）から t436 が漏れていたことが原因（`cid:requirements-analysis:enumeration-completeness-review` の実例）。その他の既存ピン（BR-U2-05 / t445 supply / t450 / `scopes: []`）は無改変で green。

## 申し送り

1. **`STABLE_ID_RE` 非対称（Issue 起票候補）**: 見出し抽出は `FR-1` 形を受理するが `normalizeStableId`（trace verb 系）は3桁形のまま。authoring-hold 経路は非依存のため本 intent の FR は非ブロック。`FR-1` 形 subject で実モデルを author する将来 intent が `trace` verb で当たる。
2. `--persist` は明示値必須（`--persist true`）— `parseFlags` の `--name value` 文法制約。docs 22 に記載済み。
3. complexity gate 起因の挙動不変リファクタ 2 件（`parseOne` 分割 / `applicabilityReceipt` 分割）。baseline 追加なし。
