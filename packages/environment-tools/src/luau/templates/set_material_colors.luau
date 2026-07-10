-- set_material_colors.luau — Override terrain material colors
-- Special marker: --[[COLOR_ENTRIES]] replaced with Luau table of {material, r, g, b} entries
-- Params: opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local Terrain = workspace.Terrain

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_matcolors_" .. OP_ID)
if not recordingId then
	warn("[ENVTOOLS:" .. OP_ID .. "] Failed to begin recording")
	return { ok = false, error = "Failed to begin ChangeHistory recording" }
end

local ok, err = pcall(function()
	-- COLOR_ENTRIES marker replaced with list of {mat="Material", r=R, g=G, b=B}
	local entries = --[[COLOR_ENTRIES]]{}

	for _, entry in ipairs(entries) do
		local material = Enum.Material[entry.mat]
		if material then
			Terrain:SetMaterialColor(material, Color3.fromRGB(entry.r, entry.g, entry.b))
		end
	end
end)

if ok then
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Commit)
else
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Cancel)
end

print("[ENVTOOLS:" .. OP_ID .. "] END")
return { ok = ok, error = err and tostring(err) or nil }
