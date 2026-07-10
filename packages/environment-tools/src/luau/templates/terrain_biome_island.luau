-- terrain_biome_island.luau — Island biome with sand beaches, grass center, and surrounding water
-- Params: originX, originY, originZ, sizeX, sizeZ, heightVariation, water, seed, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
local Terrain = workspace.Terrain

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_island_" .. OP_ID)
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
		flat = 3,
		gentle = 8,
		hilly = 16,
		mountainous = 30,
	})[{{heightVariation}}] or 8

	local RESOLUTION = 4
	local CHUNK_SIZE = 128
	local chunksProcessed = 0
	local halfX = sizeX / 2
	local halfZ = sizeZ / 2

	-- Distance from center as 0..1, used for island falloff
	local function distanceFactor(lx, lz)
		local dx = (lx - originX) / halfX
		local dz = (lz - originZ) / halfZ
		return math.sqrt(dx * dx + dz * dz)
	end

	local function noiseAt(wx, wz)
		local nx = (wx + seed * 1.7) * 0.012
		local nz = (wz + seed * 2.5) * 0.012
		local base = math.noise(nx, nz, seed * 0.2) * heightMult

		-- Island falloff: terrain drops below water at edges
		local d = distanceFactor(wx, wz)
		local falloff = math.max(0, 1 - d * 1.2)
		return base * falloff - 2
	end

	for cx = originX - halfX, originX + halfX - 1, CHUNK_SIZE do
		for cz = originZ - halfZ, originZ + halfZ - 1, CHUNK_SIZE do
			local chunkW = math.min(CHUNK_SIZE, (originX + halfX) - cx)
			local chunkD = math.min(CHUNK_SIZE, (originZ + halfZ) - cz)

			for lx = cx, cx + chunkW - 1, RESOLUTION do
				for lz = cz, cz + chunkD - 1, RESOLUTION do
					local h = noiseAt(lx, lz)
					if h < -4 then continue end -- below water, skip terrain

					local baseY = originY + h
					local cellPos = Vector3.new(lx, baseY, lz)

					-- Beach sand at low elevations, grass above
					local mat = h < 2 and Enum.Material.Sand or Enum.Material.Grass
					Terrain:FillBlock(CFrame.new(cellPos), Vector3.new(RESOLUTION, math.max(RESOLUTION, math.abs(h) + RESOLUTION), RESOLUTION), mat)

					-- Rock core for hills
					if h > 6 then
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

	-- Water always surrounds an island (addWater just controls whether it fills)
	if addWater ~= false then
		local waterRegion = Region3.new(
			Vector3.new(originX - halfX, originY - 10, originZ - halfZ),
			Vector3.new(originX + halfX, originY - 1, originZ + halfZ)
		)
		waterRegion = waterRegion:ExpandToGrid(4)
		Terrain:FillRegion(waterRegion, 4, Enum.Material.Water)
	end

	-- Marker
	local marker = Instance.new("Part")
	marker.Name = "EnvTools_IslandMarker"
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
