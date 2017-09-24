import { ChangeSet } from "./ChangeSet";

import { isComputedThing, isNestedThing, isScalarThing, isTreePatternMatch, PatternMatch } from "../PatternMatch";

export interface MatchUpdater {
    newContent(): string;
    replaceAll(newValue: string): void;
}

/**
 * Handle low level updating using get/set properties
 */
export class MicrogrammarUpdates {

    public updatableMatch<T>(match: T & PatternMatch, cs: ChangeSet | string): T & MatchUpdater {
        const changeSet = (typeof cs === "string") ? new ChangeSet(cs) : cs;
        const updating: any = {
            $changeSet: changeSet,
            newContent() {
                return this.$changeSet.updated();
            },
            replaceAll(newValue: string) {
                this.$changeSet.change(match, newValue);
            },
        };
        this.addMatchesAsProperties(updating, updating.$changeSet, match);
        return updating as (T & MatchUpdater);
    }

    /**
     * adds each match as a property to the target, with setters that update the changeset
     * @param target
     * @param cs
     * @param match
     */
    private addMatchesAsProperties(target: object, cs: ChangeSet, match: PatternMatch): void {
        if (isTreePatternMatch(match)) {
            for (const p of match.$thingsInside) {
                if (isNestedThing(p) || isScalarThing(p)) { // updates are supported
                    let initialValue;
                    if (isNestedThing(p)) {
                        initialValue = {};
                        this.addMatchesAsProperties(initialValue, cs, p.match);
                    } else if (isScalarThing(p)) {
                        initialValue = p.value;
                    }
                    const privateProperty = "_" + p.name;

                    // https://stackoverflow.com/questions/12827266/get-and-set-in-typescript
                    target[privateProperty] = initialValue;
                    Object.defineProperty(target, p.name, {
                        get() {
                            return ((target as any).$invalidated) ?
                                undefined :
                                this[privateProperty];
                        },
                        set(newValue) {
                            if ((target as any).$invalidated) {
                                throw new Error(`Cannot set [${p.name}] on [${target}]: invalidated by parent change`);
                            }
                            target[privateProperty] = newValue;
                            cs.change(p.match, newValue);
                            if (isNestedThing(p) && p.value !== {}) {
                                // The caller has set the value of an entire property block.
                                // Invalidate the properties under it
                                for (const prop of Object.getOwnPropertyNames(target)) {
                                    if (typeof target[prop] === "object") {
                                        target[prop].$invalidated = true;
                                    }
                                }
                            }
                        },
                        enumerable: true,
                        configurable: true,
                    });
                } else if (isComputedThing(p)) {
                    // updates are not supported
                    Object.defineProperty(target, p.name, {
                        get() {
                            return p.value;
                        },
                        set(newValue) {
                            throw new Error(`${p.name} was computed in a function in the microgrammar; you can't update it`);
                        },
                        enumerable: true,
                        configurable: true,
                    });
                } else {
                    throw new Error("a new case has been added and it is not supported by update yet: " + p.kind);
                }

            }
        } else {
            console.log(`Not a tree pattern match: ${JSON.stringify(match)}`);
        }
    }
}
