-- clear_env.luau — Remove all EnvTools-tagged instances and their terrain
-- Params: opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
local Terrain = workspace.Terrain

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_clear_" .. OP_ID)
if not recordingId then
	warn("[ENVTOOLS:" .. OP_ID .. "] Failed to begin recording")
	return { ok = false, error = "Failed to begin ChangeHistory recording" }
end

local ok, err = pcall(function()
	local tagged = CollectionService:GetTagged("EnvTools")
	local removedCount = 0
	local terrainCleared = false

	for _, inst in ipairs(tagged) do
		-- If this is a terrain marker, clear terrain in its region
		local envType = inst:GetAttribute("EnvToolsType")
		if envType == "terrain" then
			local tox = inst:GetAttribute("TerrainOriginX") or 0
			local toy = inst:GetAttribute("TerrainOriginY") or 0
			local toz = inst:GetAttribute("TerrainOriginZ") or 0
			local tsx = inst:GetAttribute("TerrainSizeX") or 512
			local tsz = inst:GetAttribute("TerrainSizeZ") or 512

			local clearRegion = Region3.new(
				Vector3.new(tox - tsx / 2, toy - 50, toz - tsz / 2),
				Vector3.new(tox + tsx / 2, toy + 100, toz + tsz / 2)
			)
			clearRegion = clearRegion:ExpandToGrid(4)
			Terrain:FillRegion(clearRegion, 4, Enum.Material.Air)
			terrainCleared = true
		end

		inst:Destroy()
		removedCount += 1
	end

	print("[ENVTOOLS:" .. OP_ID .. "] Removed " .. removedCount .. " tagged instances, terrain cleared: " .. tostring(terrainCleared))
end)

if ok then
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Commit)
else
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Cancel)
end

print("[ENVTOOLS:" .. OP_ID .. "] END")
return { ok = ok, error = err and tostring(err) or nil }
