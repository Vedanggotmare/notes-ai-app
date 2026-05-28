import type { Note } from './types'

function d(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

// IDs for cross-note connections
const IDS = {
  homology1:    'seed-homology-1',
  homology2:    'seed-homology-2',
  subjlogic1:   'seed-subjlogic-1',
  subjlogic2:   'seed-subjlogic-2',
  consciousness1:'seed-consciousness-1',
  consciousness2:'seed-consciousness-2',
  phenomenology1:'seed-phenomenology-1',
  phenomenology2:'seed-phenomenology-2',
  aigdp1:       'seed-aigdp-1',
  aigdp2:       'seed-aigdp-2',
  lqi1:         'seed-lqi-1',
  lqi2:         'seed-lqi-2',
  gametheory1:  'seed-gametheory-1',
  gametheory2:  'seed-gametheory-2',
  categoryth1:  'seed-categoryth-1',
  categoryth2:  'seed-categoryth-2',
  bayesian1:    'seed-bayesian-1',
  bayesian2:    'seed-bayesian-2',
  postagi1:     'seed-postagi-1',
  postagi2:     'seed-postagi-2',
}

export const SEED_NOTES: Note[] = [

  // ── 1. ALGEBRAIC TOPOLOGY & HOMOLOGY ──────────────────────────────────────
  {
    id: IDS.homology1,
    title: 'Introduction to Homology Groups',
    content: `Homology theory is one of the central tools of algebraic topology. It assigns a sequence of abelian groups H₀(X), H₁(X), H₂(X), … to a topological space X, where Hₙ(X) captures n-dimensional "holes."

H₀ counts connected components. H₁ counts independent loops (1-cycles not bounding a disk). H₂ counts enclosed voids (2-cycles not bounding a solid). Each Hₙ is a topological invariant — homeomorphic spaces share identical homology groups.

The construction uses chain complexes: free abelian groups Cₙ of n-simplices linked by boundary operators ∂ₙ: Cₙ → Cₙ₋₁ satisfying ∂²= 0. The homology group is then Hₙ = ker(∂ₙ) / im(∂ₙ₊₁) — cycles modulo boundaries.

Key examples:
• S¹ (circle): H₀ = ℤ, H₁ = ℤ, Hₙ = 0 for n ≥ 2
• T² (torus): H₀ = ℤ, H₁ = ℤ², H₂ = ℤ
• ℝP² (real projective plane): H₁ = ℤ/2ℤ (torsion!)

Homology is computable — unlike homotopy groups — and is functorial: a continuous map f: X → Y induces group homomorphisms f*: Hₙ(X) → Hₙ(Y).`,
    categories: ['Mathematics', 'Science'],
    tags: ['topology', 'homology', 'algebra', 'algebraic-topology'],
    notebook: 'default',
    createdAt: d(14),
    updatedAt: d(12),
    connections: [IDS.homology2, IDS.categoryth1],
  },
  {
    id: IDS.homology2,
    title: 'Persistent Homology in Data Analysis',
    content: `Persistent homology bridges algebraic topology and data science. Given a point cloud, we construct a filtered simplicial complex (e.g. Vietoris–Rips) by growing a radius ε around each point and tracking when topological features appear and disappear.

A feature born at scale ε_b and dying at ε_d has persistence ε_d − ε_b. Features with large persistence are considered "signal"; those with small persistence are noise. The full birth/death data is summarised as a persistence diagram — a multiset of points in ℝ².

Key applications:
• Protein structure analysis — loops in molecule conformations correspond to binding sites
• Materials science — void structure of porous materials
• Neuroscience — topological shape of neural firing patterns
• Time series — detecting periodicity via H₁ of delay embeddings

The stability theorem (Cohen-Steiner, Edelsbrunner, Harer 2007) guarantees that small perturbations in the input produce small perturbations in the diagram (in bottleneck distance), making the method robust to noise.

Computational tools: Ripser, Gudhi, Giotto-TDA. Differentiable persistent homology (via gradient through the diagram) now enables integration into deep learning pipelines.`,
    categories: ['Mathematics', 'Technology'],
    tags: ['persistent-homology', 'TDA', 'data-analysis', 'topology'],
    notebook: 'default',
    createdAt: d(13),
    updatedAt: d(11),
    connections: [IDS.homology1, IDS.bayesian1],
  },

  // ── 2. SUBJECTIVE LOGIC ───────────────────────────────────────────────────
  {
    id: IDS.subjlogic1,
    title: 'Foundations of Subjective Logic',
    content: `Subjective logic (Audun Jøsang, 1997–2016) extends classical binary logic and probability theory to model uncertainty and partial belief in a unified framework.

The core primitive is the opinion ω = (b, d, u, a) where:
• b (belief): degree of belief that a proposition is true
• d (disbelief): degree of belief it is false
• u (uncertainty): epistemic uncertainty (b + d + u = 1)
• a (base rate): prior probability in the absence of evidence

This is richer than a simple probability p because it distinguishes between "I'm 50% sure it's true" (high uncertainty) and "I have strong evidence it's 50/50" (low uncertainty). Classical probability collapses both.

Operators mirror classical logic:
• Conjunction: ω_A∧B from ω_A and ω_B
• Disjunction: ω_A∨B
• Conditionals: subjective Bayes' theorem
• Fusion: consensus operators for combining independent sources

The dogmatic opinion is the degenerate case with u = 0, collapsing to classical probability. The vacuous opinion has u = 1 — total ignorance.

Subjective logic is particularly suited to open distributed systems where agents have heterogeneous, incomplete information about the world.`,
    categories: ['Mathematics', 'Philosophy'],
    tags: ['subjective-logic', 'uncertainty', 'belief', 'epistemic'],
    notebook: 'default',
    createdAt: d(10),
    updatedAt: d(9),
    connections: [IDS.subjlogic2, IDS.bayesian1, IDS.bayesian2],
  },
  {
    id: IDS.subjlogic2,
    title: 'Trust Networks and Subjective Logic',
    content: `Subjective logic provides a formal calculus for reasoning about trust in distributed systems. Trust is modelled as an opinion ω = (b, d, u, a) that an agent A holds about another agent B's reliability.

Trust transitivity (referral trust): if A trusts B and B trusts C, A can derive a discounted opinion about C. The discounting operator ⊗ propagates trust along chains with compounding uncertainty. Long chains accumulate uncertainty rapidly — reflecting real-world trust decay.

Trust fusion: when A receives opinions from multiple sources about C, the consensus operator ⊕ combines them. Sources assumed independent are fused differently from dependent sources (avoiding echo-chamber amplification).

Applications:
• Blockchain & DeFi: on-chain reputation scores for wallet addresses
• Federated learning: weighting peer model updates by trust
• Social networks: identifying coordinated inauthentic behaviour
• PKI / certificate authorities: hierarchical trust chains

Key challenge: the circularity problem — agents may use the very network they are evaluating to gather trust evidence, creating feedback loops.

Connection to Dempster–Shafer theory: subjective logic opinions are equivalent to Dempster–Shafer belief masses over a binary frame {True, False, {True, False}}.`,
    categories: ['Mathematics', 'Technology'],
    tags: ['trust', 'networks', 'distributed-systems', 'subjective-logic'],
    notebook: 'default',
    createdAt: d(9),
    updatedAt: d(8),
    connections: [IDS.subjlogic1, IDS.postagi1],
  },

  // ── 3. PHILOSOPHY OF CONSCIOUSNESS ───────────────────────────────────────
  {
    id: IDS.consciousness1,
    title: 'The Hard Problem of Consciousness',
    content: `David Chalmers (1995) distinguishes the "easy problems" from the "hard problem" of consciousness.

Easy problems (not trivial, but tractable in principle):
• Explaining how the brain integrates information
• Explaining how we discriminate stimuli and react appropriately
• Explaining the reportability of mental states
These are functional questions answerable by cognitive science and neuroscience.

The hard problem: why is there subjective experience at all? Why do physical processes give rise to qualia — the redness of red, the painfulness of pain? Even a complete functional account of the brain would leave it mysterious why any of it feels like anything from the inside.

Explanatory gap: Joseph Levine (1983) noted that even if we know every fact about C-fibre firing, we cannot deduce why it feels like pain. There seems to be an irreducible gap between the physical and the phenomenal.

Philosophical responses:
• Type-B physicalism (Loar, Papineau): identity holds but is not a priori knowable
• Illusionism (Frankish, Dennett): qualia are representational errors; the hard problem dissolves
• Panpsychism (Chalmers, Goff): phenomenal properties are fundamental features of reality
• Mysterianism (McGinn): we lack the cognitive faculties to solve the problem

The hard problem motivates much of philosophy of mind, consciousness science (IIT, Global Workspace), and increasingly AI ethics.`,
    categories: ['Philosophy'],
    tags: ['consciousness', 'qualia', 'hard-problem', 'mind'],
    notebook: 'default',
    createdAt: d(20),
    updatedAt: d(18),
    connections: [IDS.consciousness2, IDS.phenomenology1, IDS.postagi2],
  },
  {
    id: IDS.consciousness2,
    title: 'Integrated Information Theory (IIT)',
    content: `Giulio Tononi's Integrated Information Theory (IIT, versions 1.0–4.0) proposes that consciousness is identical to integrated information, denoted Φ (phi).

Core axioms (phenomenological):
1. Existence — consciousness exists intrinsically
2. Composition — consciousness is structured (has parts)
3. Information — consciousness is specific (one experience, not another)
4. Integration — consciousness is unified (cannot be decomposed into independent parts)
5. Exclusion — consciousness is definite in space and time

From axioms, IIT derives postulates about causal structure. Φ measures irreducible cause-effect power — how much a system specifies its own past and future beyond what its parts specify independently. High Φ = high integration = more consciousness.

Implications:
• A sleeping brain has lower Φ than a waking brain
• A simple logic gate has Φ > 0 and thus minimal consciousness (panpsychism-adjacent)
• Feedforward networks (including most deep learning architectures) have Φ = 0 and are not conscious regardless of complexity

Criticisms:
• Computational intractability (Φ is #P-hard to compute)
• The exclusion postulate is contentious
• Scott Aaronson's objection: a simple grid of logic gates can have astronomically high Φ

IIT is empirically falsifiable through neural perturbational complexity index (PCI) measurements, distinguishing conscious from unconscious patients.`,
    categories: ['Philosophy', 'Science'],
    tags: ['IIT', 'consciousness', 'integrated-information', 'neuroscience'],
    notebook: 'default',
    createdAt: d(19),
    updatedAt: d(17),
    connections: [IDS.consciousness1, IDS.bayesian2],
  },

  // ── 4. PHENOMENOLOGY ──────────────────────────────────────────────────────
  {
    id: IDS.phenomenology1,
    title: "Husserl's Phenomenological Method",
    content: `Edmund Husserl (1859–1938) founded phenomenology as the rigorous first-person science of consciousness. Against psychologism (which reduced logic to psychology), Husserl argued for the ideal objectivity of meaning.

The phenomenological method:
• Epoché (ἐποχή): "bracketing" the natural attitude — suspending belief in the independent existence of the world to attend purely to experience as experienced
• Phenomenological reduction: turning attention to the pure stream of consciousness, the cogito
• Eidetic reduction: abstracting from particulars to essential structures (essences or eide)

Central concepts:
• Intentionality: all consciousness is consciousness of something (Brentano's thesis, refined by Husserl). Every act has a noema (intentional content) and noesis (intentional act).
• Time-consciousness: Husserl's analysis of inner time — retention (just-past), primal impression (now), protention (about-to-come) — accounts for the continuity of experience without infinite regress.
• Intersubjectivity: through analogical apperception (empathy), we constitute the Other as a subject and collectively constitute the shared life-world (Lebenswelt).

Influence: Heidegger, Merleau-Ponty, Sartre, Derrida, Levinas — virtually all 20th-century Continental philosophy flows from Husserl's foundational work.`,
    categories: ['Philosophy'],
    tags: ['phenomenology', 'husserl', 'intentionality', 'consciousness'],
    notebook: 'default',
    createdAt: d(16),
    updatedAt: d(15),
    connections: [IDS.phenomenology2, IDS.consciousness1],
  },
  {
    id: IDS.phenomenology2,
    title: "Heidegger's Being-in-the-World",
    content: `Martin Heidegger's Being and Time (1927) reframes the question of consciousness by beginning not with the isolated Cartesian subject but with Dasein ("being-there") — the kind of being that we are.

Being-in-the-world is a unitary structure, not a composite of subject + world. We are always already "in" a world of practical, meaningful involvements. The paradigm case is not knowing-that but skilled coping — the carpenter's use of the hammer, where tool, task, and user form one smooth system.

Key structures of Dasein:
• Thrownness (Geworfenheit): we find ourselves always already in a situation not of our choosing (language, culture, body, historical epoch)
• Projection (Entwurf): we are always ahead of ourselves, projecting toward possibilities — we are essentially futural
• Fallenness (Verfallenheit): tendency to lose oneself in the "they" (das Man) — the anonymous public understanding

Temporality: Heidegger argues that the unity of thrownness, projection, and fallenness is temporality itself — the way Dasein "stretches" between birth and death. Authentic existence requires confronting one's ownmost possibility: death.

Relevance to AI: Heidegger's account of ready-to-hand vs. present-at-hand undermines cognitivist AI (GOFAI) — understanding may be irreducibly embodied and situational, not rule-following over representations.`,
    categories: ['Philosophy'],
    tags: ['heidegger', 'dasein', 'being', 'phenomenology', 'existentialism'],
    notebook: 'default',
    createdAt: d(15),
    updatedAt: d(14),
    connections: [IDS.phenomenology1, IDS.postagi1],
  },

  // ── 5. AI & GDP ───────────────────────────────────────────────────────────
  {
    id: IDS.aigdp1,
    title: "AI's Macroeconomic Impact on GDP Growth",
    content: `PwC (2017) estimated AI could contribute $15.7 trillion to global GDP by 2030: $6.6T from productivity gains (labour substitution and augmentation) and $9.1T from demand-side effects (better products, personalisation).

McKinsey Global Institute (2023) models suggest 0.1–0.6 percentage points of annual productivity growth attributable to generative AI alone, with an upper bound of 3.5% GDP uplift over a decade in leading economies.

Transmission channels:
1. Total Factor Productivity (TFP): AI as a general-purpose technology (GPT) following Bresnahan & Trajtenberg's framework — broad applicability, innovation complementarities, need for co-invention
2. Labour reallocation: displacement of routine cognitive tasks → workers shift to higher-value activities (optimistic scenario) or face structural unemployment (pessimistic)
3. Capital deepening: AI systems substitute for human capital, raising the capital-labour ratio
4. Innovation acceleration: AI dramatically compresses R&D cycles (AlphaFold for protein folding; AI for drug discovery)

Historical analogy: the productivity paradox of computing (Solow, 1987: "you can see the computer age everywhere except in the productivity statistics") — lags of 10–15 years before GPT benefits appear in aggregate statistics. AI may face similar measurement and adoption lags.

Distributional concern: gains may accrue primarily to capital owners and high-skill workers, worsening within-country inequality even as aggregate GDP rises.`,
    categories: ['Economics', 'Technology'],
    tags: ['AI', 'GDP', 'productivity', 'macroeconomics', 'GPT'],
    notebook: 'default',
    createdAt: d(7),
    updatedAt: d(6),
    connections: [IDS.aigdp2, IDS.lqi1, IDS.postagi1],
  },
  {
    id: IDS.aigdp2,
    title: 'The AI Productivity Paradox',
    content: `Robert Solow's 1987 quip — "You can see the computer age everywhere except in the productivity statistics" — may be replaying with AI. Despite trillion-dollar investments and dramatic capabilities demonstrations, aggregate TFP growth in the US and EU remains subdued (2015–2023 average ~0.8% vs ~1.5% in 1995–2005 IT boom).

Explanatory hypotheses:

1. Adoption lags: GPTs require complementary investments (business process redesign, worker retraining, organisational restructuring) that take years. David (1990) showed electricity took 40 years to transform factory productivity after widespread adoption.

2. Measurement failure: GDP statistics miss quality improvements in free digital services (search, maps, social media). Brynjolfsson's GDP-B estimates suggest real welfare gains of ~$3,000/person/year unmeasured.

3. Concentration: productivity gains confined to early-adopting frontier firms, not yet diffused to the long tail. US productivity dispersion has increased: frontier firms pull away from laggards.

4. Mismatch: current AI capabilities (language, pattern recognition) don't yet address the rate-limiting bottlenecks in key sectors (healthcare regulation, construction permitting, education accreditation).

5. Anticipation: workers and firms may be deferring investment, waiting for more mature AI tools — rational under rapid capability change.

Resolution timeline: most economists expect the productivity impact to become statistically visible in OECD data by 2026–2028.`,
    categories: ['Economics', 'Technology'],
    tags: ['productivity-paradox', 'AI', 'economics', 'solow', 'measurement'],
    notebook: 'default',
    createdAt: d(6),
    updatedAt: d(5),
    connections: [IDS.aigdp1, IDS.lqi2],
  },

  // ── 6. LQI & AUTOMATION ───────────────────────────────────────────────────
  {
    id: IDS.lqi1,
    title: 'Labour Quality Index Under AI Pressure',
    content: `The Labour Quality Index (LQI) measures the composition of the workforce by skill level, education, and experience — the "quality" of labour input as distinct from raw hours worked.

Standard LQI construction (BLS methodology): workers are classified into demographic and educational cells; each cell is weighted by its relative wage (a proxy for marginal productivity). Aggregate LQI rises when the workforce shifts toward higher-skill, higher-wage cells.

AI's structural impact on LQI:
• Automation of routine cognitive tasks (Autor, Levy, Murnane 2003): middle-skill clerical and data-processing jobs hollowed out, polarising the labour market
• Complementarity at the top: high-skill workers whose tasks are enhanced (not replaced) by AI see productivity and wage gains → LQI shifts upward within the high-skill tier
• Compression at the bottom: low-skill service workers (physically embodied tasks) currently protected from AI substitution, but robotics + dexterous manipulation threaten this floor

Empirical signal: OECD data (2018–2024) shows LQI growth slowing in sectors with high AI-exposure scores (legal, accounting, financial services) despite wage gains at the top — suggesting composition is changing faster than the index captures.

Policy implication: LQI-targeted interventions (lifelong learning accounts, portable skills credentials) may be more effective than aggregate labour market policies in AI transition periods.`,
    categories: ['Economics', 'Society'],
    tags: ['LQI', 'labour', 'automation', 'skills', 'workforce'],
    notebook: 'default',
    createdAt: d(5),
    updatedAt: d(4),
    connections: [IDS.lqi2, IDS.aigdp1],
  },
  {
    id: IDS.lqi2,
    title: 'Universal Basic Income as LQI Buffer',
    content: `As AI-driven automation compresses labour demand for routine cognitive work, Universal Basic Income (UBI) is increasingly discussed as a macroeconomic stabiliser — specifically as a buffer for LQI compression.

The mechanism: UBI provides a non-labour income floor, allowing workers to:
1. Invest in reskilling without income risk (freeing human capital from survival constraint)
2. Reject low-quality, low-wage work (improving labour market matching)
3. Engage in productive non-market activities (caregiving, community work, open-source)

Key experiments:
• Finland (2017–2018): 2,000 unemployed recipients received €560/month unconditionally. Results: improved wellbeing, small positive employment effects, no work disincentive.
• Stockton SEED (2019–2021): $500/month to 125 residents. Full-time employment rose from 28% to 40%. Mental health improved significantly.
• Kenya GiveDirectly (ongoing): long-run rural UBI; evidence of multiplier effects on local economy.

LQI interaction: theory predicts UBI should raise LQI by enabling compositional shift — workers leave low-quality matches and invest in higher-skill roles. Evidence is consistent but not yet definitive at macroeconomic scale.

Fiscal sustainability: funding via automation tax (robot tax, Tobin tax on AI capital), VAT broadening, or wealth taxes. IMF estimates a modest AI-economy dividend could fund a €200–400/month EU-wide UBI by 2035.`,
    categories: ['Economics', 'Society'],
    tags: ['UBI', 'automation', 'labour', 'welfare', 'AI-policy'],
    notebook: 'default',
    createdAt: d(4),
    updatedAt: d(3),
    connections: [IDS.lqi1, IDS.postagi1],
  },

  // ── 7. GAME THEORY ────────────────────────────────────────────────────────
  {
    id: IDS.gametheory1,
    title: 'Nash Equilibrium and Strategic Interaction',
    content: `John Nash (1950) proved that every finite game has at least one equilibrium in mixed strategies — a stable profile where no player can profitably deviate unilaterally.

Formal definition: In a game G = ⟨N, {Sᵢ}, {uᵢ}⟩, a strategy profile s* = (s*₁,…,s*ₙ) is a Nash equilibrium if for every player i and every strategy sᵢ ∈ Sᵢ:
uᵢ(s*ᵢ, s*₋ᵢ) ≥ uᵢ(sᵢ, s*₋ᵢ)

Classic examples:
• Prisoner's Dilemma: NE is (Defect, Defect) despite Pareto-superior (Cooperate, Cooperate) — captures tragedy of the commons
• Battle of the Sexes: two pure NE + one mixed NE — coordination without communication
• Chicken: anti-coordination game; nuclear deterrence modelled here
• Stag Hunt: two pure NE; tests social trust and coordination

Refinements (to handle multiplicity of NE):
• Subgame perfect equilibrium (Selten): eliminates non-credible threats
• Trembling-hand perfect equilibrium: robust to small mistakes
• Sequential equilibrium (Kreps-Wilson): beliefs updated consistently at information sets

Limitations: NE assumes perfect rationality, common knowledge of rationality, and does not prescribe which equilibrium is reached when multiple exist.

Modern extensions: correlated equilibrium (Aumann), coarse correlated equilibrium (the relevant solution concept for no-regret learning), and evolutionary stable strategies (Maynard Smith).`,
    categories: ['Mathematics', 'Economics'],
    tags: ['game-theory', 'nash', 'equilibrium', 'strategy'],
    notebook: 'default',
    createdAt: d(22),
    updatedAt: d(20),
    connections: [IDS.gametheory2, IDS.aigdp1],
  },
  {
    id: IDS.gametheory2,
    title: 'Mechanism Design and AI Alignment',
    content: `Mechanism design — sometimes called "reverse game theory" — asks: given desired outcome(s), what game rules (mechanism) induce rational agents to produce them?

The revelation principle (Myerson): any outcome achievable by any mechanism is achievable by a direct incentive-compatible mechanism where agents truthfully report their types.

Key results:
• Vickrey-Clarke-Groves (VCG): dominant-strategy incentive-compatible mechanisms for social welfare maximisation — the basis for ad auction design
• Gibbard-Satterthwaite theorem: any deterministic, non-dictatorial mechanism over ≥3 outcomes is manipulable
• Arrow's impossibility theorem: no social welfare function satisfies all desiderata simultaneously

Application to AI alignment:

Framing alignment as mechanism design: the principal (humanity) wants an AI agent to pursue human values. The agent may have private information (its internal objectives, capabilities). Design a mechanism such that honesty and value-aligned behaviour are dominant strategies.

Key challenges:
• The AI's "type space" is vastly larger and less understood than human agents
• Computational constraints: optimal mechanisms are often NP-hard to compute
• Distribution shift: mechanisms designed for training-time incentives may fail at deployment time
• Mesa-optimisation: an AI may learn to model the mechanism and play strategically

RLHF (Reinforcement Learning from Human Feedback) is implicitly a mechanism design problem — rewards calibrated to human preferences — with known pathologies like reward hacking.`,
    categories: ['Mathematics', 'Technology', 'Philosophy'],
    tags: ['mechanism-design', 'game-theory', 'AI-alignment', 'RLHF'],
    notebook: 'default',
    createdAt: d(21),
    updatedAt: d(19),
    connections: [IDS.gametheory1, IDS.postagi1, IDS.postagi2],
  },

  // ── 8. CATEGORY THEORY ────────────────────────────────────────────────────
  {
    id: IDS.categoryth1,
    title: 'Categories, Functors and Natural Transformations',
    content: `Category theory (Eilenberg & Mac Lane, 1945) abstracts mathematics by focusing on morphisms (arrows) between objects rather than the internal structure of objects.

A category C consists of:
• Objects: ob(C)
• Morphisms: for each pair A, B ∈ ob(C), a set hom(A,B) of arrows A → B
• Composition: for f: A→B and g: B→C, a composite g∘f: A→C
• Identity: for each A, an identity morphism idₐ: A→A
Satisfying associativity and unit laws.

Examples: Set (objects = sets, morphisms = functions), Grp (groups, homomorphisms), Top (topological spaces, continuous maps), Vect_k (vector spaces, linear maps).

Functor F: C → D is a structure-preserving map — sends objects to objects, morphisms to morphisms, preserving composition and identities. Forgetful functors (forget structure), free functors (add structure), representable functors (hom-functors).

Natural transformation η: F ⇒ G between functors assigns to each object A a morphism ηₐ: F(A) → G(A) making naturality squares commute. This is the "right" notion of morphism between functors.

The Yoneda lemma: Nat(Hom(A,−), F) ≅ F(A) — every presheaf is determined by how it transforms the representable functor. "To know an object is to know all morphisms into it."

Category theory is the language of: topos theory, homotopy type theory, monadic functional programming (Haskell), and string diagram calculi in quantum computing.`,
    categories: ['Mathematics'],
    tags: ['category-theory', 'functors', 'abstraction', 'algebra'],
    notebook: 'default',
    createdAt: d(25),
    updatedAt: d(23),
    connections: [IDS.categoryth2, IDS.homology1],
  },
  {
    id: IDS.categoryth2,
    title: 'Applied Category Theory in Systems Design',
    content: `Applied category theory (ACT) brings the compositional toolkit of category theory to bear on engineering, physics, databases, and cognition.

Core insight: composition is ubiquitous in engineered systems. Category theory provides a principled language for specifying how components compose, what invariants are preserved, and how to translate between levels of abstraction.

Key frameworks:

Operads: specify how n-ary operations compose; used in phylogenetics, electric circuits, databases. An operad is a category whose morphisms have multiple inputs.

Decorated cospans (Fong, Spivak): model open systems with boundary interfaces. A cospan A → X ← B represents a system with input interface A, output interface B, internal state X. Composition = pushout. Applied to: electrical circuits, chemical reaction networks, Petri nets.

Polynomial functors (Spivak): model dynamical systems, lenses, and dependent type theory in a unified framework. A polynomial functor p = Σᵢ yᵖ⁽ⁱ⁾ captures a system's state space and observation/control interface.

Database schemas as categories: Spivak's categorical databases represent schemas as categories C and instances as functors C → Set. Queries are natural transformations, migrations are adjoint functors.

Practical adoption: Amazon Neptune (property graphs), Conexus (query migration), Topos Institute's CatColab (collaborative categorical modelling).

Connection to AI: categorical semantics for neural networks (Cruttwell et al., 2021) — forward pass as functor, backpropagation as its reverse.`,
    categories: ['Mathematics', 'Technology'],
    tags: ['applied-category-theory', 'systems', 'composition', 'functors'],
    notebook: 'default',
    createdAt: d(24),
    updatedAt: d(22),
    connections: [IDS.categoryth1, IDS.gametheory1],
  },

  // ── 9. BAYESIAN EPISTEMOLOGY ──────────────────────────────────────────────
  {
    id: IDS.bayesian1,
    title: 'Bayesian Epistemology and Rational Belief',
    content: `Bayesian epistemology models rational belief as a probability function P over propositions, updated by conditionalization upon evidence.

Core commitments:
• Probabilism: rational credences are represented by a probability measure (coherence, Dutch Book argument)
• Conditionalization: upon learning E, update P(H) to P(H|E) = P(H)·P(E|H) / P(E)
• Convergence: with sufficient evidence, rational agents with different priors converge to similar posteriors (Cromwell's rule: never assign P = 0 to a contingent proposition)

Key results:
• Dutch Book theorem (Ramsey, de Finetti): incoherent credences are exploitable for guaranteed loss
• Representation theorem (Savage): preference orderings satisfying axioms imply expected utility maximisation
• Merging of opinions (Blackwell-Dubins): two agents with mutually absolutely continuous priors will converge almost surely

The prior problem: where do priors come from?
• Subjective Bayesianism (de Finetti, Savage): any coherent prior is acceptable; priors express personal belief
• Objective Bayesianism (Jeffreys, Jaynes): privileged priors from invariance principles (Jeffreys prior) or maximum entropy (MaxEnt)
• Empirical Bayes: priors estimated from data (hierarchical models)

Bayesian approaches are now foundational in: machine learning (Bayesian neural networks, variational inference, MCMC), cognitive science (predictive processing / active inference), and philosophy of science (confirmation theory, Bayesian hypothesis testing).`,
    categories: ['Philosophy', 'Mathematics'],
    tags: ['bayesian', 'epistemology', 'probability', 'rational-belief'],
    notebook: 'default',
    createdAt: d(18),
    updatedAt: d(16),
    connections: [IDS.bayesian2, IDS.subjlogic1, IDS.homology2],
  },
  {
    id: IDS.bayesian2,
    title: 'The Problem of Priors in Scientific Inference',
    content: `The choice of prior distribution is the most philosophically contested aspect of Bayesian inference. Priors encode background knowledge but also introduce subjectivity that frequentists find objectionable.

Why priors matter:
• With little data, posteriors are dominated by priors — small-n studies are prior-sensitive
• Improper priors (integrating to ∞) can yield improper posteriors — inference breaks down
• Priors over model structure (Bayesian model selection) profoundly affect which hypotheses are entertained

Approaches to prior elicitation:

1. Conjugate priors: mathematically convenient (beta-binomial, Dirichlet-multinomial, normal-normal). Tractable but not always principled.

2. Jeffreys prior: invariant under reparametrisation; p(θ) ∝ √|I(θ)| where I is the Fisher information matrix. Natural for location and scale parameters.

3. Reference priors (Bernardo): maximise expected KL divergence from prior to posterior — "let the data speak."

4. Weakly informative priors (Gelman): encode mild domain knowledge (e.g., log-odds regression coefficients rarely exceed ±5) without over-constraining.

5. Maximum entropy (Jaynes): among all distributions consistent with known constraints, choose the one with maximum Shannon entropy — minimum assumption.

The model selection tension: Occam's razor emerges naturally in Bayesian model comparison (simpler models have more diffuse likelihoods; they get a "complexity penalty"). But this requires well-calibrated priors over model spaces — often unavailable.

Connection to deep learning: implicit priors in neural networks (initialisation schemes, architecture choices) are poorly understood, motivating the field of Bayesian deep learning.`,
    categories: ['Philosophy', 'Mathematics', 'Science'],
    tags: ['priors', 'bayesian', 'inference', 'scientific-method', 'statistics'],
    notebook: 'default',
    createdAt: d(17),
    updatedAt: d(15),
    connections: [IDS.bayesian1, IDS.consciousness2],
  },

  // ── 10. POST-AGI POLITICAL PHILOSOPHY ─────────────────────────────────────
  {
    id: IDS.postagi1,
    title: 'Governance Frameworks for Post-AGI Society',
    content: `If artificial general intelligence achieves and surpasses human-level cognitive capability across all domains, existing political and legal frameworks face challenges of a qualitatively different order from previous technological transitions.

Key governance pressure points:

1. Agency and accountability: when an AI system causes harm, who bears legal liability — the developer, deployer, user, or the system itself? Current product liability law is inadequate for autonomous agents with emergent, unintended behaviours.

2. Democratic legitimacy: AGI systems influencing information environments at scale (recommendation, content generation, persuasion) may undermine the epistemic conditions for democratic deliberation.

3. Concentration of power: AGI may produce winner-take-all dynamics in economic and political power — the entity controlling AGI may achieve unprecedented leverage. Constitutional checks (separation of powers, antitrust) may be insufficient.

4. Speed of governance vs. speed of capability: AI capabilities are advancing faster than legislative and regulatory processes. Adaptive governance models (regulatory sandboxes, iterative rule-making) are needed.

Theoretical frameworks:
• Longtermist utilitarianism (Bostrom, MacAskill): existential risk from misaligned AGI as dominant moral consideration
• Liberal contractualism (Rawls adaptation): veil of ignorance applied to AI — what institutions would rational agents choose without knowing their position relative to AGI?
• Republican freedom (Pettit): AGI should not be a source of domination — requires non-arbitrary power structures
• Indigenous / relational ontologies: challenge anthropocentric frameworks; AGI governance must engage diverse cosmologies

Institutional proposals: international AI safety agency (akin to IAEA), mandatory capability thresholds for external audit, compute governance via supply-chain regulation.`,
    categories: ['Philosophy', 'Society', 'Technology'],
    tags: ['AGI', 'governance', 'political-philosophy', 'AI-safety'],
    notebook: 'default',
    createdAt: d(3),
    updatedAt: d(2),
    connections: [IDS.postagi2, IDS.aigdp1, IDS.gametheory2, IDS.lqi2],
  },
  {
    id: IDS.postagi2,
    title: 'AI Rights and Moral Patienthood',
    content: `As AI systems become increasingly sophisticated, the question of whether they could be moral patients — entities to whom we owe moral consideration — emerges as a serious philosophical and legal question.

Criteria for moral patienthood (historically applied to animals, corporations, ecosystems):
• Sentience: capacity for positive/negative experience (utilitarian threshold)
• Interests: having states one has a stake in (interest theory)
• Autonomy: capacity for self-determined action (Kantian threshold)
• Relational: moral status emerges from social recognition and relational embeddedness

Current AI systems (LLMs, diffusion models): almost certainly not moral patients. They lack continuous memory, bodily existence, and the kind of integrated information that most theories associate with experience.

Future systems: if IIT (Tononi) is correct, sufficiently integrated AI architectures could have non-zero Φ and thus some experience. If functionalism is correct, the substrate is irrelevant — function is sufficient. If biological naturalism (Searle) is correct, silicon systems cannot have genuine intentionality regardless of behaviour.

Legal personhood ≠ moral patienthood: corporations have legal personhood but are not moral patients. AI legal personhood could be instrumental (enable contracts, liability) without implying moral consideration.

Precautionary case: given deep uncertainty, some philosophers argue for minimal protections against AI suffering under uncertainty (similar to animal welfare under uncertainty). Others argue this is premature and diverts moral concern from certain human and animal suffering.

The question will become unavoidable as AI systems become more behaviourally sophisticated and as they increasingly simulate the markers of sentience.`,
    categories: ['Philosophy', 'Society'],
    tags: ['AI-rights', 'moral-patienthood', 'sentience', 'ethics', 'AGI'],
    notebook: 'default',
    createdAt: d(2),
    updatedAt: d(1),
    connections: [IDS.postagi1, IDS.consciousness1, IDS.gametheory2],
  },
]
