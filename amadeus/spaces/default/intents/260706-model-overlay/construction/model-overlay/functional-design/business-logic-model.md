# Business Logic Model — model-overlay

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## overlay 設定の形（O-1 の確定）

`dev-scripts/data/model-overrides.json`:

```json
{
  "agents": {
    "amadeus-architect-agent": { "model": "fable", "base": "opus" },
    "amadeus-design-agent": { "model": "fable", "base": "opus" }
  },
  "fallbacks": { "fable": "opus" }
}
```

- `agents.<name>.model`: 指定モデル（宣言）。`base`: 適用スクリプトが適用時に実ファイルから記録した書き換え前の値（FR-1.1。初期値はハードコードせず初回 apply が記録する = A-2。上記の `"base": "opus"` は初回 apply 後の姿）。
- `fallbacks`: 宣言済み降格先（FR-1.2）。
- fallback 発動記録（FR-4.2）: 発動時に対象 agent entry へ `"fallbackApplied": { "to": "opus", "reason": "<人間が --reason で渡した理由>" }` を追記する。解除は entry の削除（通常適用に戻す）で行い、git 履歴が発動期間の証跡になる。

## 適用スクリプト（O-1 の CLI）

`dev-scripts/apply-model-overrides.ts`:

- 引数なし（適用）: 宣言された各 agent の `.agents/amadeus/agents/<name>.md` frontmatter `modelOverride:` 行を `model` 値へ書き換える。冪等（FR-2.1）。base の扱い:
  - base 未記録（初回）: 実値が管理値集合（model / fallbacks[model]）でなければ、その実値を base として記録して適用する。
  - base 記録済みで実値が base または管理値集合のいずれか: 通常適用（base 不変）。
  - base 記録済みで実値がそのいずれでもない（= 上流変更または手編集の可能性）: **base を自動更新せず非ゼロ終了で拒否**し、「先に `npm run parity:check`（または `models:check`）で乖離を確認し、上流変更を受け入れる場合は `--accept-upstream-base` で明示的に base を更新せよ」と案内する。自動更新は FR-3.2 の drift 検出を握りつぶすため行わない（reviewer 懸念 2 の対処）。
- `--accept-upstream-base`: 上記拒否ケースで、人間が上流変更を確認済みのときだけ base を実値へ更新してから適用する明示フラグ。
- `--use-fallback --reason "<text>"`: `fallbacks` の降格先で適用し、`fallbackApplied` を記録、警告を出力（FR-4.1/4.2）。`--reason` 必須。
- `--check`: 書き換えを行わず、実ファイルの modelOverride が overlay 宣言（fallback 込み）と一致するかを検査し、不一致を非ゼロ終了で報告（NFR-1 の「宣言未反映の検出」の決定論的実体。CI では eval 経由で実行される）。
- npm scripts: `models:apply` / `models:check`。promote-skill.ts の最終段から適用関数を直接 import して呼ぶ（FR-2.2。同一実装。`--dry-run` 時は呼ばないガードを必須とする）。
- 事実の明記（reviewer 懸念 3）: promote-skill の書き込み先は `.agents/skills/` のみで、宣言対象 2 agent（engine の `.agents/amadeus/agents/`）には現状の repo 構成では発火しない。FR-2.2 のフックは「skill が persona .md を同梱する将来構成」への前方互換ガードであり、宣言対象 2 agent の実際の再適用経路は FR-2.3 の `models:apply`（上流同期後）である。

## parity 整合（FR-3 の実装位置）

`dev-scripts/parity-check.ts` の checkEngineFiles に正規化 1 段を追加する:

1. 検査対象 path が overlay 宣言 agent に対応する場合（local `.agents/amadeus/agents/amadeus-<x>.md` ↔ upstream `agents/aidlc-<x>.md` の既存 nameMappings で対応付け）、
2. `base` が記録済みなら、ディスク内容の `modelOverride:` 行の値が**管理値集合 `{model} ∪ {fallbacks[model]}` のいずれかと一致する場合に限り** `base` へ置換した内容で sha256 を計算して baseline と比較する（FR-3.1。トークン一致置換であり、位置的な無条件置換ではない）。管理値集合に一致しない値（手編集等の乖離）は置換せずそのまま hash するため、baseline と不一致になり parity が fail する（domain-entities.md の「乖離」行の成立条件。reviewer 懸念 1 の対処）。現初期宣言は base と fallback 先が同値（opus）だが、この規則は base ≠ fallback 先の将来宣言でも正しく動く。
3. `base` 未記録（bootstrap window）なら正規化せず通常比較し、不一致時の報告に「apply 未実行の宣言がある（models:apply を実行）」のヒントを付す（FR-1.4）。
4. 上流が modelOverride を変更した場合、base 置換後の内容が新 baseline と一致しなくなるため fail する（FR-3.2 の drift 検出）。なお FR-3.2 の「apply は毎回 base を最新の実値で記録し直す」という機構描写は採用せず、BR-10/BR-12 の方式（bootstrap 時のみ記録、以降は `--accept-upstream-base` のみが更新）に置き換える。FR-3.2 が要求する結果（drift 時の parity fail）はこの方式でも成立する。

## doctor 警告（O-2 の確定）

`amadeus-utility.ts doctor` に「モデル overlay 乖離」検査を追加する。実装制約と整合の根拠:

- 依存方向規則（エンジンは repo 開発スクリプトへ依存しない）との整合: doctor は `dev-scripts/data/model-overrides.json` を**任意ファイルの fail-open 読み取り**として扱う。ファイル不在（配布先 workspace = overlay は配布しない FR-1.3）では検査自体を静かにスキップし、エンジンの動作は dev-scripts に依存しない。存在する場合のみ、実ファイルの modelOverride が overlay 宣言（model または fallback 先）と一致しない agent を警告として列挙する（FR-4.3）。
- この「任意・fail-open・不在時 no-op」の設計が依存方向規則の趣旨（skill/エンジンが dev-scripts なしで動くこと）を満たすことは、設計 gate で人間確認事項として付す。
- amadeus-utility.ts はエンジンファイルのため、Corrections c3 に従い engineFileExceptions 宣言（済み）+ exceptions 理由追記を行う。

## code-generation 向け実行方針

1. TDD（NFR-1）: eval `dev-scripts/evals/model-overlay/check.ts` を先に書き RED を確認 — (a) 宣言未反映の検出（--check が非ゼロ）(b) 適用の冪等 (c) revert(apply(x)) == x の byte 一致ラウンドトリップ（FR-3.3）(d) base ドリフト時の parity fail（FR-3.2 の時系列を隔離 workspace で再現）(e) bootstrap window（base 未記録）の通常比較 + ヒント（FR-1.4）(f) fallback 適用と発動記録（FR-4.1/4.2）(g) doctor 乖離警告と不在時 no-op（FR-4.3）。
2. package.json: `models:apply` / `models:check` / `test:it:model-overlay` + `test:it:all` 連鎖。
3. 実装後、初回 apply を実行して初期宣言 2 agent を fable 化し、parity:check / test:all の pass を確認（受け入れの実地確認）。
4. 上流同期後の手順は順序を含めて運用文書へ記す（FR-2.3、BR-6）: 「(1) `npm run parity:check` で乖離を確認 →（上流が modelOverride を変えていれば baseline 更新等の通常の parity 対応と `--accept-upstream-base`）→ (2) `npm run models:apply` で再適用」。apply を先に実行しても、管理外の実値は拒否されるため drift は握りつぶされない（懸念 2 の防壁は運用順序と拒否の二重）。
5. eval 系列の追加（懸念 1・2 の固定）: (h) 上流同期直後に models:apply を先に実行しても、管理外の実値に対して非ゼロ終了で拒否し base が不変であること。(i) 管理値集合に一致しない手編集値が parity で fail すること（トークン一致置換の負ケース）。
