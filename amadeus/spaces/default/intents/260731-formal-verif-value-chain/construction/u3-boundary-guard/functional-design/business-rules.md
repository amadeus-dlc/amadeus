# Business Rules — u3-boundary-guard

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## BR-U3-1: TDD 必須

新設ガードのため TDD 既定(NFR-2)。Red(fixture 注入で赤の実測)→ 最小実装 → Green。加えて corpus sweep の両側実測(components.md C6 / NFR-5)。

## BR-U3-2: t258 への無変更

既存 t258(tests/lib/boundary-guard.ts)の SCAN_ROOTS・許容リストには触れない(services.md の CI 面契約: 新設テストは既存プロファイルへ追加のみ)。t377 は独立ファイルで、共有 lib を再利用する場合も既存挙動を変えない(component-methods.md の C6 面 — 既習様式の再利用)。

## BR-U3-3: 検査面の禁止語彙は正準トークンのみ

検査は `scripts/` のパス参照トークンに限定し、説明散文・コメント内の語は対象(違反)として扱う — 配布物に repo-only パスが書かれていること自体が欠陥のため、散文例外は設けない。例外が必要になった場合は許容リスト+理由必須で明示化(fail-closed 既定)。

## BR-U3-4: 検証コマンド集合

BR-U1-6 と同一+t377 単体の実行確認。落ちる実証の注入は fixture 面で行い、実配布物への一時注入はしない(承認待ち PR への注入混入リスク回避 — falling-proof-injection-one-set の別ブランチ推奨面)。
