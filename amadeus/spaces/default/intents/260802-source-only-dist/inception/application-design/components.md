# Components — source-only 移行の変更コンポーネント

上流入力(consumes 全数): requirements(FR-0〜FR-6 / NFR-1〜5 — 各コンポーネントの根拠)、architecture(配布境界の患部機序 — 変更対象の同定)、component-inventory(既存コンポーネントとの重複回避 — Reuse Inventory 節)。stories / team-practices は optional consume 不存在(user-stories SKIP / practices-discovery SKIP)。

測定 ref: file:line は observed `63e69d922`。

## コンポーネント一覧(規模見積り付き)

| ID | コンポーネント | 種別 | 対応 FR | 推定規模(実装+テスト行) |
|---|---|---|---|---|
| C1 | release-dist-build(asset 生成: tar + SHA256SUMS + manifest を作る packaging スクリプト+release.yml `build-dist` ジョブ) | 新規 | FR-1 | 250+250 |
| C2 | installer asset 経路(resolved-version-factory の版境界分岐 / payload-factory の locate 2段 fallback / http の ALLOWED_HOSTS 拡張 / checksum 検証) | 既存改修 | FR-2 | 200+350 |
| C3 | hook 単一ディスパッチャ(追跡 dispatcher 1ファイル+settings.json テンプレートの11参照書換) | 新規+改修 | FR-3.2 | 80+120 |
| C4 | AGENTS.md import 分離(composeRootAgents 廃止 → 生成 suffix の `.agents/` 配下ファイル化+PROJECT_INSTRUCTIONS 正本移設) | 既存改修 | FR-3.3 | 120+150 |
| C5 | allowlist 正本データ+整合テスト(preserved の import 化、.gitignore / .gitattributes drift テスト) | 新規 | FR-5.2/5.3 | 100+200 |
| C6 | scope 正本昇格(self-* 4 + installer-distribution を core/scopes へ、grid 15キー化、self-scope-consistency センサー追随) | 既存改修 | FR-0 | 60+150 |
| C7 | CI 再設計(build 前段ジョブ、再現性比較への置換、第3ガード再定義、境界ガード、detect-ci-changes 改訂、run-tests 入口ガード) | 既存改修 | FR-4 | 200+250 |
| C8 | promote-self 再責務化(mirror drift guard → ローカル self-install 生成。check の意味変更) | 既存改修 | FR-5.4 | 150+200 |
| C9 | 追跡除外+文書+ノルム(.gitignore 反転、README/CONTRIBUTING/AGENTS.md:90 等、ノルム PR 5点) | 既存改修 | FR-5.1/FR-6 | 300(文書中心) |

規模注記: 数値は行数見積り(コード+テスト)。C9 は文書行が主で、ノルム PR は別 PR(norm-changes-via-pr)のため実装 PR 規模に含めない。

## Reuse Inventory(再利用棚卸し)

component-inventory.md の既存資産と突き合わせ、新規機構は既存で代替不能なもののみ導入する。

| 既存資産 | 再利用先 | 新設を避けた理由 |
|---|---|---|
| `scripts/package.ts` の buildTree / checkHarness(:698 — temp build 内蔵) | C1 の tar 素材生成、C7 の再現性比較(2回 build) | build 機構は既存を呼ぶだけ — 新規ビルダーを発明しない(requirements A-3) |
| `scripts/promote-self.ts:357` の再帰 build 呼び出し | C8 のローカル生成モード | 生成経路の再配線で足りる |
| `resolveWrapperDir`(payload-factory.ts:12) | C2 — 無改修で両経路処理(G6 の codeload 同一 wrapper 契約) | wrapper 契約を揃えたため分岐不要 |
| softprops/action-gh-release(release.yml:154、pin 済み) | C1 の asset 添付(`files:` 入力追加) | 新 action を導入しない |
| `scopeGridInSync`(promote-self.ts:132)と t370 | C6 の grid 昇格検証 | 比較器は既存を流用し、期待値側だけ15キーへ |
| tests/run-tests.sh の既存4層ランナー | C7 の入口ガード挿入点 | ランナー新設なし |
| self-scope-consistency センサー(core/sensors 正本) | C6 のパリティ検証 | 検査機構は既存拡張 |

## 変更しないもの(境界の明示)

- ランタイム(engine / state / hooks の挙動)、ハーネス出力内容 — requirements Out of Scope に従う
- テスト本体の dist 参照 423 ファイル(G4 — 出荷面検証として維持)
- per-user ランタイム第3カテゴリ(COMPOSED_SCOPE_RE / PLUGIN_ENGINE_STATE_RE 系 carve-out — promote-self.ts:124/:178-179)は全コンポーネントで不可侵

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T17:54:32Z
- **Iteration:** 1
- **Scope decision:** none

境界ガード(FR-4.5)の有効化時期が追跡除外前で自己矛盾(Critical)。全 ADR の Reversibility 欠落と移行期間の手編集検出空白(Major 2)、manifest⇔tar 整合検査不在(Minor)

### Findings

- Critical: C7 境界ガードが順序3配置のまま dist/** を対象に含み、追跡除外(順序5)まで CI 恒久赤 — 二段階分割と有効化条件の明記が必要
- Major: decisions.md 全9 ADR に Reversibility assessment 欠落(ステージ契約 :115)
- Major: 順序3〜5 の間、dist 手編集検出の空白期間 — 旧 check 並存か受容根拠の明記が必要
- Minor: manifest.harnesses と tar 実体の意味的整合が無検証

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T17:54:32Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の4指摘(C7 二段階再設計・Reversibility 全9件・ADR-A8 並存条項・C1 self-check)の着地を実読確認、3成果物間の相互整合と退行なしを検証。Minor(ADR 表記統一)は conductor が是正済み

### Findings

- 閉包確認: Critical/Major/Minor 全4件の是正が成果物へ着地、新規矛盾なし
- Minor: component-methods.md の ADR-N 短縮表記 — ADR-AN へ統一是正済み
