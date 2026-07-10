-- terrain_biome_desert.luau — Desert biome with sand dunes and optional oasis water
-- Params: originX, originY, originZ, sizeX, sizeZ, heightVariation, water, seed, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
local Terrain = workspace.Terrain

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_desert_" .. OP_ID)
if not recordingId then
	warn("[ENVTOOLS:" .. OP_ID .. "] Failed to begin recording")
	return { ok = false, error = "Failed to begin ChangeHistory recording" }
end

local ok, err = pcall(function()
	local originX = {{originX}}
	local originY = {{originY}}
	local originZ = {{originZ}}
	local sizeX = {{sizeX}}
	local sizeZ = {{sizeZ}}
	local seed = {{seed}}
	local addWater = {{water}}

	local heightMult = ({
		flat = 1,
		gentle = 5,
		hilly = 12,
		mountainous = 25,
	})[{{heightVariation}}] or 5

	local RESOLUTION = 4
	local CHUNK_SIZE = 128
	local chunksProcessed = 0

	-- Dune-like noise: two octaves with different frequencies
	local function noiseAt(wx, wz)
		local n1 = math.noise((wx + seed * 1.1) * 0.008, (wz + seed * 2.3) * 0.008, seed * 0.1)
		local n2 = math.noise((wx + seed * 3.7) * 0.025, (wz + seed * 0.9) * 0.025, seed * 0.3)
		return (n1 * 0.7 + n2 * 0.3) * heightMult
	end

	for cx = originX - sizeX / 2, originX + sizeX / 2 - 1, CHUNK_SIZE do
		for cz = originZ - sizeZ / 2, originZ + sizeZ / 2 - 1, CHUNK_SIZE do
			local chunkW = math.min(CHUNK_SIZE, (originX + sizeX / 2) - cx)
			local chunkD = math.min(CHUNK_SIZE, (originZ + sizeZ / 2) - cz)

			for lx = cx, cx + chunkW - 1, RESOLUTION do
				for lz = cz, cz + chunkD - 1, RESOLUTION do
					local h = noiseAt(lx, lz)
					local baseY = originY + h
					local cellPos = Vector3.new(lx, baseY, lz)

					Terrain:FillBlock(CFrame.new(cellPos), Vector3.new(RESOLUTION, math.max(RESOLUTION, math.abs(h) + RESOLUTION), RESOLUTION), Enum.Material.Sand)

					-- Sandstone under taller dunes
					if h > 6 then
						local stonePos = Vector3.new(lx, baseY - RESOLUTION, lz)
						Terrain:FillBlock(CFrame.new(stonePos), Vector3.new(RESOLUTION, RESOLUTION, RESOLUTION), Enum.Material.Sandstone)
					end
				end
			end

			chunksProcessed += 1
			if chunksProcessed % 4 == 0 then
				task.wait()
			end
		end
	end

	-- Optional oasis water pool in center
	if addWater then
		local poolSize = math.min(sizeX, sizeZ) * 0.2
		local waterRegion = Region3.new(
			Vector3.new(originX - poolSize / 2, originY - 6, originZ - poolSize / 2),
			Vector3.new(originX + poolSize / 2, originY - 1, originZ + poolSize / 2)
		)
		waterRegion = waterRegion:ExpandToGrid(4)
		Terrain:FillRegion(waterRegion, 4, Enum.Material.Water)
	end

	-- Marker
	local marker = Instance.new("Part")
	marker.Name = "EnvTools_DesertMarker"
	marker.Anchored = true
	marker.CanCollide = false
	marker.Transparency = 1
	marker.Size = Vector3.new(1, 1, 1)
	marker.Position = Vector3.new(originX, originY, originZ)
	marker.Parent = workspace
	CollectionService:AddTag(marker, "EnvTools")
	marker:SetAttribute("EnvToolsOp", OP_ID)
	marker:SetAttribute("EnvToolsType", "terrain")
	marker:SetAttribute("TerrainOriginX", originX)
	marker:SetAttribute("TerrainOriginY", originY)
	marker:SetAttribute("TerrainOriginZ", originZ)
	marker:SetAttribute("TerrainSizeX", sizeX)
	marker:SetAttribute("TerrainSizeZ", sizeZ)
end)

if ok then
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Commit)
else
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Cancel)
end

print("[ENVTOOLS:" .. OP_ID .. "] END")
return { ok = ok, error = err and tostring(err) or nil }
