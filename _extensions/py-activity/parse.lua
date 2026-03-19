local utils = require("_extensions.py-activity.utils")

local M = {}

--- Parse a directive from codeblocks, remove directives and empty codeblocks
---@param content pandoc.List
---@return table keep_content, table config
function M.parse_clean_codeblocks(content)
    -- default: empty config
    local conf = {}
    -- Is there config directives?
    local keep_content = {}
    for _, block in ipairs(content) do
        if block.t == "CodeBlock" then
            -- Could contain "config-directives" and/or "visible code"
            local confTable, codeText = utils.parse_config(block.text)
            conf = confTable

            -- strip whitespace
            codeText = utils.strip(codeText)
            if #codeText > 0 then
                -- codeblock without config-directives
                -- only keep if anything left
                block.text = codeText
                table.insert(keep_content, block)
            end
        else
            -- always keep non-codeblocks
            table.insert(keep_content, block)
        end
    end
    return keep_content, conf
end

return M
