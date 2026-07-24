# plugin-skeleton コード生成サマリー

上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、performance-design、security-design、unit-of-work、requirements

## 実装結果

U2 `plugin-skeleton` の2面を実装した。compile された plugin ステージを stage graph に合流させる汎用 walk 拡張(Flow A)と、opt-in の `formal-model-check` プラグイン供給(Flow B)である。

- **Flow A(コア walk 拡張)**: `discoverPluginStageFiles(hostRoot)` を `amadeus-graph.ts` に追加し、`<hostRoot>/plugins/<name>/stages/<slug>.md` の compose された plugin ステージを `compileStageGraph` の core walk 後に合流させる。汎用機構で formal-model-check 固有のハードコードを持たない(BR-U2-1)。slug 衝突は loud reject、path 辞書順で決定的。0-plugin 時は byte-identical(BR-U2-3)。
- **セキュア read(security-design)**: O_NOFOLLOW open(非対応 platform は fail-closed)、fstat の dev/inode を列挙時 lstat と照合(TOCTOU 防止)、祖先 symlink 拒否、64MiB 総量上限、通常ファイルのみ。
- **エラースキーマ**: `amadeus.plugin-stage-error.v1` の単一行 JSON(SLUG_COLLISION / READ_FAILED / SCHEMA_INVALID / UNKNOWN_SENSOR)、全 code を exit 1 へ写像。POSIX 相対パスのみ、内容・絶対パスは出さない。
- **Flow B(プラグイン供給)**: `plugins/formal-model-check/`(plugin.json + stage[`scopes: []` opt-in / `sensors: [model-completeness]` はコア供給の U5 を参照] + README[ローカル JDK+sandbox-exec / CI Docker digest 固定を FR-2.3 で適用面別に明文化])を authoring し、neutral bundle として `dist/plugins/formal-model-check/` へ出荷。
- **--single opt-in 免除**: `emitSingleRunStage` で `scopes: []` の opt-in plugin ステージを skip-for-scope ガードから免除。stock ステージ(scopes 非空)の skip 拒否は維持。コア32ステージが全て scopes 非空である実測を根拠に、免除は plugin ステージへ一意に効く。
- **可逆性(NFR-4)**: drop 後の再 compile が 0-plugin baseline と byte-identical に戻ることを実 engine の E2E で実証。

## 主な変更ファイル

- `packages/framework/core/tools/amadeus-graph.ts`: `discoverPluginStageFiles` + セキュア read + エラースキーマ + `compileStageGraph` の plugin merge(コア変更、BR-U2-7 遵守)
- `packages/framework/core/tools/amadeus-orchestrate.ts`: `emitSingleRunStage` の opt-in scope 免除(BR-U2-7 越境、裁定 E-TLAU2 A)
- `scripts/package.ts`: plugin を neutral bundle のみ出荷・harness-tree 非投影(BR-U2-7 越境、裁定 E-TLAU2 A)
- `plugins/formal-model-check/`: plugin.json + stages/formal-model-check.md + README(opt-in 依存文書)
- `dist/plugins/formal-model-check/` + 全6ハーネス dist / self-install: 再生成
- `tests/integration/t-formal-verif-plugin-stage-discovery.integration.test.ts`: discover / merge / エラー / shipping guard / in-process main() CLI 出力
- `tests/integration/t-formal-verif-plugin-lifecycle.integration.test.ts`: 実 compose→doctor→compile→--single→drop→baseline の E2E
- `tests/integration/t127-single-stage-invariant.test.ts`: --single 両面(stock 拒否 + opt-in 実行)
- `tests/integration/t254 / t-plugin-projection-packaging`: neutral-bundle 出荷の新挙動へ更新
- `specs/tla/model-map.json`: main 取り込み(#1451)による election 実装ハッシュの再凍結(選挙状態機械に不触の直交変更)
- `tests/.coverage-patch-allowlist.json`: 行シフト再pin + real-toolchain waiver

## 検証結果(PR #1456、main 着地・全 CI green の裏取り)

- 型検査(`typecheck`): PASS
- Lint(Biome): PASS
- `dist:check` / `promote:self:check`: PASS
- テスト(`run-tests.sh --ci`): PASS(smoke+unit+integration+e2e)
- coverage patch gate: PASS(自コードは in-process seam で実カバー、real-JDK/TLC 経路は per-line 検証済み allowlist)
- coverage registry / ratchet: PASS
- 0-plugin baseline byte-identical(t110/t88): PASS。ダミー注入で赤・除去で緑の落ちる実証、shipping guard の leak 赤実証を含む。
- PR #1456 は main へスカッシュマージ着地(mergeCommit 47d5e3f9c、state=MERGED)。着地は close-after-landing-verification で main grep 実読確認済み。

## 逸脱

- BR-U2-7 越境2件(package.ts 投影調整 / orchestrate.ts --single 免除)。いずれも裁定 E-TLAU2 A(ユーザー承認)に準拠し、PR #1456 本文で明示申告済み。無申告の逸脱はない。
