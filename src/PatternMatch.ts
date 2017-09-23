
/**
 * Returned when we failed to match prefix
 */

export interface DismatchReport {

    description: string;
}

/**
 * Represents a successful match. Contains microgrammar information
 * in fields with names beginning with $ and any user-defined fields.
 * To ensure this separation works cleanly, not bind user data to fields beginning with $.
 */
export abstract class PatternMatch {
    public abstract $kind: "tree" | "terminal" | "undefined" | "array";

    /**
     * Value extracted from matcher.
     * @return the $value that is extracted from this matcher. May be a
     * scalar or an array, or a nested structure. May or may not be the
     * same as $matched property.
     */
    public abstract $value: any;

    /**
     * Represents a match
     * @param $matcherId id of the matcher that matched
     * @param $matched the actual string content
     * @param $offset offset from 0 in input
     */
    constructor(public readonly $matcherId: string,
                public $matched: string,
                public readonly $offset: number) {
    }

    /**
     * Return just the structure that was matched, throwing away offset and matcher information.
     * This is useful if you want to store PatternMatches after you're done with their internal information.
     */
    public matchedStructure<T>(): T {
        return justTheData(this);
    }

}

export function isPatternMatch(mpr: PatternMatch | DismatchReport): mpr is PatternMatch {
    return mpr != null && mpr !== undefined && (mpr as PatternMatch).$matched !== undefined;
}

/**
 * Simple pattern pattern. No submatches.
 */
export class TerminalPatternMatch extends PatternMatch {
    public $kind: "terminal" = "terminal";

    constructor(matcherId: string,
                matched: string,
                offset: number,
                public readonly $value: any) {
        super(matcherId, matched, offset);
    }

}

/**
 * Simple pattern pattern. No submatches.
 */
export class ArrayPatternMatch extends PatternMatch {
    public $kind: "array" = "array";

    get $value() {
        return this.contents.map(m => m.$value);
    }

    constructor(matcherId: string,
                matched: string,
                offset: number,
                private contents: PatternMatch[]) {
        super(matcherId, matched, offset);
    }

}

/**
 * Return when an optional matcher matches
 */
export class UndefinedPatternMatch extends PatternMatch {

    public $kind: "undefined" = "undefined";

    public $value = undefined;

    constructor(matcherId: string,
                offset: number) {
        super(matcherId, "", offset);
    }
}

export interface ThingInsideATreePatternMatch {
     kind: "scalar" | "tree" | "compute";
     name: string;
     match: PatternMatch | null;
     value: any; /* varies */
     update(newValue: any);
}

export function isScalarThing(t: ThingInsideATreePatternMatch): t is ScalarThing {
    return t.kind === "scalar";
}
export class ScalarThing {
    public kind: "scalar" = "scalar";

    private originalValue: any;
    private updatedValue: any;

    constructor(public name: string,
                public match: TerminalPatternMatch) {
        this.originalValue = match.$value;
    }

    get value(): string {
        return this.updatedValue || this.originalValue;
    }

    public update(newValue: any) {
        this.updatedValue = newValue;
    }
}

export function isNestedThing(t: ThingInsideATreePatternMatch): t is NestedThing {
    return t.kind === "tree";
}
export class NestedThing implements ThingInsideATreePatternMatch {
    public kind: "tree" = "tree";

    constructor(public name: string,
                public match: TreePatternMatch,
                public matcher: any /* really it's a Concat. avoiding circular reference */) {}

    get value(): {} {
        const output = this.match.submatches();
        return output;
    }

    public update(newValue: any) {
        throw new Error("I don't think we have updated nested values");
    }
}

export function isComputedThing(t: ThingInsideATreePatternMatch): t is ComputedThing {
    return t.kind === "compute";
}
export class ComputedThing {
    public kind: "compute" = "compute";
    public match = null;
    constructor(public name: string,
                public value: any) {}

     public update(newValue: any) {
       throw new Error("I don't think we update a computed value, but we could");
     }
}

/**
 * Represents a complex pattern match. Sets properties to expose structure.
 * In the case of string properties, where we can't add provide the whole PatternMatch,
 * we store that in a parallel object $valueMatches
 */
export class TreePatternMatch extends PatternMatch {

    public $kind: "tree" = "tree";

    // JESS: can we not have a $value

    get $valueMatches() {
        const output = {};
        for (const thing of this.$thingsInside.filter(t => isScalarThing(t))) {
            output[thing.name] = thing.match;
        }
        return output;
    }

    get $value() {
        return this;
    }

    constructor(matcherId: string,
                matched: string,
                offset: number,
                public $thingsInside: ThingInsideATreePatternMatch[]) {
        super(matcherId, matched, offset);

        for (const p of $thingsInside) {
            if (!isSpecialMember(p.name)) {
                if (isNestedThing(p)) {
                    Object.defineProperty(this, p.name, {
                        get() {
                            return p.match;
                        },
                        enumerable: true,
                        configurable: true,
                    });
                } else {
                    Object.defineProperty(this, p.name, {
                        get() {
                            return p.value;
                        },
                        enumerable: true,
                        configurable: true,
                    });
                }
            }
        }
    }

    public submatches() {
        return valuesFromThings(this.$thingsInside);
    }

}

function valuesFromThings(things: ThingInsideATreePatternMatch[]): object {
    const output = {};
    for (const p of things) {
        if (!isSpecialMember(p.name)) {
            output[p.name] = p.value;
        }
    }
    return output;
}

export function isTreePatternMatch(om: PatternMatch): om is TreePatternMatch {
    return om.$kind === "tree";
}

/**
 * Return true if the member has a special meaning,
 * rather than being bound to the context. For example,
 * is a veto function or a private property.
 * @param name member name to test
 * @return {boolean}
 */
export function isSpecialMember(name: string) {
    return name.indexOf("_") === 0;
}

function justTheData(match: object): any {
    if (Array.isArray(match)) {
        return match.map(m => justTheData(m));
    }

    if (typeof match !== "object") {
        return match;
    }
    const output = {}; // it is not a const, I mutate it, but tslint won't let me declare otherwise :-(
    for (const p in match) {
        if (!(p.indexOf("_") === 0 || p.indexOf("$") === 0 || typeof match[p] === "function")) {
            output[p] = justTheData(match[p]);
        }
    }
    return output;
}
