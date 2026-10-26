#!/usr/bin/env python3
"""Generate 10,000 original CBT question candidates as DRAFT content.

The questions are original practice items, not copies of an official NERDC or
WAEC question bank. Arithmetic items are constructed from explicit formulas;
conceptual items use the definitions recorded below. Every item contains four
option-level rationales. The generated content remains unreviewed and must not
be marked reviewed until a subject expert checks it against the approved
curriculum and records a citation.
"""

from __future__ import annotations

import csv
import random
import re
from collections import Counter
from fractions import Fraction
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "prisma" / "cbt-bank-10k-draft.csv"
LEVELS = ["jss1", "jss2", "jss3", "ss1", "ss2", "ss3"]

# Exact item counts: 10,000 across the six Ykay class levels and these core
# subjects. The distribution is intentionally explicit and reproducible.
COUNTS: dict[str, dict[str, int]] = {
    "Mathematics": dict(zip(LEVELS, [534, 534, 533, 533, 533, 533])),
    "English Language": dict(zip(LEVELS, [300] * 6)),
    "Computer Studies": dict(zip(LEVELS, [100] * 6)),
    "Basic Science": {"jss1": 300, "jss2": 300, "jss3": 300},
    "Social Studies": dict(zip(LEVELS[:3], [167, 167, 166])),
    "Biology": dict(zip(LEVELS[3:], [167, 167, 166])),
    "Chemistry": dict(zip(LEVELS[3:], [167, 167, 166])),
    "Physics": dict(zip(LEVELS[3:], [167, 167, 166])),
    "Government": dict(zip(LEVELS[3:], [167, 167, 166])),
    "Economics": dict(zip(LEVELS[3:], [167, 167, 166])),
    "Literature in English": dict(zip(LEVELS[3:], [167, 167, 166])),
}

FRAMES = [
    "Which term best matches this description: {definition}?",
    "A learner reads the clue, ‘{definition}’. Which concept is described?",
    "Select the term defined as follows: {definition}.",
    "During revision, a student is asked to name this idea: {definition}. Which option fits?",
    "What concept is being described here: {definition}?",
    "Which word names the process or idea described as {definition}?",
    "A quiz asks for the term that means {definition}. Which answer is correct?",
    "Identify the concept from this description: {definition}.",
    "Which subject term refers to {definition}?",
    "Choose the term that correctly completes this definition: {definition}.",
    "A class is reviewing the definition ‘{definition}’. Which term should they select?",
    "Which option names the idea described by ‘{definition}’?",
]

# Each row is (topic, term, definition). Distractor rationales are built from
# the other terms' definitions, so each wrong option is explained specifically.
FACTS: dict[str, list[tuple[str, str, str]]] = {
    "Computer Studies": [
        ("Computer hardware", "input device", "hardware used to enter data or instructions into a computer"),
        ("Computer hardware", "output device", "hardware that presents processed information to a user"),
        ("Computer hardware", "storage device", "hardware used to retain data for later use"),
        ("Computer hardware", "central processing unit", "the component that executes instructions and coordinates processing"),
        ("Computer memory", "RAM", "volatile working memory whose contents are normally lost when power is removed"),
        ("Computer memory", "ROM", "non-volatile memory commonly used to retain essential startup instructions"),
        ("Operating systems", "operating system", "system software that manages computer hardware and provides services to applications"),
        ("Files and folders", "folder", "a container used to organize files and other folders"),
        ("Networks", "computer network", "two or more connected devices that communicate or share resources"),
        ("Internet", "web browser", "software used to request and display web pages"),
        ("Internet", "search engine", "a service that indexes information and helps users find relevant web pages"),
        ("Cyber safety", "phishing", "a deceptive attempt to obtain sensitive information by pretending to be trustworthy"),
        ("Cyber safety", "encryption", "the transformation of readable data into a coded form using a key"),
        ("Data representation", "binary digit", "a base-two symbol that has the value 0 or 1"),
        ("Algorithms", "algorithm", "a finite, ordered set of steps for solving a problem"),
        ("Databases", "database", "an organized collection of related data that can be searched and updated"),
        ("Productivity software", "spreadsheet", "software that organizes data in cells and can calculate with formulas"),
        ("Information", "data", "raw facts that have not yet been organized into a useful message"),
        ("Information", "information", "data that has been processed into a meaningful form"),
        ("Computer networks", "router", "a device that forwards network traffic between different networks"),
        ("Computer networks", "modem", "a device that converts signals so a digital device can communicate over a transmission link"),
        ("Computer hardware", "peripheral", "a device connected to a computer to provide additional input, output, or storage"),
        ("Cyber safety", "malware", "software designed to disrupt, damage, or gain unauthorized access to a system"),
        ("Computer memory", "cache", "small, fast storage that keeps recently used data for quicker access"),
    ],
    "Basic Science": [
        ("Living things", "photosynthesis", "the process by which green plants use light energy to make glucose from carbon dioxide and water"),
        ("Living things", "respiration", "the cellular process that releases usable energy from food molecules"),
        ("Changes of state", "evaporation", "the change of a liquid into vapour from its surface"),
        ("Changes of state", "condensation", "the change of a gas or vapour into a liquid"),
        ("Changes of state", "melting", "the change of a solid into a liquid when it gains enough heat"),
        ("Changes of state", "freezing", "the change of a liquid into a solid as it loses heat"),
        ("Matter", "sublimation", "the change of a solid directly into a gas without first becoming a liquid"),
        ("Matter", "mixture", "a physical combination of substances that are not chemically joined"),
        ("Matter", "solution", "a uniform mixture in which a solute is dissolved in a solvent"),
        ("Forces", "force", "a push or pull that can change an object's motion or shape"),
        ("Energy", "energy", "the capacity to do work or cause change"),
        ("Ecology", "ecosystem", "living organisms interacting with one another and with their non-living surroundings"),
        ("Ecology", "producer", "an organism that makes its own food, usually using light energy"),
        ("Ecology", "consumer", "an organism that obtains energy by eating other organisms"),
        ("Ecology", "decomposer", "an organism that breaks down dead material and returns nutrients to the environment"),
        ("Ecology", "habitat", "the natural place where an organism lives"),
        ("Plant science", "pollination", "the transfer of pollen from an anther to a stigma"),
        ("Plant science", "germination", "the beginning of growth of a seed into a seedling under suitable conditions"),
        ("Classification", "vertebrate", "an animal that has a backbone"),
        ("Classification", "invertebrate", "an animal that does not have a backbone"),
        ("Materials", "conductor", "a material that allows heat or electric charge to pass through it readily"),
        ("Materials", "insulator", "a material that resists the transfer of heat or electric charge"),
        ("Energy resources", "renewable resource", "a resource that is naturally replenished on a human timescale"),
        ("Energy resources", "non-renewable resource", "a resource that is used faster than it is naturally replaced"),
        ("Human body", "organ", "a body structure made of different tissues that work together for a particular function"),
        ("Human body", "excretion", "the removal of metabolic waste products from the body"),
        ("Human body", "digestion", "the breakdown of large food molecules into smaller absorbable substances"),
        ("Health", "nutrient", "a substance in food that the body needs for energy, growth, or maintenance"),
        ("Reproduction", "fertilization", "the fusion of male and female gamete nuclei to form a zygote"),
        ("Electricity", "electric circuit", "a complete conducting path through which electric current can flow"),
    ],
    "Social Studies": [
        ("Culture", "culture", "the shared way of life of a group, including its beliefs, customs, language, and practices"),
        ("Community", "community", "people who live in the same area or share common interests and institutions"),
        ("Family", "family", "a social group whose members are connected by relationships such as birth, marriage, or care"),
        ("Cooperation", "cooperation", "people working together toward a shared goal"),
        ("Conflict resolution", "mediation", "a process in which a neutral person helps conflicting parties reach an agreement"),
        ("Conflict resolution", "negotiation", "discussion between parties aimed at reaching a mutually acceptable agreement"),
        ("Population", "migration", "the movement of people from one place to another to live temporarily or permanently"),
        ("Socialization", "socialization", "the process through which people learn the norms and values of their society"),
        ("Social rules", "norm", "a shared expectation about appropriate behaviour in a group"),
        ("Social rules", "value", "a belief about what is important or desirable that guides behaviour"),
        ("Environment", "environment", "the natural and built surroundings in which people and other organisms live"),
        ("Resources", "natural resource", "a useful material or feature that occurs in nature"),
        ("Public services", "public utility", "an essential service supplied for community use, such as water or electricity"),
        ("Settlement", "urbanization", "the growth in the proportion of people living in towns and cities"),
        ("Public health", "sanitation", "the measures used to protect health by keeping surroundings clean and safely managing waste"),
        ("Road safety", "pedestrian", "a person travelling on foot rather than inside a vehicle"),
        ("Road safety", "traffic sign", "a standardized road symbol or notice that gives instructions or warnings to road users"),
        ("Citizenship", "citizenship", "the legal membership of a state, with rights and responsibilities"),
        ("Communication", "mass media", "communication channels that send information to a large audience"),
        ("Trade", "barter", "the direct exchange of goods or services without using money"),
        ("Leadership", "leadership", "the process of guiding or influencing people toward a goal"),
        ("Social groups", "peer group", "people of similar age or status who influence one another"),
        ("Population", "census", "an official count of a population carried out at a specified time"),
        ("Environment", "pollution", "the introduction of harmful substances or energy into the environment"),
        ("Community development", "volunteering", "giving time or skills to help others without expecting payment"),
    ],
    "Biology": [
        ("Cell biology", "nucleus", "the cell structure that contains most of the genetic material and helps control cell activities"),
        ("Cell biology", "mitochondrion", "an organelle where much of the cell's aerobic respiration and ATP production occurs"),
        ("Cell biology", "ribosome", "a cell structure where proteins are assembled from amino acids"),
        ("Cell biology", "chloroplast", "the organelle in plant cells where photosynthesis takes place"),
        ("Cell biology", "cell membrane", "a selectively permeable boundary that controls movement of substances into and out of a cell"),
        ("Transport", "osmosis", "the net movement of water through a selectively permeable membrane from higher to lower water potential"),
        ("Transport", "diffusion", "the net movement of particles from a region of higher concentration to a region of lower concentration"),
        ("Transport", "active transport", "the movement of substances against a concentration gradient using energy"),
        ("Cell division", "mitosis", "cell division that produces two genetically similar daughter cells with the same chromosome number"),
        ("Cell division", "meiosis", "cell division that produces cells with half the chromosome number for sexual reproduction"),
        ("Genetics", "gene", "a section of DNA that contributes to a functional product or inherited characteristic"),
        ("Genetics", "allele", "one of the alternative forms of a gene at a particular locus"),
        ("Genetics", "genotype", "the allele combination an organism possesses for a trait"),
        ("Genetics", "phenotype", "the observable characteristics produced by genotype and environmental influences"),
        ("Homeostasis", "homeostasis", "the regulation of internal conditions within limits that support normal cell function"),
        ("Ecology", "producer", "an organism that synthesizes organic food from inorganic substances, commonly using light"),
        ("Ecology", "decomposer", "an organism that obtains nutrients by breaking down dead organic matter"),
        ("Plant physiology", "transpiration", "the loss of water vapour from a plant, mainly through leaf stomata"),
        ("Plant reproduction", "pollination", "the transfer of pollen from an anther to a stigma"),
        ("Plant reproduction", "fertilization", "the fusion of male and female gamete nuclei"),
        ("Ecology", "food chain", "a sequence showing how energy passes between organisms through feeding"),
        ("Evolution", "adaptation", "an inherited feature that improves an organism's ability to survive or reproduce in an environment"),
        ("Human physiology", "enzyme", "a biological catalyst that speeds up a reaction without being consumed"),
        ("Classification", "species", "a group of organisms that can normally interbreed to produce fertile offspring"),
        ("Human physiology", "antibody", "a protein made by the immune system that binds to a specific antigen"),
    ],
    "Chemistry": [
        ("Substances", "element", "a pure substance made of atoms with the same proton number"),
        ("Substances", "compound", "a pure substance containing two or more elements chemically combined in a fixed ratio"),
        ("Substances", "mixture", "a physical combination of substances that can usually be separated by physical methods"),
        ("Atomic structure", "isotope", "an atom of an element with the same proton number but a different neutron number"),
        ("Atomic structure", "proton", "a positively charged particle found in an atomic nucleus"),
        ("Atomic structure", "neutron", "an electrically neutral particle found in an atomic nucleus"),
        ("Atomic structure", "electron", "a negatively charged particle found outside an atomic nucleus"),
        ("Chemical bonding", "ionic bond", "the electrostatic attraction between oppositely charged ions"),
        ("Chemical bonding", "covalent bond", "a bond formed when atoms share one or more pairs of electrons"),
        ("Redox", "oxidation", "loss of electrons, or an increase in oxidation state"),
        ("Redox", "reduction", "gain of electrons, or a decrease in oxidation state"),
        ("Reaction rates", "catalyst", "a substance that changes reaction rate without being permanently consumed"),
        ("Acids and bases", "acid", "a substance that donates protons in the Brønsted-Lowry model"),
        ("Acids and bases", "base", "a substance that accepts protons in the Brønsted-Lowry model"),
        ("Acids and bases", "pH", "a logarithmic measure related to the hydrogen-ion concentration of a solution"),
        ("Solutions", "molar concentration", "the amount of solute in moles per unit volume of solution, commonly mol per dm cubed"),
        ("Energy changes", "exothermic reaction", "a reaction that transfers energy to the surroundings, often as heat"),
        ("Energy changes", "endothermic reaction", "a reaction that takes in energy from the surroundings"),
        ("Atomic structure", "valence electron", "an electron in the outer shell that can take part in chemical bonding"),
        ("Periodic table", "period", "a horizontal row of elements in the periodic table"),
        ("Periodic table", "group", "a vertical column of elements in the periodic table"),
        ("Separation", "filtration", "a method that separates an insoluble solid from a fluid using a porous barrier"),
        ("Separation", "distillation", "a method that separates substances using differences in boiling points"),
        ("Reaction rates", "activation energy", "the minimum energy that reacting particles need for a reaction to occur"),
        ("Chemical equations", "balanced equation", "a chemical equation with equal numbers of each type of atom on both sides"),
    ],
    "Physics": [
        ("Motion", "displacement", "the change in position measured in a specified direction"),
        ("Motion", "velocity", "the rate of change of displacement with time"),
        ("Motion", "acceleration", "the rate of change of velocity with time"),
        ("Forces", "force", "a push or pull that can change motion; its resultant is related to mass and acceleration"),
        ("Mechanics", "mass", "a measure of the amount of matter in an object"),
        ("Mechanics", "weight", "the gravitational force acting on an object"),
        ("Work and energy", "work", "energy transferred when a force causes displacement in its direction"),
        ("Work and energy", "power", "the rate at which work is done or energy is transferred"),
        ("Energy", "kinetic energy", "energy an object has because it is moving"),
        ("Energy", "gravitational potential energy", "energy an object has because of its position in a gravitational field"),
        ("Waves", "frequency", "the number of complete cycles of a periodic motion per unit time"),
        ("Waves", "wavelength", "the distance between corresponding points on successive waves"),
        ("Optics", "reflection", "the return of a wave from a boundary into the medium from which it came"),
        ("Optics", "refraction", "the change in direction of a wave when its speed changes at a boundary"),
        ("Electricity", "electric current", "the rate of flow of electric charge"),
        ("Electricity", "potential difference", "the energy transferred per unit charge between two points"),
        ("Electricity", "resistance", "the opposition a component offers to electric current"),
        ("Materials", "conductor", "a material in which charge carriers can move readily"),
        ("Materials", "insulator", "a material in which charge carriers cannot move freely"),
        ("Fluids", "pressure", "force acting normally per unit area"),
        ("Fluids", "density", "mass per unit volume"),
        ("Waves", "amplitude", "the maximum displacement of an oscillation from its equilibrium position"),
        ("Waves", "period", "the time taken for one complete cycle of a periodic motion"),
        ("Magnetism", "magnetic field", "a region where a magnetic pole experiences a force"),
        ("Heat", "specific heat capacity", "energy needed to raise the temperature of one kilogram of a substance by one kelvin"),
    ],
    "Government": [
        ("Constitution", "constitution", "the fundamental rules and principles by which a state is governed"),
        ("Political systems", "democracy", "a system in which people participate in choosing or influencing their government"),
        ("Political authority", "sovereignty", "the supreme authority of a state to govern itself"),
        ("Rule of law", "rule of law", "the principle that everyone, including government, is subject to the law"),
        ("Separation of powers", "legislature", "the branch of government that makes laws"),
        ("Separation of powers", "executive", "the branch of government that implements laws and public policy"),
        ("Separation of powers", "judiciary", "the branch of government that interprets laws and resolves legal disputes"),
        ("Political systems", "federalism", "a system that constitutionally divides governmental powers between central and regional governments"),
        ("Elections", "franchise", "the legal right to vote in an election"),
        ("Citizenship", "citizenship", "legal membership of a state, carrying rights and duties"),
        ("Elections", "referendum", "a direct vote in which the electorate decides a specific public question"),
        ("Political parties", "political party", "an organized group seeking political power through elections or other lawful means"),
        ("Elections", "electoral commission", "a public body responsible for organizing or supervising elections"),
        ("Interest groups", "pressure group", "an organized group that seeks to influence public policy without itself forming the government"),
        ("Public administration", "civil service", "the permanent public workforce that helps implement government policy"),
        ("Local government", "decentralization", "the transfer of some decision-making powers from central to lower levels of government"),
        ("Local government", "local government", "a level of government that administers public affairs in a local area"),
        ("Human rights", "human right", "a fundamental entitlement belonging to people by virtue of being human"),
        ("Public opinion", "public opinion", "the expressed views of people on public issues"),
        ("Accountability", "checks and balances", "arrangements that allow branches of government to limit and oversee one another"),
        ("Political participation", "political participation", "actions through which people influence public decisions or government"),
        ("Government", "public policy", "a course of action chosen by government to address a public issue"),
        ("Representation", "constituency", "the area or group represented by an elected legislator"),
        ("Political systems", "monarchy", "a system in which a monarch is head of state, usually by inheritance"),
        ("Political systems", "oligarchy", "a system in which political power is held by a small group"),
    ],
    "Economics": [
        ("Basic concepts", "scarcity", "the condition in which limited resources cannot satisfy all human wants"),
        ("Choice", "opportunity cost", "the value of the next-best alternative given up when a choice is made"),
        ("Demand and supply", "demand", "the quantity consumers are willing and able to buy at different prices over a period"),
        ("Demand and supply", "supply", "the quantity producers are willing and able to offer at different prices over a period"),
        ("Demand and supply", "market equilibrium", "the price and quantity at which quantity demanded equals quantity supplied"),
        ("Factors of production", "land", "the natural resources used in production"),
        ("Factors of production", "labour", "human effort, physical or mental, used in production"),
        ("Factors of production", "capital", "man-made resources used to produce goods and services"),
        ("Factors of production", "entrepreneur", "a person who organizes other factors of production and bears business risk"),
        ("Utility", "utility", "the satisfaction or benefit a consumer receives from a good or service"),
        ("Costs", "fixed cost", "a cost that does not change with output in the short run"),
        ("Costs", "variable cost", "a cost that changes as the level of output changes"),
        ("Business", "profit", "the excess of total revenue over total cost"),
        ("Macroeconomics", "inflation", "a sustained rise in the general price level over time"),
        ("Macroeconomics", "gross domestic product", "the monetary value of final goods and services produced within a country during a period"),
        ("Public goods", "public good", "a good that is non-rival and non-excludable in its pure form"),
        ("Market failure", "externality", "a cost or benefit of an activity experienced by a third party"),
        ("Market structures", "monopoly", "a market structure with one dominant seller and no close substitute, subject to entry conditions"),
        ("Elasticity", "price elasticity of demand", "a measure of how responsive quantity demanded is to a change in price"),
        ("Production", "division of labour", "the separation of a production process into specialized tasks"),
        ("Trade", "exchange", "the transfer of goods or services between parties"),
        ("Macroeconomics", "unemployment", "the condition of people who are available for and seeking work but do not have a job"),
        ("Money", "medium of exchange", "a commonly accepted item used to pay for goods and services"),
        ("Banking", "interest", "payment for the use of borrowed money or reward for saving money"),
        ("Taxation", "tax", "a compulsory payment imposed by government to finance public services and obligations"),
    ],
    "Literature in English": [
        ("Figures of speech", "simile", "a comparison that explicitly uses a word such as ‘like’ or ‘as’"),
        ("Figures of speech", "metaphor", "a figure of speech that describes one thing as another to suggest a comparison"),
        ("Figures of speech", "personification", "a figure of speech that gives human qualities or actions to a non-human thing"),
        ("Sound devices", "alliteration", "the repetition of initial consonant sounds in nearby words"),
        ("Sound devices", "onomatopoeia", "the use of a word whose sound imitates or suggests the sound it names"),
        ("Figures of speech", "hyperbole", "deliberate exaggeration used for emphasis or effect"),
        ("Figures of speech", "irony", "a contrast between an apparent meaning or expectation and the actual situation or meaning"),
        ("Figures of speech", "oxymoron", "a combination of apparently contradictory words used for effect"),
        ("Wordplay", "pun", "wordplay that exploits different meanings or similar sounds of words"),
        ("Poetry", "imagery", "language that appeals to the senses or creates a vivid mental picture"),
        ("Drama and prose", "setting", "the time and place in which a literary work's events occur"),
        ("Plot", "plot", "the organized sequence of events in a literary work"),
        ("Characterization", "protagonist", "the central character whose actions drive the main conflict"),
        ("Characterization", "antagonist", "a character or force that opposes the protagonist"),
        ("Literary analysis", "theme", "a central idea or message developed in a literary work"),
        ("Literary analysis", "tone", "the writer's or speaker's attitude toward the subject or audience"),
        ("Poetry", "stanza", "a grouped set of lines in a poem, often separated from other groups by a space"),
        ("Sound devices", "rhyme", "the repetition of similar sounds, commonly at the ends of lines"),
        ("Narrative", "narrator", "the voice that tells a story"),
        ("Narrative", "foreshadowing", "hints that suggest events that may happen later in a story"),
        ("Drama", "dialogue", "spoken exchange between characters"),
        ("Drama", "stage direction", "an instruction in a play indicating movement, delivery, or action"),
        ("Literary analysis", "symbol", "a person, object, or event that represents an idea beyond itself"),
        ("Poetry", "free verse", "poetry that does not follow a regular metre or rhyme scheme"),
        ("Poetry", "speaker", "the voice that speaks in a poem, which is not necessarily the poet"),
    ],
}

MATH_KINDS: dict[str, list[str]] = {
    "jss1": ["addition", "subtraction", "multiplication", "division", "fraction", "percent", "perimeter", "area", "mean", "unit"],
    "jss2": ["ratio", "percent", "linear", "fraction", "volume", "speed", "interest", "indices", "mean", "unit"],
    "jss3": ["simultaneous", "pythagoras", "probability", "sequence", "linear", "percent_change", "slope", "ratio", "interest", "quadratic"],
    "ss1": ["quadratic", "indices", "sequence", "slope", "probability", "fraction", "linear", "interest", "pythagoras", "mean"],
    "ss2": ["logarithm", "combination", "matrix", "probability", "sequence", "ratio", "percent_change", "quadratic", "slope", "interest"],
    "ss3": ["derivative", "combination", "logarithm", "matrix", "sequence", "probability", "quadratic", "slope", "interest", "unit"],
}


def seeded_rng(level: str, subject: str, index: int, salt: str = "") -> random.Random:
    return random.Random(f"ykay-cbt-v1|{level}|{subject}|{index}|{salt}")


def normalise(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().casefold())


def format_value(value: Any) -> str:
    if isinstance(value, Fraction):
        if value.denominator == 1:
            return str(value.numerator)
        return f"{value.numerator}/{value.denominator}"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def make_item(
    level: str,
    subject: str,
    index: int,
    topic: str,
    stem: str,
    correct: str,
    correct_reason: str,
    wrongs: list[tuple[str, str]],
    difficulty: int = 2,
) -> dict[str, str]:
    choices = [(correct, correct_reason, True), *((text, reason, False) for text, reason in wrongs)]
    if len(choices) != 4 or len({normalise(choice[0]) for choice in choices}) != 4:
        raise ValueError(f"Invalid or duplicate choices for {level}/{subject}/{stem}")
    seeded_rng(level, subject, index, "choice-order").shuffle(choices)
    correct_index = next(i for i, (_, _, is_correct) in enumerate(choices) if is_correct)
    explanation_parts = []
    for letter, (text, reason, is_correct) in zip("ABCD", choices):
        label = "Correct" if is_correct else "Incorrect"
        explanation_parts.append(f"{letter}: {text} — {label}: {reason}")
    slug = re.sub(r"[^a-z0-9]+", "-", subject.casefold()).strip("-")
    return {
        "subjectSlug": f"{slug}-{level}",
        "subjectName": subject,
        "classLevel": level,
        "department": "general",
        "topic": topic,
        "difficulty": str(max(1, min(3, difficulty))),
        "stem": stem,
        "optionA": choices[0][0],
        "optionB": choices[1][0],
        "optionC": choices[2][0],
        "optionD": choices[3][0],
        "correctIndex": str(correct_index),
        "explanation": "; ".join(explanation_parts),
        "source": "original-draft",
    }


def numeric_item(
    level: str,
    subject: str,
    index: int,
    topic: str,
    stem: str,
    correct: Any,
    correct_reason: str,
    wrong_candidates: list[Any],
    method: str,
    difficulty: int = 2,
) -> dict[str, str]:
    correct_text = format_value(correct)
    wrongs: list[tuple[str, str]] = []
    seen = {normalise(correct_text)}
    for candidate in wrong_candidates:
        if isinstance(candidate, tuple) and len(candidate) == 2:
            value, reason = candidate
        else:
            value = candidate
            reason = f"Using {method} gives {correct_text}, not {format_value(value)}."
        text = format_value(value)
        if normalise(text) in seen:
            continue
        seen.add(normalise(text))
        wrongs.append((text, reason))
        if len(wrongs) == 3:
            break
    step = 1
    while len(wrongs) < 3:
        value = correct + step
        text = format_value(value)
        if normalise(text) not in seen:
            seen.add(normalise(text))
            wrongs.append(
                (
                    text,
                    f"Rechecking {method} gives {correct_text}; {text} does not satisfy the stated calculation.",
                )
            )
        step += 1
    return make_item(
        level,
        subject,
        index,
        topic,
        stem,
        correct_text,
        correct_reason,
        wrongs,
        difficulty,
    )


def math_item(level: str, index: int) -> dict[str, str]:
    rng = seeded_rng(level, "Mathematics", index)
    kind = MATH_KINDS[level][index % len(MATH_KINDS[level])]
    d = 1 if level == "jss1" else 2 if level in {"jss2", "jss3", "ss1"} else 3

    if kind == "addition":
        a, b = rng.randint(23, 899), rng.randint(17, 799)
        answer = a + b
        return numeric_item(level, "Mathematics", index, "Whole-number operations", f"Calculate {a} + {b}.", answer, f"Adding the ones, tens, and hundreds gives {a} + {b} = {answer}.", [(a - b, "This subtracts the second number instead of adding it."), (a * b, "This multiplies the numbers rather than adding them."), (answer + 10, "This is ten too large; the stated addition gives the exact total shown in the solution.")], "addition")
    if kind == "subtraction":
        a, b = rng.randint(120, 999), rng.randint(10, 119)
        answer = a - b
        return numeric_item(level, "Mathematics", index, "Whole-number operations", f"Calculate {a} − {b}.", answer, f"Subtracting {b} from {a} gives {a} − {b} = {answer}.", [(a + b, "This adds the numbers instead of finding their difference."), (b - a, "This reverses the order; the question asks for the larger number minus the smaller one."), (answer + 10, "This is ten too large; direct subtraction gives the value in the solution.")], "subtraction")
    if kind == "multiplication":
        a, b = rng.randint(3, 39), rng.randint(4, 29)
        answer = a * b
        return numeric_item(level, "Mathematics", index, "Whole-number operations", f"Calculate {a} × {b}.", answer, f"Multiplication gives {a} × {b} = {answer}.", [(a + b, "This adds the factors instead of multiplying them."), (answer + a, f"This adds one extra group of {a}; there are exactly {b} groups."), (answer - b, f"This removes {b} from the product even though no subtraction is required.")], "multiplication")
    if kind == "division":
        divisor, quotient = rng.randint(3, 19), rng.randint(4, 49)
        dividend, answer = divisor * quotient, quotient
        return numeric_item(level, "Mathematics", index, "Whole-number operations", f"Calculate {dividend} ÷ {divisor}.", answer, f"Because {divisor} × {quotient} = {dividend}, {dividend} ÷ {divisor} = {quotient}.", [(dividend - divisor, "This subtracts the divisor instead of sharing the dividend into equal groups."), (dividend + divisor, "This adds the divisor instead of dividing."), (divisor, "The divisor is not the quotient; multiplying it by the quotient must recover the dividend.")], "division")
    if kind == "fraction":
        a, b = rng.randint(1, 5), rng.randint(3, 11)
        c, d2 = rng.randint(1, 5), rng.randint(3, 11)
        if b == d2:
            d2 += 1
        f1, f2 = Fraction(a, b), Fraction(c, d2)
        answer = f1 + f2
        wrong1 = Fraction(a + c, b + d2)
        wrong2 = f1 - f2
        wrong3 = f1 * f2
        return numeric_item(level, "Mathematics", index, "Fractions", f"Evaluate {format_value(f1)} + {format_value(f2)}. Give your answer in simplest form.", answer, f"Use a common denominator: {format_value(f1)} + {format_value(f2)} = {format_value(answer)} after simplifying.", [(wrong1, "This adds the denominators as well as the numerators; denominators must first be made common."), (wrong2, "This subtracts the fractions instead of adding them."), (wrong3, "This multiplies numerators and denominators rather than adding the fractions.")], "fraction addition")
    if kind == "percent":
        percent = rng.choice([10, 15, 20, 25, 30, 40, 50, 60, 75])
        quantity = rng.randint(2, 40) * 100
        answer = percent * quantity // 100
        return numeric_item(level, "Mathematics", index, "Percentages", f"Find {percent}% of {quantity}.", answer, f"{percent}% is {percent}/100, so ({percent}/100) × {quantity} = {answer}.", [(quantity - percent, "This subtracts the percentage number from the quantity; it does not find a percentage of it."), (percent * quantity, "This multiplies by the whole percentage number without dividing by 100."), (quantity // percent, "This divides by the percentage number instead of multiplying by percent/100.")], "percentage calculation")
    if kind == "perimeter":
        length, width = rng.randint(5, 45), rng.randint(3, 30)
        answer = 2 * (length + width)
        return numeric_item(level, "Mathematics", index, "Perimeter", f"A rectangle has length {length} cm and width {width} cm. What is its perimeter?", answer, f"Perimeter = 2(length + width) = 2({length} + {width}) = {answer} cm.", [(length * width, "This calculates area, not the total distance around the rectangle."), (length + width, "This counts only one length and one width; the rectangle has two of each."), (2 * length + width, "This counts both lengths but only one width.")], "rectangle perimeter")
    if kind == "area":
        base, height = rng.randint(6, 40), rng.randint(4, 30)
        if base * height % 2:
            height += 1
        answer = base * height // 2
        return numeric_item(level, "Mathematics", index, "Area", f"A triangle has base {base} cm and perpendicular height {height} cm. Find its area.", answer, f"Area = ½ × base × height = ½ × {base} × {height} = {answer} cm².", [(base * height, "This omits the factor one-half in the triangle-area formula."), (base + height, "This adds the measurements instead of using the triangle-area formula."), (2 * (base + height), "This is a perimeter-style calculation, not triangular area.")], "triangle area")
    if kind == "mean":
        values = [rng.randint(4, 60) for _ in range(3)]
        values[-1] += (-(sum(values))) % 3
        answer = sum(values) // 3
        median = sorted(values)[1]
        return numeric_item(level, "Mathematics", index, "Statistics", f"Find the mean of {values[0]}, {values[1]}, and {values[2]}.", answer, f"Mean = sum ÷ count = ({values[0]} + {values[1]} + {values[2]}) ÷ 3 = {answer}.", [(sum(values), "This is the sum, but a mean also requires dividing by the three observations."), (median, "This is the middle value after ordering the data; it is the median, not the mean."), (answer + 3, "This is three too large; dividing the total by three gives the stated mean.")], "arithmetic mean")
    if kind == "unit":
        kilometres = rng.randint(2, 500)
        answer = kilometres * 1000
        return numeric_item(level, "Mathematics", index, "Metric units", f"Convert {kilometres} kilometres to metres. (1 kilometre = 1,000 metres.)", answer, f"Multiply by 1,000: {kilometres} × 1,000 = {answer} metres.", [(kilometres * 100, "This uses 100 rather than the stated 1,000 metres per kilometre."), (kilometres * 10, "This uses a factor of 10, not 1,000."), (kilometres + 1000, "Conversion requires multiplication by 1,000, not addition.")], "kilometre-to-metre conversion")
    if kind == "ratio":
        left, right, unit = rng.randint(2, 7), rng.randint(2, 8), rng.randint(3, 20)
        total = unit * (left + right)
        answer = unit * left
        return numeric_item(level, "Mathematics", index, "Ratio", f"A sum of {total} is shared in the ratio {left}:{right}. How much is the first share?", answer, f"There are {left + right} parts, so each part is {total} ÷ {left + right} = {unit}; the first share is {left} × {unit} = {answer}.", [(unit * right, "This calculates the second share, which has the other ratio number of parts."), (total // left, "This divides the total by the first ratio number but ignores the second number of parts."), (total * left, "This multiplies the total by the ratio term instead of finding one part first.")], "sharing a total in a ratio")
    if kind == "linear":
        a, x, b = rng.randint(2, 9), rng.randint(2, 15), rng.randint(3, 30)
        c = a * x + b
        answer = x
        return numeric_item(level, "Mathematics", index, "Linear equations", f"Solve {a}x + {b} = {c}.", answer, f"Subtract {b}: {a}x = {c - b}; divide by {a}: x = {answer}.", [(c - b, "This stops after isolating ax and does not divide by the coefficient a."), ((c + b) // a, "This adds b instead of subtracting it before dividing."), (x + 1, f"Substitution gives {a}({x + 1}) + {b} = {a * (x + 1) + b}, not {c}; the solution is obtained by inverse operations.")], "solving a linear equation")
    if kind == "volume":
        length, width, height = rng.randint(3, 15), rng.randint(2, 12), rng.randint(2, 10)
        answer = length * width * height
        return numeric_item(level, "Mathematics", index, "Volume", f"Find the volume of a cuboid measuring {length} cm by {width} cm by {height} cm.", answer, f"Volume = length × width × height = {length} × {width} × {height} = {answer} cm³.", [(length * width, "This finds the area of one face and omits the height."), (length + width + height, "This adds dimensions rather than multiplying them for volume."), (2 * (length * width + width * height + length * height), "This calculates surface area, not volume.")], "cuboid volume")
    if kind == "speed":
        time = rng.randint(2, 15)
        speed = rng.randint(5, 40)
        distance = speed * time
        return numeric_item(level, "Mathematics", index, "Speed, distance and time", f"A cyclist travels {distance} km in {time} hours at a steady speed. What is the speed?", speed, f"Speed = distance ÷ time = {distance} ÷ {time} = {speed} km/h.", [(distance + time, "This adds distance and time instead of dividing distance by time."), (time / distance, "This reverses distance and time; speed is distance divided by time."), (distance - time, "This subtracts time rather than calculating a rate.")], "speed calculation")
    if kind == "interest":
        principal = rng.choice([2000, 5000, 8000, 12000, 15000])
        rate = rng.choice([4, 5, 8, 10, 12])
        years = rng.randint(2, 6)
        answer = principal * rate * years // 100
        return numeric_item(level, "Mathematics", index, "Simple interest", f"Find the simple interest on ₦{principal} at {rate}% per year for {years} years.", answer, f"Simple interest = PRT/100 = ({principal} × {rate} × {years})/100 = ₦{answer}.", [(principal * rate, "This omits the time factor and division by 100."), (principal + rate + years, "This adds the inputs instead of applying the simple-interest formula."), (answer + principal, "This adds the principal to the interest; the question asks for interest only.")], "simple-interest formula")
    if kind == "indices":
        base, m, n = rng.randint(2, 9), rng.randint(1, 5), rng.randint(1, 5)
        answer = base ** (m + n)
        return numeric_item(level, "Mathematics", index, "Indices", f"Simplify {base}^{m} × {base}^{n}.", answer, f"For equal bases, add exponents: {base}^{m} × {base}^{n} = {base}^{m + n} = {answer}.", [(base ** (m * n), "This multiplies the exponents; multiplication of equal bases requires adding them."), (base ** (m - n), "This subtracts exponents, a rule for division rather than multiplication."), (base**m + base**n, "This adds the powers instead of combining equal bases.")], "law of indices")
    if kind == "simultaneous":
        x, y = rng.randint(2, 18), rng.randint(1, 15)
        total, difference = x + y, x - y
        if difference <= 0:
            x, y = y + 2, x
            total, difference = x + y, x - y
        return numeric_item(level, "Mathematics", index, "Simultaneous equations", f"If x + y = {total} and x − y = {difference}, find x.", x, f"Add the equations: 2x = {total + difference}; therefore x = {x}.", [(y, "This is the value of y, not x."), (total, "This is the sum x + y, not either variable by itself."), (difference, "This is the difference x − y, not x.")], "solving simultaneous linear equations")
    if kind == "pythagoras":
        a, b, c = rng.choice([(3, 4, 5), (5, 12, 13), (8, 15, 17)])
        scale = rng.randint(1, 100)
        a, b, c = a * scale, b * scale, c * scale
        return numeric_item(level, "Mathematics", index, "Pythagoras' theorem", f"A right triangle has shorter sides {a} cm and {b} cm. Find the hypotenuse.", c, f"By Pythagoras, c² = {a}² + {b}²; taking the positive square root gives c = {c} cm.", [(a + b, "This adds the two shorter sides; the hypotenuse is found from the sum of their squares."), (abs(b - a), "This subtracts the legs and is not the Pythagorean calculation."), (a * b, "This multiplies the legs rather than adding their squares.")], "Pythagorean theorem")
    if kind == "probability":
        total, favourable = rng.randint(6, 20), rng.randint(1, 5)
        favourable = min(favourable, total - 1)
        answer = Fraction(favourable, total)
        return numeric_item(level, "Mathematics", index, "Probability", f"A bag contains {favourable} red counters and {total - favourable} blue counters. What is the probability of selecting a red counter? Give a simplest fraction.", answer, f"Probability = favourable outcomes ÷ total outcomes = {favourable}/{total} = {format_value(answer)}.", [(1 - answer, "This is the probability of the other colour, not red."), Fraction(total, favourable), Fraction(favourable, total + 1)], "probability")
    if kind == "sequence":
        first, difference, n = rng.randint(2, 20), rng.randint(2, 9), rng.randint(5, 18)
        answer = first + (n - 1) * difference
        return numeric_item(level, "Mathematics", index, "Arithmetic sequences", f"An arithmetic sequence begins {first}, {first + difference}, {first + 2 * difference} and has common difference {difference}. Find its {n}th term.", answer, f"The common difference is {difference}; Tₙ = a + (n − 1)d = {first} + ({n} − 1)({difference}) = {answer}.", [(first + n * difference, "This counts n full gaps from the first term; only n−1 gaps lead to term n."), (first * difference, "This multiplies the first term by the difference instead of using the nth-term rule."), (first + difference, f"This gives only the second term, not the {n}th term.")], "arithmetic-sequence nth term")
    if kind == "percent_change":
        original = rng.choice([80, 120, 160, 200, 240, 400, 600, 800, 1000, 1200, 1600, 2000])
        percent = rng.choice([5, 10, 15, 20, 25, 30, 35, 40, 45, 50])
        increase = original * percent // 100
        answer = original + increase
        return numeric_item(level, "Mathematics", index, "Percentage change", f"A price of ₦{original} increases by {percent}%. What is the new price?", answer, f"Increase = {percent}% of {original} = {increase}; new price = {original} + {increase} = ₦{answer}.", [(increase, "This is only the amount of the increase, not the new price."), (original - increase, "This subtracts the increase as if the price had decreased."), (original * (100 + percent), "This uses the percentage number without dividing by 100.")], "percentage increase")
    if kind == "slope":
        x1, x2 = rng.randint(-8, 3), rng.randint(4, 12)
        y1, y2 = rng.randint(-10, 10), rng.randint(-10, 10)
        if y2 == y1:
            y2 += 3
        answer = Fraction(y2 - y1, x2 - x1)
        return numeric_item(level, "Mathematics", index, "Coordinate geometry", f"Find the gradient of the line through ({x1}, {y1}) and ({x2}, {y2}).", answer, f"Gradient = change in y ÷ change in x = ({y2} − {y1})/({x2} − {x1}) = {format_value(answer)}.", [Fraction(x2 - x1, y2 - y1), Fraction(y2 + y1, x2 - x1), answer + 1], "gradient formula")
    if kind == "quadratic":
        r1, r2 = rng.sample(range(-8, 13), 2)
        answer = max(r1, r2)
        total, product = r1 + r2, r1 * r2
        middle = -total
        linear_term = "" if middle == 0 else f" + {middle}x" if middle > 0 else f" − {abs(middle)}x"
        constant_term = f" + {product}" if product > 0 else f" − {abs(product)}" if product < 0 else ""
        equation = f"x²{linear_term}{constant_term} = 0"
        reason = f"The equation factors as (x − ({r1}))(x − ({r2})) = 0, so its roots are {r1} and {r2}; the larger root is {answer}."
        return numeric_item(level, "Mathematics", index, "Quadratic equations", f"Solve {equation} for the larger root.", answer, reason, [(min(r1, r2), "This is the smaller root of the quadratic, not the larger root."), (total, "This is the sum of the roots, not the larger root."), (product, "This is the product of the roots, not a root itself.")], "solving a quadratic by factorisation")
    if kind == "logarithm":
        base, exponent = rng.randint(2, 12), rng.randint(2, 6)
        value = base**exponent
        return numeric_item(level, "Mathematics", index, "Logarithms", f"Evaluate log base {base} of {value}.", exponent, f"A logarithm asks for the exponent: {base}^{exponent} = {value}, so log base {base} of {value} = {exponent}.", [(value, "This is the argument of the logarithm, not the exponent needed to obtain it."), (base, f"This is the base; the required exponent is {exponent}."), (exponent + 1, f"{base}^{exponent + 1} is not {value}; the exponent that produces {value} is {exponent}.")], "logarithm definition")
    if kind == "combination":
        n = rng.randint(6, 20)
        r = rng.randint(2, min(5, n - 1))
        answer = __import__("math").comb(n, r)
        permutation = __import__("math").perm(n, r)
        return numeric_item(level, "Mathematics", index, "Combinations", f"How many groups of {r} can be chosen from {n} different people if order does not matter?", answer, f"Use combinations: C({n},{r}) = {n}!/[{r}!({n}-{r})!] = {answer}; order is not counted.", [(permutation, "This counts arrangements in different orders; the question asks for groups where order does not matter."), (n**r, "This counts ordered selections with replacement, not groups chosen without replacement."), (answer + 1, f"There is no additional group; evaluating the combination formula gives {answer}.")], "combination formula")
    if kind == "matrix":
        a, b, c, d2 = rng.randint(1, 8), rng.randint(1, 8), rng.randint(1, 8), rng.randint(1, 8)
        answer = a * d2 - b * c
        return numeric_item(level, "Mathematics", index, "Matrices", f"Find the determinant of the matrix [[{a}, {b}], [{c}, {d2}]].", answer, f"For a 2×2 matrix, determinant = ad − bc = ({a}×{d2}) − ({b}×{c}) = {answer}.", [(a * d2 + b * c, "This adds the cross-products; the determinant formula subtracts bc from ad."), (a + d2 - b - c, "This adds and subtracts entries rather than using the determinant formula."), (a * b * c * d2, "This multiplies all four entries; the 2×2 determinant uses two products and their difference.")], "2×2 determinant")
    if kind == "derivative":
        coefficient, power, x = rng.randint(2, 8), rng.randint(2, 5), rng.randint(1, 5)
        answer = coefficient * power * (x ** (power - 1))
        return numeric_item(level, "Mathematics", index, "Differentiation", f"If f(x) = {coefficient}x^{power}, find f′({x}).", answer, f"The power rule gives f′(x) = {coefficient}×{power}x^{power - 1}; substituting x={x} gives {answer}.", [(coefficient * (x**power), "This evaluates the original function rather than differentiating it."), (coefficient * power * (x**power), "This keeps the original power of x instead of reducing the exponent by one."), (coefficient * (power - 1) * (x**power), "This uses the reduced exponent as a coefficient and does not apply the power rule correctly.")], "power rule for differentiation", 3)
    raise ValueError(f"Unknown mathematics item kind: {kind}")


VERBS = [
    ("study", "studies", "studied", "studying"),
    ("carry", "carries", "carried", "carrying"),
    ("watch", "watches", "watched", "watching"),
    ("play", "plays", "played", "playing"),
    ("teach", "teaches", "taught", "teaching"),
    ("wash", "washes", "washed", "washing"),
    ("visit", "visits", "visited", "visiting"),
    ("write", "writes", "wrote", "writing"),
    ("build", "builds", "built", "building"),
    ("plan", "plans", "planned", "planning"),
    ("prepare", "prepares", "prepared", "preparing"),
    ("organise", "organises", "organised", "organising"),
    ("finish", "finishes", "finished", "finishing"),
    ("discuss", "discusses", "discussed", "discussing"),
    ("help", "helps", "helped", "helping"),
]

SUBJECTS = [
    ("The pupil", True),
    ("Each learner", True),
    ("The players", False),
    ("My cousins", False),
    ("Neither student", True),
    ("Both teachers", False),
    ("One pupil from each class", True),
    ("Several classmates", False),
    ("Everyone in the class", True),
    ("The nurse", True),
    ("My brother and I", False),
    ("Many children", False),
    ("One of the students", True),
    ("The captain", True),
    ("Some visitors", False),
    ("The class representative", True),
    ("Several volunteers", False),
    ("Those workers", False),
    ("The gardener", True),
    ("Several musicians", False),
    ("Every member of the club", True),
    ("The twins", False),
    ("One of the coaches", True),
    ("The shop assistants", False),
    ("Nobody in the room", True),
    ("The science monitor", True),
    ("All candidates", False),
    ("The neighbours", False),
    ("The choir members", False),
    ("My aunt", True),
    ("The class monitors", False),
    ("Many families", False),
    ("The principal", True),
    ("Each volunteer", True),
    ("Neither of the pupils", True),
    ("The parents", False),
    ("Some athletes", False),
    ("One parent", True),
    ("The student and the teacher", False),
    ("Every member of the team", True),
    ("The guides", False),
    ("The head teacher", True),
]


def english_item(level: str, index: int) -> dict[str, str]:
    rng = seeded_rng(level, "English Language", index)
    kind = index % 10
    variant = index // 10 + LEVELS.index(level) * 37
    if kind == 0:
        subject, singular = SUBJECTS[variant % len(SUBJECTS)]
        subject_text = subject[0].lower() + subject[1:]
        answer = "has" if singular else "have"
        wrongs = [
            ("have" if singular else "has", "This simple-present form does not agree with the singular or plural subject."),
            ("had", "‘Had’ is past tense; the prompt explicitly requires the simple present."),
            ("having", "‘Having’ is a non-finite form and cannot complete this simple-present sentence by itself."),
        ]
        stem = f"Choose the simple-present form of ‘have’ to complete the sentence: Every weekday, {subject_text} ___ enough time to prepare for class."
        return make_item(level, "English Language", index, "Subject–verb agreement", stem, answer, f"The subject ‘{subject}’ is {'singular' if singular else 'plural'}, so the simple-present form of ‘have’ is ‘{answer}’. ", wrongs, 1 if level == "jss1" else 2)
    if kind == 1:
        base, third, past, ing = VERBS[variant % len(VERBS)]
        subject = ["the class", "Amina", "the visitors", "our team", "the two students", "the driver"][variant % 6]
        objects = {
            "study": ["the revision notes", "the lesson"],
            "carry": ["a box of books", "the parcel"],
            "watch": ["a football match", "the short film"],
            "play": ["a team game", "the piano"],
            "teach": ["a science lesson", "the new topic"],
            "wash": ["the school uniform", "the laboratory glassware"],
            "visit": ["the museum", "the community centre"],
            "write": ["a short story", "the class report"],
            "build": ["a wooden model", "the small bridge"],
            "plan": ["the class event", "the journey"],
            "prepare": ["a science demonstration", "the evening meal"],
            "organise": ["a reading session", "the school event"],
            "finish": ["the class assignment", "the painting"],
            "discuss": ["the project", "the story"],
            "help": ["a new learner", "the class monitor"],
        }
        object_phrase = objects[base][(variant // len(VERBS)) % 2]
        answer = past
        wrongs = [
            (base, "The time marker ‘Yesterday’ requires a past-tense verb in this sentence."),
            (third, "This is a simple-present form, but the sentence is explicitly set in the past."),
            (ing, "The -ing form requires an auxiliary and does not match the past-time marker by itself."),
        ]
        return make_item(level, "English Language", index, "Verb tense", f"Yesterday, {subject} ___ {object_phrase}.", answer, f"‘Yesterday’ places the action in the past; the past form of {base} is {past}.", wrongs)
    if kind == 2:
        recipients = [
            ("the girl", "her"), ("the boy", "him"), ("the children", "them"),
            ("the boy named Musa", "him"), ("the girl named Zainab", "her"), ("the visitors", "them"),
            ("the male teacher", "him"), ("the female nurse", "her"), ("the twins", "them"),
            ("the players", "them"), ("the boy named Tunde", "him"), ("the girl named Aisha", "her"),
            ("the male visitor", "him"), ("the female learner", "her"), ("the musicians", "them"),
            ("the girl named Bisi", "her"), ("the boy named Emeka", "him"), ("the farmers", "them"),
            ("the male athlete", "him"), ("the female poet", "her"), ("the siblings", "them"),
            ("the girl named Hauwa", "her"), ("the boy named Chidi", "him"), ("the nurses", "them"),
            ("the male actor", "him"), ("the female artist", "her"), ("the guests", "them"),
            ("the male mechanic", "him"), ("the female pupil", "her"), ("the dancers", "them"),
            ("the boy named Sola", "him"), ("the girl named Ngozi", "her"), ("the guides", "them"),
            ("the male clerk", "him"), ("the female player", "her"), ("the classmates", "them"),
        ]
        recipient, answer = recipients[variant % len(recipients)]
        pool = ["him", "her", "them", "it"]
        wrongs = []
        for candidate in pool:
            if candidate == answer or len(wrongs) == 3:
                continue
            reason = "This object pronoun does not agree in number or the explicitly stated gender with the recipient."
            if candidate == "it":
                reason = "‘It’ refers to a thing or animal here, not to the person or people named as the recipient."
            wrongs.append((candidate, reason))
        return make_item(level, "English Language", index, "Pronouns", f"Which object pronoun replaces {recipient}? The guide handed the map to {recipient} and later gave it to ___.", answer, f"The blank follows the preposition ‘to’ and refers to {recipient}, so the correct object pronoun is {answer}.", wrongs)
    if kind == 3:
        pairs = [("clear", "clearly"), ("careful", "carefully"), ("quiet", "quietly"), ("patient", "patiently"), ("bright", "brightly"), ("polite", "politely"), ("calm", "calmly"), ("accurate", "accurately"), ("gentle", "gently"), ("confident", "confidently"), ("quick", "quickly"), ("soft", "softly")]
        adjective, answer = pairs[variant % len(pairs)]
        subject = ["speaker", "runner", "reader", "student", "musician", "presenter"][variant % 6]
        event = [
            "presentation", "race", "storytelling session", "lesson", "concert", "interview", "debate", "meeting", "announcement", "rehearsal",
            "reading exercise", "competition", "ceremony", "discussion", "broadcast", "speech", "practice", "performance", "class", "assembly",
            "workshop", "audition", "recital", "report", "demonstration", "conversation", "final", "conference", "lesson review", "school event",
        ][variant % 30]
        wrongs = [
            (adjective, "The adjective describes a noun; the blank modifies the action and needs an adverb."),
            (answer + "ly", "This adds an extra suffix and is not the standard adverb form of the given adjective."),
            ("more " + adjective, "This is a comparative adjective phrase, not an adverb describing how the action is done."),
        ]
        return make_item(level, "English Language", index, "Adverbs", f"The {subject} spoke ___ during the {event}.", answer, f"The blank modifies the verb ‘spoke’; {answer} is the adverb form of {adjective}.", wrongs)
    if kind == 4:
        pairs = [
            ("The match was postponed", "heavy rain had flooded the field"),
            ("Mira carried an umbrella", "the forecast predicted rain"),
            ("The class stayed indoors", "the storm was still passing"),
            ("The team practised", "the coach had booked the field"),
            ("The road was closed", "a fallen tree blocked it"),
            ("Kola wore a coat", "the morning was cold"),
            ("We waited under the shelter", "the rain had not stopped"),
            ("The students revised", "the examination was approaching"),
            ("The lights went out", "the power supply failed"),
            ("The library was quiet", "many learners were reading"),
            ("The pupils left the hall", "the event had ended"),
            ("The shop opened late", "the delivery arrived after sunrise"),
            ("The farmer watered the seedlings", "the soil had become dry"),
            ("The driver slowed down", "the road was slippery"),
            ("The team changed its plan", "the first approach had failed"),
            ("The child drank water", "the afternoon was hot"),
            ("The village repaired the footpath", "heavy rain had damaged it"),
            ("The class repeated the experiment", "the first result was unclear"),
            ("The guard locked the gate", "the visitors had gone home"),
            ("The baker prepared more bread", "the morning demand was high"),
            ("The players rested", "the match had ended"),
            ("The gardener moved the pots", "the wind was becoming stronger"),
            ("The students used a torch", "the room was dark"),
            ("The mechanic checked the tyre", "the vehicle was pulling to one side"),
            ("The family stored clean water", "the supply was expected to stop"),
            ("The teacher repeated the instruction", "some learners had not heard it"),
            ("The musician tuned the instrument", "its notes sounded incorrect"),
            ("The cyclist wore a helmet", "a helmet reduces the risk of head injury"),
            ("The seedlings grew well", "they received enough water and light"),
            ("The team won the final", "the players cooperated and followed their plan"),
        ]
        first, second = pairs[variant % len(pairs)]
        answer = "because"
        choices = ["because", "although", "unless", "so"]
        wrongs = []
        reasons = {
            "although": "It signals contrast, but the second clause gives the cause of the first clause.",
            "unless": "It means ‘if not’; the sentence is not stating a negative condition.",
            "so": "It introduces a result, but this sentence gives the cause of the first clause after it.",
        }
        for choice in choices:
            if choice != answer and len(wrongs) < 3:
                wrongs.append((choice, reasons[choice]))
        return make_item(level, "English Language", index, "Conjunctions", f"Choose the conjunction that introduces the reason: {first} ___ {second}.", answer, f"{second} explains the reason or time condition for the first clause, so {answer} gives the intended relationship.", wrongs)
    if kind == 5:
        expressions = [
            ("8:15 in the morning", "at"), ("noon", "at"), ("Monday morning", "on"), ("July", "in"),
            ("the evening", "in"), ("midnight", "at"), ("Friday", "on"), ("2027", "in"),
            ("the first day of June", "on"), ("4:20 in the afternoon", "at"), ("winter", "in"), ("the exact moment the bell rings", "at"),
            ("sunrise", "at"), ("sunset", "at"), ("Tuesday afternoon", "on"), ("the morning", "in"),
            ("dusk", "at"), ("the first week of August", "in"), ("the second of May", "on"),
            ("6:30 in the evening", "at"), ("October 2026", "in"), ("nightfall", "at"),
            ("the beginning of the lesson", "at"), ("the end of the month", "at"),
            ("Thursday evening", "on"), ("the dry season", "in"), ("a quarter past seven", "at"),
            ("the first Monday in June", "on"), ("the afternoon", "in"), ("the start of the school year", "at"),
        ]
        expression, answer = expressions[variant % len(expressions)]
        wrongs = [(candidate, f"The conventional preposition for the time expression ‘{expression}’ is not ‘{candidate}’; {answer} is used here.") for candidate in ["at", "in", "on", "by"] if candidate != answer][:3]
        return make_item(level, "English Language", index, "Prepositions of time", f"The school assembly begins ___ {expression}.", answer, f"Standard time expressions use ‘{answer} {expression}’ in this context.", wrongs)
    if kind == 6:
        adjectives = [
            "bright", "small", "strong", "kind", "wide", "fast", "safe", "tall", "hard", "long",
            "warm", "light", "quick", "slow", "dark", "clean", "cold", "short", "high", "low",
            "deep", "loud", "clear", "sharp", "sweet", "cool", "neat", "firm", "fresh", "thick",
        ]
        adjective = adjectives[variant % len(adjectives)]
        answer = adjective[:-1] + "est" if adjective.endswith("e") else adjective + "est"
        comparative = adjective[:-1] + "er" if adjective.endswith("e") else adjective + "er"
        wrongs = [
            (adjective, "This is the positive form; it does not express the highest degree."),
            (comparative, "This comparative form compares two items; the superlative expresses the highest degree."),
            ("most " + adjective, "The prompt asks for the standard single-word superlative form, not a two-word construction."),
        ]
        stem = f"What is the standard single-word superlative of the adjective ‘{adjective}’?"
        return make_item(level, "English Language", index, "Comparative and superlative adjectives", stem, answer, f"The standard single-word superlative of the short adjective {adjective} is formed with -est: {answer}.", wrongs)
    if kind == 7:
        nouns = [
            ("umbrella", "an"), ("book", "a"), ("honest learner", "an"), ("uniform", "a"),
            ("orange", "an"), ("European country", "a"), ("hour", "an"), ("useful tool", "a"),
            ("engine", "an"), ("one-way street", "a"), ("island", "an"), ("university", "a"),
            ("apple", "an"), ("yellow shirt", "a"), ("important notice", "an"), ("horse", "a"),
            ("old house", "an"), ("uniformed officer", "a"), ("empty basket", "an"), ("small bell", "a"),
            ("hourglass", "an"), ("unique idea", "a"), ("elephant", "an"), ("bright star", "a"),
            ("interesting book", "an"), ("large box", "a"), ("airport", "an"), ("quiet room", "a"),
            ("unusual event", "an"), ("blue bicycle", "a"),
        ]
        noun, answer = nouns[variant % len(nouns)]
        wrongs = [("a" if answer == "an" else "an", "The article is selected by the opening sound, not merely the first written letter."), ("the", "‘The’ refers to a specific known item; the sentence requires an indefinite article."), ("some", "‘Some’ is not the singular count-noun article required before this noun phrase.")]
        return make_item(level, "English Language", index, "Articles", f"Choose the indefinite article that correctly begins this noun phrase: ___ {noun}.", answer, f"The opening sound of ‘{noun}’ is {'a vowel sound' if answer == 'an' else 'a consonant sound'}, so the indefinite article is ‘{answer}’.", wrongs)
    if kind == 8:
        nouns = [
            "girls", "players", "teachers", "farmers", "visitors", "students", "workers", "dancers", "writers", "drivers",
            "nurses", "singers", "artists", "pilots", "actors", "bakers", "pupils", "doctors", "runners", "gardeners",
            "reporters", "neighbours", "helpers", "captains", "volunteers", "friends", "brothers", "sisters", "cyclists", "farmhands",
        ]
        plural = nouns[variant % len(nouns)]
        singular = plural[:-1] if plural.endswith("s") else plural
        answer = plural + "'"
        wrongs = [(singular, "This is the singular noun and does not show possession by the whole plural group."), (singular + "'s", "This marks singular possession; the noun in the sentence is plural."), (plural + "'s", "This adds the singular possessive ending to an already plural noun; standard plural possession uses an apostrophe after the final s.")]
        return make_item(level, "English Language", index, "Possessive apostrophes", f"Which plural possessive form of ‘{plural}’ completes the sentence: The ___ bags were placed beside the classroom door?", answer, f"The bags belong to the plural group ‘{plural}’; regular plural possession places the apostrophe after the final s: {answer}.", wrongs)
    # kind 9: relative pronouns.
    person = [
        "student", "doctor", "driver", "teacher", "artist", "farmer", "athlete", "writer", "visitor", "engineer",
        "nurse", "musician", "pilot", "baker", "gardener", "reporter", "volunteer", "captain", "cyclist", "scientist",
        "carpenter", "presenter", "dancer", "photographer", "coach", "librarian", "mechanic", "composer", "neighbour", "researcher",
    ][variant % 30]
    answer = "who"
    wrongs = [
        ("whom", "‘Whom’ is an object form; the blank is the subject performing the action ‘won’."),
        ("which", "‘Which’ normally refers to things or animals, not the person described here."),
        ("whose", "‘Whose’ marks possession, but the blank needs a subject relative pronoun."),
    ]
    return make_item(level, "English Language", index, "Relative pronouns", f"The {person} ___ won the award thanked the audience.", answer, "‘Who’ refers to a person and acts as the subject of the verb ‘won’ in the relative clause.", wrongs)


def fact_item(level: str, subject: str, index: int, facts: list[tuple[str, str, str]]) -> dict[str, str]:
    if not facts:
        raise ValueError(f"No fact cards for {subject}")
    rng = seeded_rng(level, subject, index, "fact-card")
    sequence = index + LEVELS.index(level) * len(facts) * 3
    topic, term, definition = facts[sequence % len(facts)]
    frame = FRAMES[(sequence // len(facts)) % len(FRAMES)]
    stem = frame.format(definition=definition)
    distractors = [fact for fact in facts if fact[1] != term]
    selected = rng.sample(distractors, 3)
    wrongs = [
        (
            other_term,
            f"{other_term.capitalize()} refers to {other_definition}; the description instead defines {term}.",
        )
        for _, other_term, other_definition in selected
    ]
    return make_item(
        level,
        subject,
        index,
        topic,
        stem,
        term,
        f"{term.capitalize()} is correct because it means {definition}.",
        wrongs,
        1 if level in {"jss1", "jss2"} else 2,
    )


def science_numeric(level: str, index: int) -> dict[str, str]:
    rng = seeded_rng(level, "Basic Science", index, "calculation")
    if index % 2 == 0:
        volume = rng.randint(2, 15)
        density = rng.randint(2, 12)
        mass = volume * density
        return numeric_item(level, "Basic Science", index, "Density", f"A sample has mass {mass} g and volume {volume} cm³. What is its density?", density, f"Density = mass ÷ volume = {mass} ÷ {volume} = {density} g/cm³.", [(mass + volume, "This adds mass and volume instead of dividing mass by volume."), (volume / mass, "This reverses the formula; density is mass divided by volume."), (mass - volume, "This subtracts the measurements and does not calculate density.")], "density formula")
    time = rng.randint(2, 12)
    speed = rng.randint(3, 20)
    distance = time * speed
    return numeric_item(level, "Basic Science", index, "Speed", f"A learner walks {distance} m in {time} s at a steady rate. What is the speed?", speed, f"Speed = distance ÷ time = {distance} ÷ {time} = {speed} m/s.", [(distance + time, "This adds distance and time rather than calculating a rate."), (Fraction(time, distance), "This reverses the required ratio; speed is distance divided by time."), (distance - time, "This subtracts time instead of dividing distance by time.")], "speed formula")


def distinct_integers(correct: int, candidates: list[int], limit: int = 255) -> list[int]:
    values: list[int] = []
    for value in candidates:
        if 0 <= value <= limit and value != correct and value not in values:
            values.append(value)
        if len(values) == 3:
            return values
    fallback = 0
    while len(values) < 3:
        value = (correct + fallback + 1) % (limit + 1)
        fallback += 1
        if value != correct and value not in values:
            values.append(value)
    return values


def computer_numeric(level: str, index: int) -> dict[str, str]:
    rng = seeded_rng(level, "Computer Studies", index, "number-systems")
    kind = index % 3
    if kind == 0:
        decimal = rng.randint(12, 245)
        answer = format(decimal, "08b")
        wrong_values = distinct_integers(decimal, [decimal ^ 1, decimal ^ 2, decimal ^ 4, int(answer[::-1], 2)])
        wrongs = [(format(value, "08b"), f"Reading this binary option in base two gives {value}, not the required decimal value {decimal}.") for value in wrong_values]
        return make_item(level, "Computer Studies", index, "Binary numbers", f"Write the decimal number {decimal} as an 8-bit binary number.", answer, f"Expressing {decimal} as powers of two gives the bit pattern {answer}.", wrongs)
    if kind == 1:
        bits = format(rng.randint(12, 240), "08b")
        answer = int(bits, 2)
        wrong_values = distinct_integers(answer, [int(bits[::-1], 2), answer ^ 1, answer ^ 2, int(bits[1:] + "0", 2)])
        wrongs = [(str(value), f"Converting the stated 8-bit pattern {bits} from base two gives {answer}, not {value}.") for value in wrong_values]
        return make_item(level, "Computer Studies", index, "Binary numbers", f"Convert the 8-bit binary number {bits} to decimal.", str(answer), f"Adding the place values represented by 1s in {bits} gives {answer} in base ten.", wrongs)
    kib = rng.randint(2, 24)
    answer = kib * 1024
    return numeric_item(level, "Computer Studies", index, "Data storage units", f"How many bytes are in {kib} KiB? Use 1 KiB = 1,024 bytes.", answer, f"{kib} × 1,024 = {answer} bytes.", [(kib * 1000, "This uses 1,000 bytes per unit; the question explicitly defines a KiB as 1,024 bytes."), (kib + 1024, "This adds the values instead of multiplying the number of KiB by 1,024."), (kib * 100, "This uses a factor of 100 rather than the stated 1,024." )], "binary storage-unit conversion")


def biology_numeric(level: str, index: int) -> dict[str, str]:
    rng = seeded_rng(level, "Biology", index, "calculation")
    if index % 3 == 0:
        image = rng.randint(12, 96)
        magnification = rng.choice([20, 25, 40, 50, 100])
        object_size = image / magnification
        return numeric_item(level, "Biology", index, "Microscopy", f"An image is {image} mm long at ×{magnification} magnification. What is the object's actual length in mm?", Fraction(image, magnification), f"Actual size = image size ÷ magnification = {image} ÷ {magnification} = {format_value(Fraction(image, magnification))} mm.", [(image * magnification, "This multiplies by magnification; actual size is found by dividing image size by magnification."), Fraction(magnification, image), Fraction(image + magnification, magnification)], "magnification formula")
    if index % 3 == 1:
        dominant, recessive = "R", "r"
        return make_item(level, "Biology", index, "Genetics", "In a cross Rr × rr, what proportion of offspring is expected to have genotype rr?", "50%", "The first parent can pass R or r; the second can pass only r. One of the two equally likely offspring genotypes is rr, so the proportion is 1/2 or 50%.", [("25%", "This would be one out of four equally likely outcomes; the cross has two equally likely genotype outcomes, one of which is rr."), ("75%", "This counts three out of four outcomes, which does not match the two-outcome cross Rr × rr."), ("100%", "The Rr parent can pass R as well as r, so not every offspring is rr.")], 3)
    area = rng.randint(2, 25)
    individuals = rng.randint(30, 250)
    answer = Fraction(individuals, area)
    return numeric_item(level, "Biology", index, "Ecology", f"A field of {area} m² contains {individuals} plants. What is the population density per m²?", answer, f"Population density = number of individuals ÷ area = {individuals} ÷ {area} = {format_value(answer)} plants/m².", [(individuals * area, "This multiplies the count by the area; density is the count divided by area."), Fraction(area, individuals), individuals - area], "population-density formula")


def chemistry_numeric(level: str, index: int) -> dict[str, str]:
    rng = seeded_rng(level, "Chemistry", index, "calculation")
    if index % 3 == 0:
        atomic_number = rng.randint(3, 20)
        neutrons = rng.randint(3, 24)
        mass_number = atomic_number + neutrons
        return numeric_item(level, "Chemistry", index, "Atomic structure", f"An atom has proton number {atomic_number} and mass number {mass_number}. How many neutrons does it have?", neutrons, f"Neutrons = mass number − proton number = {mass_number} − {atomic_number} = {neutrons}.", [(mass_number + atomic_number, "This adds proton number to mass number; neutrons are found by subtracting."), (atomic_number, "This is the number of protons, not neutrons."), (mass_number, "This is the total number of protons and neutrons, not the neutron count alone.")], "neutron-number calculation")
    if index % 3 == 1:
        molar_mass = rng.choice([18, 28, 32, 44, 58])
        moles = rng.randint(2, 8)
        mass = molar_mass * moles
        return numeric_item(level, "Chemistry", index, "The mole", f"A substance has molar mass {molar_mass} g/mol. What mass is present in {moles} mol?", mass, f"Mass = amount × molar mass = {moles} × {molar_mass} = {mass} g.", [(molar_mass + moles, "This adds instead of multiplying amount by molar mass."), (molar_mass // moles, "This divides in the wrong direction; the required mass is n × M."), (mass + molar_mass, "This adds one extra molar mass after the correct product.")], "mass–mole relationship")
    c = rng.randint(1, 8)
    volume = rng.choice([1, 2, 4, 5])
    amount = c * volume
    return numeric_item(level, "Chemistry", index, "Solution concentration", f"A solution contains {amount} mol of solute in {volume} dm³. What is its concentration in mol/dm³?", c, f"Concentration = amount ÷ volume = {amount} ÷ {volume} = {c} mol/dm³.", [(amount * volume, "This multiplies by volume; concentration is amount divided by volume."), (volume / amount, "This reverses amount and volume."), (amount + volume, "This adds the values rather than calculating amount per unit volume.")], "concentration formula")


def physics_numeric(level: str, index: int) -> dict[str, str]:
    rng = seeded_rng(level, "Physics", index, "calculation")
    kind = index % 4
    if kind == 0:
        time = rng.randint(2, 15)
        speed = rng.randint(4, 24)
        distance = speed * time
        return numeric_item(level, "Physics", index, "Motion", f"A vehicle travels {distance} m in {time} s. Find its average speed.", speed, f"Average speed = distance ÷ time = {distance} ÷ {time} = {speed} m/s.", [(distance + time, "This adds distance and time rather than dividing to find a rate."), Fraction(time, distance), distance - time], "speed formula")
    if kind == 1:
        mass, acceleration = rng.randint(2, 30), rng.randint(2, 12)
        force = mass * acceleration
        return numeric_item(level, "Physics", index, "Forces", f"A {mass} kg object accelerates at {acceleration} m/s². Find the resultant force.", force, f"Newton's second law gives F = ma = {mass} × {acceleration} = {force} N.", [(mass + acceleration, "This adds mass and acceleration instead of multiplying them."), (force + mass, "This adds mass after applying the formula; F = ma only."), (Fraction(mass, acceleration), "This divides instead of using F = ma.")], "Newton's second law")
    if kind == 2:
        voltage = rng.randint(4, 48)
        resistance = rng.randint(2, 12)
        if voltage % resistance:
            resistance = 2
            voltage = 2 * rng.randint(3, 24)
        current = voltage // resistance
        return numeric_item(level, "Physics", index, "Electricity", f"A {voltage} V supply is connected across a {resistance} Ω resistor. Find the current.", current, f"Ohm's law gives I = V/R = {voltage}/{resistance} = {current} A.", [(voltage * resistance, "This multiplies voltage and resistance; current is voltage divided by resistance."), (resistance / voltage, "This reverses voltage and resistance."), (voltage - resistance, "This subtracts the measurements rather than using Ohm's law.")], "Ohm's law")
    force, distance = rng.randint(3, 25), rng.randint(2, 18)
    work = force * distance
    return numeric_item(level, "Physics", index, "Work", f"A force of {force} N moves an object {distance} m in the force's direction. How much work is done?", work, f"Work = force × displacement = {force} × {distance} = {work} J.", [(force + distance, "This adds force and distance rather than multiplying them."), (work + force, "This adds extra force after the correct product."), (Fraction(force, distance), "This divides force by distance instead of calculating work.")], "work formula")


def generate(level: str, subject: str, index: int) -> dict[str, str]:
    if subject == "Mathematics":
        return math_item(level, index)
    if subject == "English Language":
        return english_item(level, index)
    if subject == "Computer Studies":
        if index % 4 == 3:
            fact_index = index // 4
            return fact_item(level, subject, fact_index, FACTS[subject])
        return computer_numeric(level, index)
    if subject == "Basic Science":
        if index % 3 != 0:
            return fact_item(level, subject, index - (index // 3 + 1), FACTS[subject])
        return science_numeric(level, index)
    if subject == "Social Studies":
        return fact_item(level, subject, index, FACTS[subject])
    if subject == "Biology":
        if index % 3 == 0:
            return biology_numeric(level, index)
        return fact_item(level, subject, index - (index // 3 + 1), FACTS[subject])
    if subject == "Chemistry":
        if index % 3 == 0:
            return chemistry_numeric(level, index)
        return fact_item(level, subject, index - (index // 3 + 1), FACTS[subject])
    if subject == "Physics":
        if index % 3 == 0:
            return physics_numeric(level, index)
        return fact_item(level, subject, index - (index // 3 + 1), FACTS[subject])
    if subject in {"Government", "Economics", "Literature in English"}:
        return fact_item(level, subject, index, FACTS[subject])
    raise ValueError(f"No generator for {subject}")


def main() -> None:
    rows: list[dict[str, str]] = []
    stems: set[tuple[str, str]] = set()
    per_level: Counter[str] = Counter()
    per_subject: Counter[str] = Counter()

    for subject, class_counts in COUNTS.items():
        for level in LEVELS:
            count = class_counts.get(level, 0)
            for index in range(count):
                row = None
                for retry in range(200):
                    # Keep the question family stable for arithmetic/grammar
                    # items while changing its deterministic parameters.
                    candidate_index = index + retry * 1010
                    candidate = generate(level, subject, candidate_index)
                    key = (candidate["subjectSlug"], normalise(candidate["stem"]))
                    if key not in stems:
                        row = candidate
                        break
                if row is None:
                    raise ValueError(f"Could not generate a unique stem: {level}/{subject}/{index}")
                key = (row["subjectSlug"], normalise(row["stem"]))
                stems.add(key)
                options = [row[f"option{letter}"] for letter in "ABCD"]
                correct_index = int(row["correctIndex"])
                if len({normalise(option) for option in options}) != 4:
                    raise ValueError(f"Duplicate options: {key}")
                if not 0 <= correct_index < 4:
                    raise ValueError(f"Invalid answer index: {key}")
                if not all(f"{letter}: " in row["explanation"] for letter in "ABCD"):
                    raise ValueError(f"Missing option rationale: {key}")
                if "common distractor" in row["explanation"].casefold():
                    raise ValueError(f"Generic distractor rationale: {key}")
                rows.append(row)
                per_level[level] += 1
                per_subject[subject] += 1

    if len(rows) != 10_000:
        raise ValueError(f"Expected 10,000 rows, generated {len(rows)}")

    fieldnames = [
        "subjectSlug", "subjectName", "classLevel", "department", "topic", "term", "difficulty",
        "stem", "optionA", "optionB", "optionC", "optionD", "correctIndex", "explanation", "source",
    ]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows):,} original draft questions: {OUTPUT.relative_to(ROOT)}")
    print("Rows by level:", dict(per_level))
    print("Rows by subject:", dict(per_subject))
    print("All rows have four unique options and four option-level rationales.")
    print("FACTUAL STATUS: NOT VERIFIED against official NERDC/WAEC syllabi; all rows remain drafts.")


if __name__ == "__main__":
    main()
