# Code Generation Plan — U3 exception(Bolt 2b)

上流入力(consumes 全数): functional-design 3成果物、nfr-design 5成果物、requirements.md FR-EXC-1〜4 — redactStacktrace の string 戻り契約・write-time 層の recordException 内限定(ADR-4)・path マスク3分類を FD から、線形性実測義務(regex-linearity-untrusted-input)を nfr-design から導出。

## 実行形態

gated swarm batch 2(worktree `bolt-exception`)。TDD 必須・PR 1本・NFR-4 同一変更。

## スライス計画(実績)

1. redactStacktrace(Red: export 不在 → Green: 12 pass)— 単一文字クラス×単一量指定子・マーカー再認識で冪等
2. recordException 拡張+registry optional 2属性(Red: 5 fail → Green: 8 pass)
3. 線形性 fixture は判別力を scratch 実証してから採用(対照の入れ子量指定子は n=24 で指数、shipped は線形)
4. allowlist 行ピンの機械 remap(c1-allowlist-mechanical-remap 準拠+直読照合)

## 逸脱

なし(builder 申告どおり、独立レビューでも無申告逸脱ゼロを確認)。t145 フレークの申し送りは #1906 起票で処理。
