-- terrain_biome_forest.luau — Forest biome with layered terrain and optional water
-- Params: originX, originY, originZ, sizeX, sizeZ, heightVariation, water, seed, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
local Terrain = workspace.Terrain

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_forest_" .. OP_ID)
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

	-- Height variation multiplier
	local heightMult = ({
		flat = 2,
		gentle = 8,
		hilly = 20,
		mountainous = 40,
	})[{{heightVariation}}] or 8

	local RESOLUTION = 4
	local rng = Random.new(seed)

	-- Simple seeded noise function
	local function noiseAt(wx, wz)
		local nx = (wx + seed * 1.3) * 0.01
		local nz = (wz + seed * 2.7) * 0.01
		return math.noise(nx, nz, seed * 0.1) * heightMult
	end

	-- Fill terrain in chunks to avoid freezing Studio
	local CHUNK_SIZE = 128
	local chunksProcessed = 0

	for cx = originX - sizeX / 2, originX + sizeX / 2 - 1, CHUNK_SIZE do
		for cz = originZ - sizeZ / 2, originZ + sizeZ / 2 - 1, CHUNK_SIZE do
			local chunkW = math.min(CHUNK_SIZE, (originX + sizeX / 2) - cx)
			local chunkD = math.min(CHUNK_SIZE, (originZ + sizeZ / 2) - cz)

			-- Grass base layer
			for lx = cx, cx + chunkW - 1, RESOLUTION do
				for lz = cz, cz + chunkD - 1, RESOLUTION do
					local h = noiseAt(lx, lz)
					local baseY = originY + h
					local cellPos = Vector3.new(lx, baseY, lz)

					-- Fill grass column
					Terrain:FillBlock(CFrame.new(cellPos), Vector3.new(RESOLUTION, math.max(RESOLUTION, math.abs(h) + RESOLUTION), RESOLUTION), Enum.Material.Grass)

					-- Add rock below the surface for depth
					if h > 4 then
						local rockPos = Vector3.new(lx, baseY - RESOLUTION, lz)
						Terrain:FillBlock(CFrame.new(rockPos), Vector3.new(RESOLUTION, RESOLUTION, RESOLUTION), Enum.Material.Rock)
					end
				end
			end

			chunksProcessed += 1
			if chunksProcessed % 4 == 0 then
				task.wait()
			end
		end
	end

	-- Optional water at base level
	if addWater then
		local waterRegion = Region3.new(
			Vector3.new(originX - sizeX / 2, originY - 8, originZ - sizeZ / 2),
			Vector3.new(originX + sizeX / 2, originY - 1, originZ + sizeZ / 2)
		)
		waterRegion = waterRegion:ExpandToGrid(4)
		Terrain:FillRegion(waterRegion, 4, Enum.Material.Water)
	end

	-- Tag a marker part for tracking
	local marker = Instance.new("Part")
	marker.Name = "EnvTools_ForestMarker"
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
