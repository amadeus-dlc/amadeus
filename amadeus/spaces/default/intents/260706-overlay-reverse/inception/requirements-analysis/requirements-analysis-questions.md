# Requirements Analysis Questions — 260706-overlay-reverse（Issue #579）

上流参照: 本 questions は [requirements.md](requirements.md) の前提実測に基づく。前提実測は codekb の [business-overview.md](../../../../codekb/amadeus/business-overview.md)（インストーラ = 唯一の配布手段という製品位置づけ）、[architecture.md](../../../../codekb/amadeus/architecture.md)（model overlay 行 = #554 の管理値集合と逆変換の意味論）、[code-structure.md](../../../../codekb/amadeus/code-structure.md)（scripts/ 行 = #543 後のインストーラ構成）を出典とする。判定はいずれも bugfix scope の小さな構造判断であり、ピア協議にかけず担当 engineer の自己判断で進め、gate の人間承認で確定する（team.md の質問プロトコル運用細目）。

## Q1: 逆変換ロジックの実装方式

流用元の調査結果: `parity-check.ts` の `normalizeModelOverlay` は非 export だが、それが依存する `readModelOverrideLine` / `setModelOverrideLine` は `dev-scripts/apply-model-overrides.ts`（76・82 行目）で **export 済み** であり、`parity-check.ts` 自身が import して使い（30 行目）、`dev-scripts/evals/model-overlay/check.ts` が直接単体テストしている。`apply-model-overrides.ts` は `import.meta.main` guard（219 行目）を持ち、import 副作用はない（#507 の import 副作用回帰検査の対象でもある）。

- A: export 済みの `readModelOverrideLine` / `setModelOverrideLine` を import し、管理値集合の判定（`managedValues` 相当、実測 3 行）だけを installer 内に書く（行パース・置換の重複ゼロ。overlay 意味論の正は #554 側に残る）
- B: installer 内に約 30 行で全て最小再実装する（重複が生まれ、#554 側の行仕様変更に置いていかれる）
- C: `parity-check.ts` の `normalizeModelOverlay` へ export を追加して import する（parity 検査器を配布経路の実行時依存にする形になり、責務が混ざる）

[Answer]: A

採用理由: 行のパース・置換という壊れやすい部分は export 済み・テスト済みの実装を使い、重複を作らない（dev-scripts.md の方針、Simplicity First）。installer から `dev-scripts/apply-model-overrides.ts` を import する形は、installer が source checkout（この repo）から実行される単体スクリプトであることと矛盾しない（配布先へ dev-scripts を持ち込むわけではない。parity-check.ts 自身が同じ import をしている前例に一致）。「repo の開発用スクリプトを skill の実行時依存にしない」原則（project.md）の対象は skill であり、installer（scripts/）は該当しない。初稿の B 採用はこの export 済み再利用面の見落としによるもので、§12a 反復 1 の指摘で A へ確定した。

## Q2: base 未記録・管理外値のときの挙動

- A: 置換せずそのままコピーする（#554 parity と同じ保守則。無言の改変をしない）
- B: install を abort する

[Answer]: A

採用理由: overlay は任意機構で、installer の責務は配布の収束である。parity 検査（fail させる側）と installer（fail-open で写す側）の役割分担は #554 の設計（doctor = 警告、parity = fail、apply = 書換）と一貫する。FR-1.2 / FR-1.3 に反映済み。overlay 宣言ファイル自体が不在・読取不能の場合の残存リスク（fable が焼き込まれた md がそのまま配布される）は requirements.md の FR-1.3 に明記し、この分岐固有の eval（FR-4.1）で挙動を固定する。
