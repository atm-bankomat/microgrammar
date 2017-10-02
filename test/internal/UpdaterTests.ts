import assert = require("power-assert");

import { Microgrammark } from "../../src/Microgrammar";

function XmlElement() {
    return Microgrammark.fromString("<${name}>", {
        name: /[a-zA-Z0-9_]+/,
    });
}
function XmlGrammar() {
    return Microgrammark.fromString("${first}${second}", {
        first: XmlElement(),
        second: XmlElement(),
    });
}

describe("updating matches", () => {

    it("should update a value, one deep", () => {
        const content = "<first><second>";
        const result = XmlGrammar().findMatches(content) as any;
        const updater = Microgrammark.updatinateMatch(result[0], content);
        updater.second = "<newSecond>";
        assert(updater.second === "<newSecond>");
        assert(updater.newContent() === "<first><newSecond>");
    });

    it("should update a nested value", () => {
        const content = "<first><second>";
        const result = XmlGrammar().findMatches(content) as any;
        const updater = Microgrammark.updatinateMatch(result[0], content);
        updater.second.name = "newSecond";
        assert(updater.second.name === "newSecond");
        assert(updater.newContent() === "<first><newSecond>");
    });

    it("can update the entire match", () => {
        const content = "<first><second>";
        const result = XmlGrammar().findMatches(content) as any;
        assert(result[0].$offset !== undefined);
        const updater = Microgrammark.updatinateMatch(result[0], content);
        updater.replaceAll("newSecond");
        assert(updater.newContent() === "newSecond");
    });
});
