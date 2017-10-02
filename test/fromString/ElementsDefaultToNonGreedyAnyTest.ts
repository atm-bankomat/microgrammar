import { Microgrammart } from "../../src/Microgrammar";
import { isPatternMatch } from "../../src/PatternMatch";
import assert = require("power-assert");

describe("Elements default to non-greedy any", () => {

    it("does not require every named element to be defined", () => {
        const content = "->banana<- ";
        const mg = Microgrammart.fromString("->${fruit}<-");
        const result: any = mg.exactMatch(content);
        if (isPatternMatch(result)) {
            const mmmm = result as any;
            assert(mmmm.fruit === "banana");
        } else {
            assert.fail("Didn't match");
        }
    });

    it("multiple undefined elements are fine if they're separated by a literal", () => {
        const content = "preamble content ->banana<-juice! and more...";
        const mg = Microgrammart.fromString<{ fruit: string, drink: string }>("->${fruit}<-${drink}!");
        const result: any = mg.firstMatch(content);
        if (isPatternMatch(result)) {
            const mmmm = result as any;
            assert(mmmm.fruit === "banana");
            assert(mmmm.drink === "juice");
        } else {
            assert.fail("Didn't match");
        }
    });

    it("multiple undefined elements are fine if they're separated by a defined element", () => {
        const content = "preamble content->banana<-juice! and more...";
        const mg = Microgrammart.fromString("->${fruit}${arrow}${drink}!",
            { arrow: "<-" });
        const result: any = mg.firstMatch(content);
        assert(result.drink === "juice");
        assert(result.fruit === "banana");
    });

    it("doesn't mind whitespace", () => {
        const content = "->   banana   <- ";
        const mg = Microgrammart.fromString("-> ${fruit} <-");
        const result: any = mg.exactMatch(content);
        if (isPatternMatch(result)) {
            const mmmm = result as any;
            assert(mmmm.fruit.trim() === "banana");
        } else {
            assert.fail("Didn't match");
        }
    });

    it.skip("trims whitespace from the captured text", () => {
        const content = "->   banana   <- ";
        const mg = Microgrammart.fromString("-> ${fruit} <-");
        const result: any = mg.exactMatch(content);
        if (isPatternMatch(result)) {
            const mmmm = result as any;
            assert(mmmm.fruit === "banana");
        } else {
            assert.fail("Didn't match");
        }
    });

});
