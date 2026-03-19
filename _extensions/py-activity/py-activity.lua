-- Fail early if wrong format
if quarto and quarto.doc and not quarto.doc.is_format("html") then
    error("Only HTML works!")
    assert(quarto.doc.is_format("html"), "Only HTML works!")
end

local choice = require("_extensions.py-activity.choice")
local parse = require("_extensions.py-activity.parse")
local utils = require("_extensions.py-activity.utils")

-- Count and index activities
local act_count = 0

--- Load defaults from yaml
--- @return table
local function load_default_options()
    -- load
    f = io.open("./_extensions/py-activity/defaults.json", "r")
    local defaults = quarto.json.decode(f:read("a"))
    f:close()
    assert(type(defaults), "table")
    return defaults
end

--- Render a code exercise block
---@param config table
---@param code string
---@param act_id integer
---@return pandoc.Div activity_element
function render_code_exercise(config, code, act_id)
    return pandoc.Div(
        {
            pandoc.RawBlock("html",
                '<textarea class="activity-editor">' .. code .. '</textarea>'
            ),
            pandoc.Para({
                pandoc.RawInline("html", '<button class="submit">Run</button>')
            }),
            ---@diagnostic disable-next-line: missing-fields
            pandoc.Div({}, { class = "output-box" }),
        },
        -- seems to work??
        ---@diagnostic disable-next-line: missing-fields
        {
            class = "activity",
            ["data-act-id"] = tostring(act_id),
            ["data-act-type"] = "code",
            ["data-config"] = quarto.json.encode(config), -- make config accessible in runtime?
        }
    -- TODO: Maybe flatten the config to plain data rather than json?
    -- or at least ensure it is only one level deep, for simpler parse/hydrate
    )
end

-- Main entry ??
function CodeBlock(el)
    local config, code = utils.parse_config(el.text)

    -- for printing and inserting in data-attribute
    local attrs_json = quarto.json.encode(config)

    -- Only process codeblocks with specified activity
    if not config["activity"] then
        return nil
    end
    quarto.log.output("processing activity " .. act_count .. " (attrs=" .. attrs_json .. ")")

    act_count = act_count + 1

    -- Build output
    return render_code_exercise(config, code, act_count);
end

-- Main entry ??
function Div(div)
    if not div.classes[1]:match("^activity") then
        -- no activity -> do nothing
        return div
    end

    local meta_all;
    quarto.log.output("\n---------------------------------\nprocessing activity " .. act_count)
    if div.classes[1] == "activity-choice" then
        -- Parse activity data, also, modifies checkboxes to be unchecked
        local act, conf = choice.parse_choice_activity(div)

        meta_all = {
            id          = act_count,
            type        = "choice",
            prompt_key  = conf["prompt_key"],
            question_md = act.question_md,
            options_md  = act.options_md,
            correct     = act.correct_ids
        }

        quarto.log.output(meta_all)
    elseif div.classes[1] == "activity-text" then
        local keep_content, conf = parse.parse_clean_codeblocks(div.content)


        -- extract before adding input!
        local question_md = utils.blocks_to_md(keep_content)
        -- replace content
        div.content = keep_content
        -- insert input field
        table.insert(div.content, pandoc.RawBlock("html", '<input type="text" name="text-input"/>'))

        -- Assemble metadata
        meta_all = {
            id                 = act_count,
            type               = "text",
            prompt_key_grading = conf["prompt_key_grading"] or "text_grading",
            prompt_key         = conf["prompt_key"],
            grading            = conf["grading"] or "ai",
            correct            = conf["correct"],
            question_md        = question_md
        }
    else
        error("UNKNOWN activity-class: " .. div.classes[1])
        assert(false, "UNKNOWN activity-class: " .. div.classes[1])
    end


    --  add class
    div.classes:insert(1, "activity")

    --  create JSON block
    local metaBlock = pandoc.RawBlock(
        "html",
        '<script type="application/json" class="activity-meta">'
        .. quarto.json.encode(meta_all)
        .. '</script>'
    )


    --  append it to the div contents
    table.insert(div.content, metaBlock)
    -- keep counting activities
    act_count = act_count + 1

    --  return the modified div
    return div
end

function Pandoc(doc)
    local options = load_default_options()
    quarto.log.output("\nDefault options", options)



    -- Add options JSON (at the *almost* top of document)
    table.insert(
        doc.blocks,
        1,
        pandoc.RawBlock(
            "html",
            string.format(
                '<script type="application/json" id="global-options">%s</script>',
                quarto.json.encode(options)
            )
        )
    )

    -- insert ai settings form
    f = io.open("./_extensions/py-activity/assets/ai_settings.html", "r")
    local markup = f:read("a")
    f:close()
    table.insert(
        doc.blocks,
        1,
        pandoc.RawBlock(
            "html",
            markup
        )
    )

    -- Add runtime JS and CSS
    -- NOTE: This looks much simpler than other extensions.
    -- perhaps we need to add more (pyodide, monaco) dependencies here
    quarto.doc.add_html_dependency({
        name = "py-activity",
        version = "0.1.0",
        stylesheets = { "assets/runtime/py-activity-runtime.css" },
        scripts = {
            { path = "assets/runtime/py-activity-runtime.js", attribs = { type = "module" } },
        }
    })
    return doc
end
