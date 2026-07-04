# Functional Design Questions: U001-failure-evidence-foundation

## 上流文脈

この functional-design-questions は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`、`bolt-plan` を入力として作成する。

U001 は `ERROR_LOGGED`、hook drop doctor、OpenTelemetry core 計装、doctor composition、shared contracts を同じ walking skeleton として扱う。

`skills/` は配布物境界であり、この Unit では直接編集しない。

collector、dashboard、cloud export、always-on network export は設計対象外である。

## Questions

### Q1. Error Audit の責務境界

`ERROR_LOGGED` を記録する境界はどこに置きますか。

A. `aidlc-orchestrate.ts` の各分岐に直接記録処理を埋め込む。

B. `aidlc-state.ts` に記録処理を寄せ、orchestrate から state tool を呼ぶ。

C. audit writer に直接 fields を渡し、command ごとに fields を組み立てる。

D. top-level catch だけを記録し、error directive は既存 JSON に任せる。

E. 推奨: Error Audit adapter を作り、error directive と top-level catch の両方を `recordErrorDirective` と `recordTopLevelCatch` 経由で `ERROR_LOGGED` にする。

X. Other (please specify)

[Answer]: E

### Q2. stdout JSON 契約の保護

telemetry と error audit を入れるとき、stdout JSON 契約をどう守りますか。

A. command 側で都度 `console.error` と `console.log` の使い分けをレビューする。

B. telemetry failure は握りつぶし、audit failure は stdout に警告を書く。

C. JSON command だけ telemetry を無効化する。

D. JSON parse test は後続の build-and-test に任せる。

E. 推奨: `JsonStdoutContract` と adapter 境界で stdout 書き込みを禁止し、error audit、telemetry failure は result と stderr または audit evidence に閉じ、JSON parse test を設計条件にする。

X. Other (please specify)

[Answer]: E

### Q3. OpenTelemetry core 計装の最小設計

OpenTelemetry core 計装はどの粒度で設計しますか。

A. command span だけを入れ、metrics と error span は後続に回す。

B. doctor metrics だけを入れ、trace は後続に回す。

C. collector exporter を既定で設定できるところまで含める。

D. OpenTelemetry は全面的に後続 Intent へ送る。

E. 推奨: no-op default の Telemetry Facade を作り、command span、error span、directive/report span、doctor metrics、test exporter seam までを core に含める。

X. Other (please specify)

[Answer]: E

### Q4. Hook Drop Doctor の表示モデル

`.aidlc-hooks-health/*.drops` は doctor でどう表示しますか。

A. raw file path と raw line をそのまま標準出力に出す。

B. hook name と drop count だけを出し、理由や時刻は省く。

C. malformed file は doctor を fail させる。

D. verbose だけで表示し、標準表示には含めない。

E. 推奨: 標準表示は hook name、drop count、latest timestamp、latest reason に絞り、full history と malformed detail は verbose detail または warning finding に分ける。

X. Other (please specify)

[Answer]: E

### Q5. Walking Skeleton の検証単位

B001 の walking skeleton は何を同時に証明しますか。

A. `ERROR_LOGGED` だけを先に証明する。

B. hook drop doctor だけを先に証明する。

C. OpenTelemetry no-op default だけを先に証明する。

D. 全 doctor warning と PR readiness まで一気に証明する。

E. 推奨: error directive と top-level catch の `ERROR_LOGGED`、hook drop doctor、OpenTelemetry no-op default no-send、test exporter seam、stdout JSON parse を同じ縦断 slice で証明する。

X. Other (please specify)

[Answer]: E
