import { Microgrammar } from "../../src/Microgrammar";

import * as assert from "power-assert";
import { Integer } from "../../src/Primitives";

describe("Skip in Microgrammar.fromString", () => {

    it("skip over one string of discardable content", () => {
        const content = "foo (and some junk) 63";
        const mg = Microgrammar.fromString<{ num: number}>("foo⤞${num}", {
            num: Integer,
        });
        const result = mg.findMatches(content);
        // console.log("Result is " + JSON.stringify(result));
        assert(result.length === 1);
        assert(result[0].$matched === content);
        assert(result[0].num === 63);
    });

    it("skip over two strings of discardable content", () => {
        const content = "foo (and some junk) 63 and then XXX";
        const mg = Microgrammar.fromString<{ num: number}>("foo⤞${num}⤞XXX", {
            num: Integer,
        });
        const result = mg.findMatches(content);
        // console.log("Result is " + JSON.stringify(result));
        assert(result.length === 1);
        assert(result[0].$matched === content);
        assert(result[0].num === 63);
    });

});
