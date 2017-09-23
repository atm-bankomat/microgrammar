import { InputState } from "../InputState";
import { LazyMatchingLogic, Matcher, MatchingLogic, Term } from "../Matchers";
import { isSuccessfulMatch, MatchFailureReport, MatchPrefixResult, matchPrefixSuccess } from "../MatchPrefixResult";
import { Microgrammar } from "../Microgrammar";
import {
    ComputedThing,
    isSpecialMember, isTreePatternMatch, NestedThing, PatternMatch, ScalarThing, TerminalPatternMatch,
    ThingInsideATreePatternMatch,
    TreePatternMatch,
} from "../PatternMatch";
import { Literal, Regex } from "../Primitives";

import { SkipCapable, WhiteSpaceHandler } from "../Config";
import { Break } from "../internal/Break";
import { readyToMatch } from "../internal/Whitespace";

/**
 * Represents something that can be passed into a microgrammar
 */
export type TermDef = Term | string | RegExp;

export interface MatchVeto { $id: string; veto: ((ctx: {}, thisMatchContext: {}, parseContext: {}) => boolean); }
export interface ContextComputation { $id: string; compute: ((ctx: {}) => any); }

function isMatchVeto(thing: MatchStep): thing is MatchVeto {
    return isSpecialMember(thing.$id);
}

/**
 * Represents a step during matching. Can be a matcher or a function,
 * that can work on the context and return a fresh value.
 */
export type MatchStep = Matcher | MatchVeto | ContextComputation;

const methodsOnEveryMatchingLogic = ["$id", "matchPrefix", "canStartWith", "requiredPrefix"];

/**
 * Represents a concatenation of multiple matchers. This is the normal
 * way we compose matches, although this class needn't be used explicitly,
 * as Microgrammars use it, via fromDefinitions or by composition involving
 * an object literal which will be converted to a Concat.
 * Users should only create Concats directly in the unusual case where they need
 * to control whitespace handling in a unique way for that particular Concat.
 */
export class Concat implements LazyMatchingLogic, WhiteSpaceHandler, SkipCapable {

    /**
     * Normal way to create a Concat. If a $lazy field
     * is set to true, the Concat will be lazily initialized, and
     * _init() must be called before use.
     * @param definitions
     * @return {Concat}
     */
    public static of(definitions: any): Concat {
        const concat = new Concat(definitions);
        if (definitions.$lazy !== true) {
            concat._init();
        }
        return concat;
    }

    public $consumeWhiteSpaceBetweenTokens: boolean = true;

    public $skipGaps = false;

    public $lazy = false;

    public readonly matchSteps: MatchStep[] = [];

    // Used to check first matcher. We want to do that to check
    // for required prefix etc.
    private firstMatcher: Matcher;

    private constructor(public definitions: any) { }

    /**
     * Evaluate all members to ready this Concat for use.
     * Only call this function after using the lazy static factory method:
     * _init is called automatically in the case of the regular Concat.of
     * function
     */
    public _init() {
        for (const stepName in this.definitions) {
            if (methodsOnEveryMatchingLogic.indexOf(stepName) === -1) {
                const def = this.definitions[stepName];
                if (def === undefined || def === null) {
                    throw new Error(`Invalid concatenation: Step [${stepName}] is ${def}`);
                }
                if (stepName.charAt(0) === "$") {
                    // It's a config property. Copy it over.
                    this[stepName] = def;
                } else if (typeof def === "function") {
                    // It's a calculation function
                    if (def.length === 0 && stepName !== "_init") {
                        // A no arg function is invalid
                        throw new Error(`No arg function [${stepName}] is invalid as a matching step`);
                    }
                    if (isSpecialMember(stepName)) {
                        this.matchSteps.push({ $id: stepName, veto: def });
                    } else {
                        this.matchSteps.push({ $id: stepName, compute: def });
                    }
                } else {
                    // It's a normal matcher
                    const m = toMatchingLogic(def);
                    // If we are skipping gaps, skip between productions
                    const named = new NamedMatcher(stepName,
                        this.$skipGaps === true ? new Break(m, true) : m);
                    this.matchSteps.push(named);
                }
            }
        }
        this.firstMatcher = this.matchSteps.filter(s => isMatcher(s))[0] as Matcher;
    }

    get $id() {
        return (this.definitions.$id) ?
            this.definitions.$id :
            "Concat{" + this.matchSteps.map(m => m.$id).join(",") + "}";
    }

    public canStartWith(char: string): boolean {
        return !this.firstMatcher.canStartWith || this.firstMatcher.canStartWith(char);
    }

    get requiredPrefix(): string {
        return this.firstMatcher.requiredPrefix;
    }

    public matchPrefix(initialInputState: InputState, thisMatchContext, parseContext): MatchPrefixResult {
        let currentInputState = initialInputState;
        const things: ThingInsideATreePatternMatch[] = [];
        let matched = "";
        for (const step of this.matchSteps) {
            if (isMatcher(step)) {
                const eat = readyToMatch(currentInputState, this.$consumeWhiteSpaceBetweenTokens);
                currentInputState = eat.state;
                matched += eat.skipped;

                const reportResult = step.matchPrefix(currentInputState, thisMatchContext, parseContext);
                if (isSuccessfulMatch(reportResult)) {
                    const report = reportResult.match;
                    currentInputState = currentInputState.consume(report.$matched,
                        `Concat step [${reportResult.$matcherId}] matched ${reportResult.$matched}`);
                    matched += report.$matched;
                    if (isTreePatternMatch(report)) {
                        things.push(new NestedThing(step.$id, report, step));
                    } else {
                        things.push(new ScalarThing(step.$id, report as TerminalPatternMatch));
                    }
                } else {
                    return new MatchFailureReport(this.$id, initialInputState.offset, null,
                        `Failed at step '${step.name}' due to ${(reportResult as any).description}`);
                }
            } else {
                // It's a function taking the contexts.
                // See if we should stop matching.
                if (isMatchVeto(step)) {
                    if (step.veto(this.valuesFromThings(things), thisMatchContext, parseContext) === false) {
                        return new MatchFailureReport(this.$id, initialInputState.offset, null,
                            `Match vetoed by ${step.$id}`);
                    }
                } else {
                    // the context is made of the things processed so far.
                    things.push(new ComputedThing(step.$id, step.compute(this.valuesFromThings(things))));
                }
            }
        }
        return matchPrefixSuccess(new TreePatternMatch(
            this.$id,
            matched,
            initialInputState.offset,
            things), null);
    }

    private valuesFromThings(things: ThingInsideATreePatternMatch[]): object {
        const output = {};
        for (const p of things) {
            Object.defineProperty(output, p.name, {
                get() {
                    return p.value;
                },
                set(newValue) {
                    p.update(newValue);
                },
                enumerable: true,
                configurable: true,
            });
        }
        Object.preventExtensions(output);
        return output;
    }

}

function isMatcher(s: MatchStep): s is Matcher {
    return (s as Matcher).matchPrefix !== undefined;
}

/**
 * Turns a JSON element such as name: "literal" into a matcher.
 * Return undefined if the object is undefined or null
 * @param o object to attempt to make into a matcher
 * @returns {any}
 */
export function toMatchingLogic(o: TermDef): MatchingLogic {
    if (!o) {
        return undefined;
    }
    if (typeof o === "string") {
        return new Literal(o as string);
    } else if ((o as RegExp).exec) {
        return new Regex(o as RegExp);
    } else if ((o as MatchingLogic).matchPrefix) {
        return o as MatchingLogic;
    } else if ((o as Microgrammar<any>).findMatches) {
        return (o as Microgrammar<any>).matcher;
    } else {
        return Concat.of(o);
    }
}

/**
 * Give an existing matcher a name
 */
export class NamedMatcher implements Matcher {

    public $id = this.name;

    constructor(public name: string, public ml: MatchingLogic) {
    }

    public matchPrefix(is: InputState, thisMatchContext, parseContext): MatchPrefixResult {
        return this.ml.matchPrefix(is, thisMatchContext, parseContext) as PatternMatch;
    }

    public canStartWith(char: string): boolean {
        return !this.ml.canStartWith || this.ml.canStartWith(char);
    }

    get requiredPrefix(): string {
        return this.ml.requiredPrefix;
    }
}

export function isNamedMatcher(thing: MatchingLogic): thing is NamedMatcher {
    return ((thing as NamedMatcher).name !== undefined) && (thing as NamedMatcher).ml !== undefined;
}
