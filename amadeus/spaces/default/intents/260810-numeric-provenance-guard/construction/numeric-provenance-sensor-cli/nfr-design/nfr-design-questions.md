# NFR Design Questions — numeric-provenance-sensor-cli

本UnitのNFR Requirements成果物はscopeによりabsent-and-expectedであり、宣言済みNFR設計IDは存在しない。唯一のpresent consumeである `business-logic-model.md` のpure evaluator、single-pass、verdict境界を具体化する。

## Q1. Performance model

100KB性能予算をsingle-pass indexed regionとclaimごとの全文再走査のどちらで守るか。

[Answer]: E-NFRDU2-1 `single-pass-indexed-regions`。読込後1回のline traversalでregion、claim、provenance indexを作り、各claimは同一regionのbounded scopeだけを参照する。自動裁定: `auto-decision-a08a42f91dc661d11a8e4469e6bb1d25`。

## Q2. Filesystem security boundary

relative linkの実在確認をroot-awareな注入capabilityとraw filesystem accessのどちらで提供するか。

[Answer]: E-NFRDU2-2 `root-aware-injected-capabilities`。Evaluatorは `fileExists` / `isRegularFile` だけを受け、production closureがcanonical realpath containmentとregular-file条件を満たすときだけtrueを返す。自動裁定: `auto-decision-a61409b807dc12667acffb7e3cd67ffb`。

## Q3. Failure taxonomy

業務上の判定不能とprocess起動不能をtyped verdictと例外channelに分けるか、単一例外channelに統合するか。

[Answer]: E-NFRDU2-3 `typed-verdict-vs-startup-failure`。missing/cutoff/対象外/unmappedはpass+skipped verdict、provenance欠落は通常FAILED verdict、flag不足・mapping破損・ENOENT以外の読込不能だけをstartup failureとする。自動裁定: `auto-decision-df6a857ccedacc412b9669ae3f24632c`。

## Q4. Scale model

複数成果物へのscaleをstateless per invocationと共有cross-process cacheのどちらで担保するか。

[Answer]: E-NFRDU2-4 `stateless-per-invocation`。1process=1成果物で状態共有せず、既存dispatcherが必要な呼出数を所有する。cross-process cache、queue、database、autoscaling resourceを追加しない。自動裁定: `auto-decision-33b121cb07f117fff9dba87ee052e7e1`。

## 対話方式

[Answer]: E-NFRDU2-0 `guide`。performance、filesystem boundary、failure taxonomy、scale modelの順に裁定した。自動裁定: `auto-decision-6f3ddcc5282c7f6f1717cabb96f421e6`。

## 曖昧性分析

- NFR Requirements欠落はscope上の正常状態であり、新しいPERF/SEC/REL/SCALE IDは発行しない。
- performance予算は既存requirements由来であり、本段階で閾値を変更しない。
- scalabilityはcloud水平scaleではなく、statelessな短命processを既存dispatcherが成果物単位で起動できる性質を指す。
- reliabilityのfail-openは通常verdictだけに適用し、mapping schema破損などprogram起動不能を隠さない。
- AWS、network、database、UI、long-running serviceは非該当である。
