# Logical Components — u1-runner-relocation

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

## コンポーネント表

| 論理コンポーネント | 実体 | NFR 関与 |
|---|---|---|
| runner 閉包(24 ファイル) | plugins/formal-model-check/tools/(business-logic-model.md T1、domain-entities.md E1) | 挙動不変(性能・セキュリティの現状保存) |
| model-map 複製+drift 検査 | 同 tools/ 配下+検査1本(T2/T3) | 信頼性(単一ソース+機械検出 — business-rules.md BR-U1-2) |
| CI 消費点 | ci.yml :584/:600(E3) | 信頼性(loud exit 分岐の保存) |
| 台帳2面 | allowlist/baseline の remap(T7) | fail-closed(NFR-4) |

## 依存方向

runner 閉包 → model-map 複製(同ディレクトリ相対 import のみ)。CI 消費点・台帳2面は runner 閉包のパスを参照する外部消費者で、逆方向依存なし(変更の伝播は一方向)。

## NFR 対応の全数表

| NFR | 本 unit での扱い |
|---|---|
| NFR-1(検証二層) | 既存 CI 維持+TLC 専用ジョブのパス付け替えのみ(performance-design) |
| NFR-2(TDD) | 純移設につき適用外条項 — 代替検証は前後 green+drift(performance/reliability-design) |
| NFR-3(配布同期) | dist 7 ハーネス+self-install の同一 PR 再生成(scalability/security-design) |
| NFR-4(台帳整合) | 機械 remap+stale fail-closed(reliability/logical-components) |
| NFR-5(ゲート実効) | **N/A** — 対象の FR-A6(境界ガード新設)は u3-boundary-guard のスコープで、u1 は新設ガードを持たない(見落としでなく意図的対象外) |
