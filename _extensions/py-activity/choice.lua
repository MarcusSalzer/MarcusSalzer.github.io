local utils = require("_extensions.py-activity.utils")

local M = {}

text = require 'text'

-- Pandoc gives us unicode characters for the task list
-- Useful for parsing "correct answer" from tasklist
M.EMPTY = "☐" -- 0x2610
M.CHECKED = "☒"

---@class ChoiceOption
---@field id integer              -- stable option id
---@field blocks pandoc.Block[]   -- rendered option content


---@class ChoiceActivity
---@field question_md string
---@field options_md table
---@field question pandoc.Block[]   -- question text
---@field code pandoc.CodeBlock|nil -- optionally render a codeblock
---@field options ChoiceOption[]
---@field correct_ids integer[]


local function strip_checkboxes(md)
    -- remove checkbox symbols (unicode)
    -- remove leadin/trailing whitespace
    return utils.strip(re.gsub(md, lpeg.utfR(0x2610, 0x2612), ""))
end



---Parse a choice activity from a Div
--- NOTE: Will also remove checked
---@param div pandoc.Div
---@return ChoiceActivity act, table config
function M.parse_choice_activity(div)
    local question = {}
    local code = nil
    local options = {}
    local correct_ids = {}
    -- collect markdown representation of options
    local options_md = {}

    -- default: empty config
    local config = {}

    local option_id = 0
    for _, block in ipairs(div.content) do
        if block.t == "Para" or block.t == "Plain" then
            table.insert(question, block)
        elseif block.t == "CodeBlock" then
            -- Could contain "config-directives" and/or "visible code"
            local confTable, codeText = utils.parse_config(block.text)
            config = confTable

            if codeText then
                -- store codeblock without config-directives
                block.text = codeText
                code = block
            end
        elseif block.t == "BulletList" then
            for _, item in ipairs(block.content) do
                -- item is pandoc.Block[]
                local first = item[1]

                local correct = false

                -- Detect [x] / [ ]
                if first
                    and first.t == "Plain"
                    and first.content[1]
                    and first.content[1].t == "Str"
                then
                    local marker = first.content[1].text
                    if marker == M.CHECKED then
                        correct = true
                        first.content[1].text = M.EMPTY
                    end
                end

                if correct then
                    table.insert(correct_ids, option_id)
                end

                table.insert(options, {
                    id = option_id,
                    blocks = item,
                })

                -- TODO remove checkboxes from markdown
                options_md[option_id + 1] = strip_checkboxes(utils.blocks_to_md(item))

                option_id = option_id + 1
            end
        end
    end


    question_md = utils.blocks_to_md(question):gsub(M.EMPTY, "")
    if code then
        question_md = question_md .. "\n" .. utils.blocks_to_md({ code })
    end

    return {
        -- semantic / AI-safe
        options_md = options_md,
        question_md = question_md,
        -- rendering / UI
        question = question,
        code = code,
        options = options,

        correct_ids = correct_ids,
    }, config
end

---Render a choice activity to HTML blocks
---NOTE: Deprecated, just mutate div in filter instead...
---@param act ChoiceActivity
---@param act_id integer
---@return pandoc.Block[]
function M.render_choice_activity(act, act_id)
    assert(false, "DEPERECATED")
    -- Root container
    local blocks = {}

    local attrs = pandoc.Attr(
        "",
        { "activity" },
        {
            ["data-act-id"] = tostring(act_id),
            ["data-act-type"] = "choice",
        }
    )

    local content = {}

    -- original markdown and other metadata
    table.insert(content, pandoc.RawBlock("html",
        '<script type="application/json" class="activity-meta">'
        .. quarto.json.encode({ question_md = act.question_md, options_md = act.options_md, correct = act.correct_ids })
        .. '</script>'
    ))

    -- question
    for _, b in ipairs(act.question) do
        table.insert(content, b)
    end

    -- Optional code block
    if act.code then
        table.insert(content, act.code)
    end

    -- Options list
    local items = {}

    for _, opt in ipairs(act.options) do
        local checkbox = pandoc.RawInline("html", '<input type="checkbox" name="opt' .. opt.id .. '"/>');

        ---insert works!
        ---@diagnostic disable-next-line: undefined-field
        opt.blocks:insert(1, checkbox)
        table.insert(items, opt.blocks)
    end

    table.insert(content, pandoc.BulletList(items))

    -- Toolbar for buttons
    table.insert(content, pandoc.Div("", pandoc.Attr("", { "activity-toolbar" })))

    table.insert(blocks, pandoc.Div(content, attrs))
    return blocks
end

return M
