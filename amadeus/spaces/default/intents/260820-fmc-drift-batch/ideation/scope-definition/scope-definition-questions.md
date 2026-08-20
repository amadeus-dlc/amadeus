# Scope Definition — 質問と裁定

Intent: 260820-fmc-drift-batch / Depth: Standard(予算 最大8問、本ステージは operational 3問で構成)
回答モード: Intent Autonomy `full` — 各質問は `amadeus-bolt decide-question` 梯子で裁定し、provenance を併記する。
承認エビデンス: full autonomy grant は 2026-08-20T07:18:02Z にユーザー承認済み(grant_id intent-grant-79f28345c4f20469c2ec87c6a12aeffa)。以下の各 [Answer] はこの grant 下の AUTO_DECIDED 裁定。

## 確定済み境界(scope-boundary 質問を省略する理由)

capability inventory は上流(`intent-statement.md` の Success Metrics、各 Issue のクロスレビュー成立済み期待結果、#3187 ユーザー裁定コメント)で全件 SETTLED のため、scope-boundary 質問(MVS・must/nice)は提示しない:

1. **C-3186a 語彙 drift 検出の腕** — SETTLED(#3186 期待結果1、クロスレビュー改訂 2026-08-18)
2. **C-3186b 欠陥再発トリガの腕** — SETTLED(#3186 期待結果、同上)
3. **C-2289 revise-model の replace-by-name 登録**(+ 不在名 fail-open の cross-check 閉鎖、t448 再スコープ)— SETTLED(#2289 + XR-260820-2289 refinement)
4. **C-2929 実装境界の3面同時是正**(validator `IMPLEMENTATION_PATHS` / loader `implementationRoot` / sensor `matches` glob、PR系2モデルの plugin 実装 pin、validator/loader 述語統一)— SETTLED(#2929 + XR-260820-2929 refinement、Q3=C 裁定 auto-decision-f7655e00)
5. **C-3187 advisory authoring-hold 経路の完全退役**(plugin.json 宣言・コード・t528 同一変更、後方互換ゼロ)— SETTLED(ユーザー裁定 2026-08-20)

スコープ外(SETTLED-out): #3246(別 intent、ユーザー裁定済み)、t448 自己参照比較 bug(起票のみ — intent-capture Q3=C)。

## Q1: capability 間の依存関係はどう固定するか?(operational)

- A. ファイル所有権実測に基づく最小依存: C-3187(tla-authoring.ts の advisory 面削除)→ C-3186(同ファイル群の適用性判定拡張)の順序依存のみを置き、C-2289 / C-2929 は独立並列。C-3186 の drift 検出は C-2929 の境界拡張成果を消費できるが、実装自体は非依存(検出の腕は model-map の現行語彙でも機能)
- B. 閉ループ順の直列依存: C-2929 → C-2289 → C-3186 → C-3187(検知→commit→トリガ→退役)
- C. 依存なし(4件完全独立、競合はマージ時解決)
- X. Other (please specify)

[Answer]: A — C-3187 と C-3186 は `plugins/formal-model-check/tools/tla-authoring.ts` を共有する(advisoryHold/defaultSubjectsPath の削除と適用性判定の呼び出し面)。同一ファイルの並行変更は worktree 隔離下で必ず競合するため、この1本だけ順序依存にし、他は独立並列。B は並列性を不要に殺し、C は既知の競合を無視する。(AUTO_DECIDED auto-decision-ef05a122e77e54f932f50cf45207012e, 2026-08-20T07:30:30Z)

## Q2: シーケンシング方針は?(operational)

- A. dependency-first + 最大並列: Bolt 1 = walking-skeleton 対象(self-feature の ALWAYS ゲート)を最小の end-to-end スライスに置き、以後 C-2289 / C-2929 / C-3187 を並列 Bolt、C-3186 を C-3187 後続に
- B. value-first: #3186(本丸)を最初に単独実装し、残りを後続
- C. risk-first: 最も不確実な C-2929(3面同時是正)を先行single、成立を見てから残り
- X. Other (please specify)

[Answer]: A — ユーザー指示「並列実装可能性を意識して」に整合。walking-skeleton は self-feature の Mandated ゲート(project.md「active scope が self-feature なら…最初の Construction Bolt に walking-skeleton gate を維持する」)であり、Bolt 1 の中身は units-generation / delivery-planning で確定する。(AUTO_DECIDED auto-decision-5251a7ace11a9f729a0cbd62ced1f667, 2026-08-20T07:30:30Z)

## Q3: 特定 capability に紐づくハードデッドラインはあるか?(operational)

- A. なし — 期限制約は存在しない(品質ゲートと CI green が唯一の出荷条件)
- B. あり(具体を X で指定)
- X. Other (please specify)

[Answer]: A — ユーザー指示・Issue・record のいずれにも期限は宣言されていない。(AUTO_DECIDED auto-decision-4704ce7555fe5067edc79fbb0cd44672, 2026-08-20T07:30:30Z)
