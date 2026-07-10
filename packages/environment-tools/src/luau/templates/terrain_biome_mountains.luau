-- terrain_biome_mountains.luau — Mountain biome with steep peaks and rock/snow layering
-- Params: originX, originY, originZ, sizeX, sizeZ, heightVariation, water, seed, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
local Terrain = workspace.Terrain

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_mountains_" .. OP_ID)
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

	-- Mountains have amplified height
	local heightMult = ({
		flat = 5,
		gentle = 15,
		hilly = 35,
		mountainous = 60,
	})[{{heightVariation}}] or 35

	local RESOLUTION = 4
	local CHUNK_SIZE = 128
	local chunksProcessed = 0

	-- Multi-octave noise for jagged peaks
	local function noiseAt(wx, wz)
		local n1 = math.noise((wx + seed * 1.3) * 0.008, (wz + seed * 2.7) * 0.008, seed * 0.1)
		local n2 = math.noise((wx + seed * 4.1) * 0.02, (wz + seed * 0.5) * 0.02, seed * 0.3)
		local n3 = math.noise((wx + seed * 7.3) * 0.05, (wz + seed * 3.1) * 0.05, seed * 0.7)
		return (n1 * 0.6 + n2 * 0.3 + n3 * 0.1) * heightMult
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

					-- Material by altitude: grass < 10, rock < 30, snow above
					local mat
					if h > 30 then
						mat = Enum.Material.Snow
					elseif h > 10 then
						mat = Enum.Material.Rock
					elseif h > 0 then
						mat = Enum.Material.Grass
					else
						mat = Enum.Material.Ground
					end

					Terrain:FillBlock(CFrame.new(cellPos), Vector3.new(RESOLUTION, math.max(RESOLUTION, math.abs(h) + RESOLUTION), RESOLUTION), mat)

					-- Slate core for tall peaks
					if h > 20 then
						local slatePos = Vector3.new(lx, baseY - RESOLUTION * 2, lz)
						Terrain:FillBlock(CFrame.new(slatePos), Vector3.new(RESOLUTION, RESOLUTION * 2, RESOLUTION), Enum.Material.Slate)
					end
				end
			end

			chunksProcessed += 1
			if chunksProcessed % 4 == 0 then
				task.wait()
			end
		end
	end

	-- Mountain lake
	if addWater then
		local waterRegion = Region3.new(
			Vector3.new(originX - sizeX / 2, originY - 10, originZ - sizeZ / 2),
			Vector3.new(originX + sizeX / 2, originY - 1, originZ + sizeZ / 2)
		)
		waterRegion = waterRegion:ExpandToGrid(4)
		Terrain:FillRegion(waterRegion, 4, Enum.Material.Water)
	end

	-- Marker
	local marker = Instance.new("Part")
	marker.Name = "EnvTools_MountainsMarker"
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
