# Business Overview — 260705-rulesdir-resolve

上流入力: [Issue #491](https://github.com/amadeus-dlc/amadeus/issues/491)

## 対象の業務文脈

Amadeus エンジンの stage graph compile は、各 stage が実行時に参照する method rules（org / team / project / phase）を rules_in_context として graph へ焼き込む。
この解決が壊れると、全 stage の実行時 rules 供給が無音で止まる（PR #489 で実発生）。

## スキャン範囲の判断

bugfix scope の focused scan として、対象を rules 解決経路（rulesDir → loadRules → compile の焼き込み）に限定する。
