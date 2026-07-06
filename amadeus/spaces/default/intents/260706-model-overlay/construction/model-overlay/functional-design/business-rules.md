# Business Rules — model-overlay

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 適用と対象範囲

- BR-1: overlay に宣言のない agent の modelOverride には一切触れない（FR-2.1）。適用・--check・parity 正規化のすべてで対象は宣言 agent に限る。
- BR-2: 宣言・base 記録・書き換えは適用スクリプトの同一実行内で不可分に行う。base 未記録の宣言を parity が見た場合は正規化せず通常比較 + 明示ヒント（FR-1.4。無言の誤 pass / 誤 fail 禁止）。
- BR-3: fallback は `--use-fallback --reason` の明示実行でのみ発動し、発動記録（対象・降格先・理由）を overlay 設定に残す（FR-4.1/4.2）。自動検知はしない。

## 逆変換と drift 対応

- BR-4: parity の正規化は modelOverride 行の値置換 1 点に閉じる（FR-3.1）。それ以外の乖離（persona 本文の変更等）は従来どおり検出される。engineFileExceptions へ agent 定義ファイルを追加しない（Q1 合意）。
- BR-5: 変換の可逆性は採用前に機械検証する（revert(apply(x)) == x の byte 一致。engineer1 の #553 写像規律、engineer5/engineer2 の条件）。
- BR-6: 上流同期後の手順は「parity:check（乖離確認）→ models:apply（再適用）」の順序で記し、apply 先行時も管理外実値の拒否（--accept-upstream-base なしでは base 不変）で drift を握りつぶさない。手順 1 行は、上流同期作業の手順が記される場所（AGENTS.md の運用注意または docs/amadeus の該当手順文書。code-generation で実在の置き場を確認して 1 箇所に記す）へ残す（FR-2.3、leader 条件）。
- BR-9: 逆変換正規化の置換はトークン一致（管理値集合 `{model} ∪ {fallbacks[model]}` に一致する場合のみ base へ置換）とし、位置的な無条件置換にしない（乖離検出の成立条件）。
- BR-10: apply は管理外の実値を検出したら base を自動更新せず拒否する。base の更新は `--accept-upstream-base` の明示操作だけが行う。
- BR-12（FR-3.2 からの逸脱の明記）: requirements.md FR-3.2 の「apply は毎回 base を最新の実値で記録し直す」という機構描写は採用しない。reviewer 懸念（自動再記録が drift を握りつぶす）を踏まえ、BR-10 の方式（bootstrap 時のみ記録、以降の更新は `--accept-upstream-base` のみ）に置き換える。FR-3.2 が要求する結果（上流 drift 時に parity が fail する）は BR-9/BR-10 で満たされ、Q1 の合意事項（parity が正しく fail すること）とも整合する。承認済み requirements.md は書き換えず、この逸脱は memory.md の Deviations と gate 承認で確定する。

## 配置と fail-open

- BR-7: doctor の overlay 読み取りは任意・fail-open とし、ファイル不在だけでなく JSON 破損・権限エラー等の全失敗モードを try/catch で無害化（検査スキップ）して、エンジンの動作を dev-scripts の存在に依存させない（依存方向規則との整合）。gate 承認条件（2026-07-06 決定記録）: ファイル不在は静かにスキップしてよいが、読み取り失敗（JSON 破損・権限エラー等）の catch 経路は完全な無言にせず「overlay state unknown」等の 1 行を doctor 出力に残す（無言の失敗禁止）。
- BR-8: overlay 機構の新規ファイル（設定・適用スクリプト・eval）は parity 対象外の置き場（dev-scripts/）に置き、配布物に含めない（FR-1.3）。
- BR-11: FR-1.3（配布物に含めない）は installer の許可リスト方式で構造的に担保される見込みだが、code-generation で installer の MANIFEST を実測確認し、必要なら eval に 1 検査を足す。
