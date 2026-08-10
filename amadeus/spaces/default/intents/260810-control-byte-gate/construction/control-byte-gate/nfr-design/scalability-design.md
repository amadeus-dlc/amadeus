# Scalability Design — control-byte-gate(Issue #2814)

上流入力(consumes 全数): business-logic-model.md(処理フロー7段と in-process seam — 本設計の対象面)。条件解決で除外された consumes: nfr-requirements 系5成果物(performance/security/scalability/reliability/tech-stack)— self-feature スコープで nfr-requirements ステージが SKIP のため不在(設計上の期待どおり)。NFR の正本は requirements.md の NFR-1〜4 を用いる。

## スケール軸と設計(NFR-1 決定性・NFR-4 依存ゼロの拘束下)

- 唯一のスケール軸はコーパスサイズ(tracked ファイル数×平均サイズ)。線形 O(総バイト数)の単一パス走査で、コーパスが現状の数倍でも 30s 予算内(performance-design.md の実測条項で監視)。
- horizontal scaling・シャーディングは非適用(単発 CLI — cid:nfr-design:c1)。コーパスが桁で成長し timeout に接近した場合の将来手段(並行読取)は performance-design.md の再訪条項に委ねる。

## allowlist のスケール

- エントリ増加(正当バイナリの追加)は線形照合のまま問題にならない規模(現時点1件)。件数が増えたら台帳ファイルへ抽出可能(ADR-2 Reversibility)。
