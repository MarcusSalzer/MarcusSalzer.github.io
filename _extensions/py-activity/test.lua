local parse = require("_extensions.py-activity.parse")
local choice = require("_extensions.py-activity.choice")


-- UNIT TESTS

-- ---- mocks ----
quarto = {
    json = {
        encode = function(x)
            return "JSON"
        end
    }
}
-- count globally
local successes = 0;
local fails = 0;

--- Compare actual to expected (NOTE: primitives only)
---@generic T
---@param actual T
---@param expected T
---@param msg? string
function expect(actual, expected, msg)
    if actual ~= expected then
        fails = fails + 1
        print(
            ("❌ " .. (msg or "failed"))
            .. "\n    expected: " .. tostring(expected)
            .. "\n    actual:   " .. tostring(actual)

        )
    else
        successes = successes + 1
        print("✅ " .. (msg or "OK"))
    end
end

pandoc = require("pandoc")



-- ---- UTILS ----
local utils = require("_extensions.py-activity.utils")
print("\nTesting merge...")
-- test assertions
expect(type(utils.merge), "function")
expect(utils.merge("hello", "world"), "world", "replaces primitive")
expect(utils.merge({ a = 1, b = 2 }, { b = 3 })["b"], 3, "replaces int in table")
-- replace & insert
res = utils.merge({ a = 1, b = 2 }, { b = 3, c = 4 })
expect(res["a"], 1, "leaves as is ")
expect(res["c"], 4, "inserts int in table")


-- ---- FILTER ----
dofile("_extensions/py-activity/py-activity.lua")

print("\nTesting code exercise render...")

local res = render_code_exercise({ activity = "exercise" }, "print('hello')\n", 42)
assert(res ~= nil, "Expects output")
-- test assertions
expect(res.t, "Div", "Element type")
expect(res.attr.classes[1], "activity", "expects first class 'activity'")
expect(res.attr.attributes["data-act-id"], "42", "Expects activity id")
expect(res.attr.attributes["data-act-type"], "code", "Expects activity type")
-- children
expect(res.content[1].t, "RawBlock", "first child type")
expect(res.content[2].t, "Para", "second child type")
expect(res.content[3].t, "Div", "third child type")
expect(res.content[3].attr.classes[1], "output-box", "third child class")


local function test_strip()
    print("\nTesting utils.strip...")

    expect(utils.strip("hello "), "hello")
    expect(utils.strip(" hello world\n"), "hello world")
    expect(utils.strip(" \t\n"), "", "only ws -> empty")
end

local function test_choice()
    local act, conf = choice.parse_choice_activity(pandoc.Div({ pandoc.Para({ "hej?" }),
        pandoc.BulletList({
            { pandoc.Plain({ pandoc.Str(choice.EMPTY), pandoc.Str("A") }) },
            { pandoc.Plain({ pandoc.Str(choice.EMPTY), pandoc.Str("B") }) },
            { pandoc.Plain({ pandoc.Str(choice.CHECKED), pandoc.Str("C") }) },
        }),
    }));
    expect(act.code, nil, "no code block")
    expect(pandoc.utils.stringify(act.question[1]), "hej?", "question")
    expect(#act.options, 3, "option count")
    expect(pandoc.utils.stringify(act.options_md[1]), "A", "first option")
    expect(#act.correct_ids, 1, "single correct")
    expect(act.correct_ids[1], 2, "last id correct (zero-idxd)")
end


local function test_parse_clean_codeblocks()
    print("\nTesting parse and clean codeblocks...")

    local keep_content, conf

    -- basic
    keep_content, conf = parse.parse_clean_codeblocks({ pandoc.Para({ "hej?" }) })
    expect(#keep_content, 1, "one child element")
    expect(#conf, 0, "empty conf")

    -- plain
    keep_content, conf = parse.parse_clean_codeblocks({ pandoc.Para({ "hej?" }), pandoc.CodeBlock("Plain code") })
    expect(#keep_content, 2, "child elements")
    expect(#conf, 0, "empty conf")

    print("directive only")
    keep_content, conf = parse.parse_clean_codeblocks({
        pandoc.Para({ "hej?" }), pandoc.CodeBlock("\n#| grading: ai\n"),
    })

    expect(#keep_content, 1, "should remove codeblock")
    expect(utils.tableCount(conf), 1, "one conf directive")
    expect(conf["grading"], "ai")

    print("directive and code")
    keep_content, conf = parse.parse_clean_codeblocks({
        pandoc.Para({ "hej?" }), pandoc.CodeBlock("#| correct: 2\nprint(1+1)"),
    })

    expect(#keep_content, 2, "should not remove codeblock")
    expect(utils.tableCount(conf), 1, "one conf directive")
    expect(conf["correct"], "2")
end


-- UTILS
test_strip()


-- CHOICE
print("\nTesting choice...")
test_choice()


-- TEST TEXT ACTIVITY
test_parse_clean_codeblocks();


-- END

print("\nOK: " .. successes .. " Fails: " .. fails)
