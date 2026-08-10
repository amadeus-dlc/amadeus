# Functional Design Questions — attribution-domain-contracts

## 質問方針

Depth Standardの総質問予算は最大8問である。semi autonomyの質問モードは`Guide me`（AUTO_DECIDED `auto-decision-d32232d75463e2c79834b61ebcb66e9a`）となった。

上流入力は `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` である。U-01のclosed vocabulary、smart constructor、typed error、primary precedence、file/test ownershipはすべて承認済みで、Functional Designで公開contractを変える未決事項はない。

## Material questions

0件。Constructionの質問はexceptional useであり、Application DesignのC-02 contractとADR-003、Units GenerationのU-01を再質問しない。

## 継承する裁定

- class-free TypeScriptのreadonly type alias、brand、判別union、`AttributionResult`を使う。
- invalid stage/outlier/intervalはsmart constructorでtyped `err`へ変換する。
- `CandidateRejectionReason`はclosed vocabularyと固定precedenceを持つ。
- `accounting-invariant`はcandidate rejectionと分離し、正常reportを返さない。
- filesystem、journal decode、interval algorithm、rendererをU-01へ持ち込まない。

## Ambiguity analysis

識別子の微修正は`component-methods.md`で許容されるが、本artifactでは上流名をそのまま採用する。責務、依存方向、reason vocabulary、error category、measured/attribution境界に曖昧さや矛盾はない。
