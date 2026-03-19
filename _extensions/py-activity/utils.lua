local M = {}

--- remove leading/trailing whitespace
---@param s string
---@return string
function M.strip(s)
    return s:gsub("%s+$", ""):gsub("^%s+", "")
end

---count table entries
---@param tab table
---@return integer
function M.tableCount(tab)
    local count = 0
    for _ in pairs(tab) do count = count + 1 end
    return count
end

--- Can be useful for merging options
---@generic T
---@param base T
---@param override T
---@return T
function M.merge(base, override)
    if type(base) ~= "table" then return override end
    local out = {}

    -- first, take from base table
    for k, v in pairs(base) do
        out[k] = v
    end
    -- second, take from override table
    for k, v in pairs(override or {}) do
        out[k] = M.merge(out[k], v)
    end
    return out
end

--- Extract attributes (# | key:value) from code text
--- @param text string
--- @return table config, string code
function M.parse_config(text)
    local config = {}
    local code_lines = {}

    -- Iterate over lines
    for line in text:gmatch("([^\r\n]*)[\r\n]?") do
        -- Is this line an attribute?
        local key, value = line:match("^#|%s*(%S-)%s*:%s*(.-)%s*$")
        if key and value then
            assert(not value:match("\""), "avoid double quoting")
            config[key] = value
        else
            table.insert(code_lines, line) -- normal code line
        end
    end

    return config, table.concat(code_lines, "\n")
end

---Get markdown representation, useful for giving as context for ai feedback!
---@param blocks any
---@return string
function M.blocks_to_md(blocks)
    if not blocks or #blocks == 0 then
        return ""
    end

    -- The diagnostic is lying!
    ---@diagnostic disable-next-line: redundant-return-value
    md = pandoc.write(
        pandoc.Pandoc(blocks),
        "markdown"
    ):gsub("\n$", "") -- trim trailing newline

    assert(type(md) == "string")
    return md
end

return M
