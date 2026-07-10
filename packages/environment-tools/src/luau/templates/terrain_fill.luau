-- terrain_fill.luau — Flat terrain fill
-- Params: originX, originY, originZ, sizeX, sizeZ, material, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
local Terrain = workspace.Terrain

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_terrain_fill_" .. OP_ID)
if not recordingId then
	warn("[ENVTOOLS:" .. OP_ID .. "] Failed to begin recording")
	return { ok = false, error = "Failed to begin ChangeHistory recording" }
end

local ok, err = pcall(function()
	local origin = Vector3.new({{originX}}, {{originY}}, {{originZ}})
	local size = Vector3.new({{sizeX}}, 20, {{sizeZ}})
	local material = Enum.Material[{{material}}]

	-- Fill a flat slab of terrain
	local region = Region3.new(
		origin - size / 2,
		origin + size / 2
	)
	region = region:ExpandToGrid(4)
	Terrain:FillRegion(region, 4, material)

	-- Tag a marker part for tracking
	local marker = Instance.new("Part")
	marker.Name = "EnvTools_TerrainMarker"
	marker.Anchored = true
	marker.CanCollide = false
	marker.Transparency = 1
	marker.Size = Vector3.new(1, 1, 1)
	marker.Position = origin
	marker.Parent = workspace
	CollectionService:AddTag(marker, "EnvTools")
	marker:SetAttribute("EnvToolsOp", OP_ID)
	marker:SetAttribute("EnvToolsType", "terrain")
	marker:SetAttribute("TerrainOriginX", origin.X)
	marker:SetAttribute("TerrainOriginY", origin.Y)
	marker:SetAttribute("TerrainOriginZ", origin.Z)
	marker:SetAttribute("TerrainSizeX", size.X)
	marker:SetAttribute("TerrainSizeZ", size.Z)
end)

if ok then
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Commit)
else
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Cancel)
end

print("[ENVTOOLS:" .. OP_ID .. "] END")
return { ok = ok, error = err and tostring(err) or nil }
