# Deterministic question compiler

This module compiles a deliberately small question grammar into typed data without an LLM:

```text
question text -> deterministic parser -> question AST -> Zod boundary -> resolver -> typed answer
```

The important result is not that every English question can be parsed. It is that the system never
uses a closed answer schema as evidence that it understood the question. A compile result is one of:

- `compiled`: one supported syntax produced a validated AST and answer contract;
- `needs-clarification`: the syntax exposes a known semantic fork; or
- `unsupported`: the deterministic grammar cannot justify a decomposition.

## Supported v0 grammar

- Boolean: `Is the build reproducible?`
- Cardinality: `How many pages are in the frozen arena?`
- Definition: `Define [semantic perplexity]`
- Closed choice: `Which of [silent | rubber duck | Socratic why] minimizes held-out log loss?`
- Conditional prefix: `Given the snapshot hash matches, is the graph frozen?`

Resolvers are ordinary functions. They receive a validated AST and may return a typed answer or
remain unresolved. The answer validator rejects a string such as `"yes"` for a boolean contract and
rejects a choice outside the declared option set.

Natural-language `What is/are ...?` is intentionally not treated as a definition. It can request a
definition, identity, lookup, or collection; v0 asks for clarification instead. Reserved words can
be mentioned literally by quoting them, as in `Does this contain the word "or"?`.

## Why the Zeno question does not compile

`How many infinities will it take me to cross?` asks the parser to treat infinity as a countable or
traversable unit. In this context infinity is already a cardinality class. The compiler therefore
returns `needs-clarification` and offers three distinct repairs: ask for the cardinality of the
points, ask for a physical measure such as distance or duration, or explicitly define the set of
cardinalities being counted. A yes/no or integer slot would not resolve that category choice.

## What Zod and Dafny establish

Zod validates the runtime AST and answer shapes. The dedicated abstract Dafny model proves that any accepted
answer has the same answer kind as its contract, and that accepted closed-choice values belong to
the declared option set. Run it with:

```text
dafny verify src/verification/question-compiler.dfy
```

The core workflow installs the packaged Dafny 4.10.0 release before running this command. A
`.NET` global-tool installation that omits Z3 must be given the matching solver through Dafny's
`--solver-path`; an unavailable solver is a failed or unavailable proof run, never a verification.

Those are structural theorems. Neither tool proves that an English parse matches the speaker's
intent or that a resolver knows the world correctly. Parser correctness needs a formal grammar and
semantics; if that becomes the research target, Lean is a good next proof layer. The current Dafny
proof keeps the first executable claim small and locally checkable.

The legacy code-transformation AST and Dafny actors are not in this trust path. In particular, a
fallback or unavailable prover must never be represented as successful verification.

## Query-language direction

The v0 question AST demonstrates the trust boundary; it is not intended to become the permanent
reasoning language. The durable intermediate representation should be a typed,
ontology-mediated conjunctive-query algebra:

- `ASK` produces an entailment status (`entailed`, `contradicted`, `unknown`, or `inconsistent`);
- `SELECT` produces a relation with named, typed columns;
- `COUNT` produces a cardinality;
- `DESCRIBE` produces an entity or definition record; and
- `EXPLAIN` produces an answer receipt containing a derivation graph.

A surface question should normalize to explicit variables, entities, predicate atoms, projection,
and aggregation against a versioned vocabulary. This is where decomposition belongs. Grammar and
lexicon determine whether a parse is licensed; the answer type does not. If more than one query is
licensed, the compiler should preserve a parse forest or return `needs-clarification` rather than
selecting one by confidence.

For the first data-backed implementation, use the OWL 2 QL / DL-Lite fragment as the ontology
boundary. Its useful engineering property is first-order rewritability: ontology-mediated
conjunctive queries can be expanded into ordinary relational queries and executed by a database.
This keeps the fast path deterministic and makes the TBox (concept and relation rules) distinct
from the ABox (instance data). Ontop is a mature reference for this virtual-knowledge-graph design.

Use SHACL-shaped constraints for vocabulary and data diagnostics, not as a substitute for query
semantics. SPARQL 1.1 is a viable interchange/backend syntax; SPARQL 1.2 remains a draft, so the
internal IR should not depend on its new features. If recursive rules later become necessary, add a
Datalog backend deliberately and record that this gives up some of the simple SQL-rewriting
boundary.

The semantic regime belongs in the contract. Under open-world semantics, failure to prove an ASK
query is `unknown`, not `false`. A COUNT must declare set versus bag behavior, distinctness, the
closed or complete scope being counted, and whether its value is exact or only a lower bound. The
v0 boolean and cardinality shapes are ordinary resolver contracts, not yet OWL entailment or
ontology-mediated aggregate semantics.

An Evonne-inspired answer receipt should contain the exact ontology and data snapshot, rewritten
query, chosen reasoner, derivation/proof DAG, minimal justification, and—when a query fails or is
inconsistent—a diagnosis with possible repairs. Evonne is useful here as an explanation-interface
reference. It is not an English question parser or a replacement for the compiler.

This yields three independent claims:

1. the compiler licensed a particular query from the supplied syntax and vocabulary;
2. the resolver derived an answer from a named ontology and data snapshot; and
3. the answer conforms to its output contract.

No one of these claims should be used as evidence for either of the others.

## BREAK / QDMR as a parallel control

BREAK supplies more than 83,000 questions paired with Question Decomposition Meaning
Representations (QDMRs). A QDMR is an ordered, backward-referencing program over operators such as
select, project, filter, aggregate, group, comparison, union, intersection, boolean, and arithmetic.
The published work also maps QDMR deterministically to a pseudo-SQL representation. That makes it a
useful intermediate control between raw questions and Carmack's ontology-backed query IR.

The first decomposition experiment should freeze a BREAK evaluation slice and compare:

1. direct question-to-answer execution with no decomposition;
2. the current answer-shape AST;
3. a deterministic or predicted QDMR followed by the same executor;
4. gold QDMR followed by that executor, as a decomposition upper bound;
5. typed conjunctive-query IR followed by the same executor; and
6. damaged controls: shuffled step dependencies, type-invalid operators, and plausible but
   semantically changed decompositions.

All executable lanes must share data, resolver, output contract, and answer scorer. Report answer
accuracy separately from QDMR structural match, executability, type failures, ambiguity/abstention,
latency, and provenance completeness. The damaged controls matter: if they perform like the gold
decomposition, the executor is ignoring the proposed reasoning structure.

QDMR and the ontology query IR are complementary. QDMR is a source-agnostic procedural sketch that
is especially useful for testing decomposition. The conjunctive-query IR fixes predicates,
variables, ontology semantics, and executable provenance. A QDMR step should therefore lower into
the typed query algebra when possible and remain explicitly unsupported when it cannot.

## References

- [DL-Lite: Tractable Description Logics for Ontologies](https://link.springer.com/article/10.1007/s10817-007-9078-x)
- [OWL 2 QL profile](https://www.w3.org/TR/owl2-profiles/#OWL_2_QL)
- [Ontop virtual knowledge graph system](https://ontop-vkg.org/guide/)
- [SPARQL 1.1 overview](https://www.w3.org/TR/sparql11-overview/)
- [SHACL Recommendation](https://www.w3.org/TR/shacl/)
- [Evonne documentation](https://imldresden.github.io/evonne/)
- [BREAK / QDMR paper and resources](https://aclanthology.org/2020.tacl-1.13/)

## Run

```text
bun run question -- "Is the build reproducible?"
bun test test/question-compiler/compiler.test.ts
bun run type-check:question
bun run question:demo
bun run question:verify
```
