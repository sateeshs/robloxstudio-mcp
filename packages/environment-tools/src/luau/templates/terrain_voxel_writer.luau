-- terrain_voxel_writer.luau — Shared WriteVoxels terrain pipeline
-- Params: originX, originY, originZ, sizeX, sizeZ, gridWidth, gridDepth,
--         maxHeight, waterLevel, subsurfaceMat, opId
-- Special markers: --[[HEIGHTS_DATA]] and --[[MATERIALS_DATA]] replaced with Luau tables

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
local Terrain = workspace.Terrain

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_terrain_" .. OP_ID)
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
	local gridWidth = {{gridWidth}}
	local gridDepth = {{gridDepth}}
	local peakHeight = {{maxHeight}}
	local waterLevel = {{waterLevel}}

	local RESOLUTION = 4
	local CHUNK = 64 -- max WriteVoxels dimension
	local CHUNK_Y = 60

	-- Material index → Enum.Material mapping
	local MAT_ENUM = {
		[0] = Enum.Material.Air,
		[1] = Enum.Material.Grass,
		[2] = Enum.Material.Sand,
		[3] = Enum.Material.Rock,
		[4] = Enum.Material.Snow,
		[5] = Enum.Material.Ice,
		[6] = Enum.Material.Mud,
		[7] = Enum.Material.Ground,
		[8] = Enum.Material.Sandstone,
		[9] = Enum.Material.Slate,
		[10] = Enum.Material.LeafyGrass,
		[11] = Enum.Material.Basalt,
		[12] = Enum.Material.CrackedLava,
		[13] = Enum.Material.Limestone,
		[14] = Enum.Material.Salt,
		[15] = Enum.Material.Water,
		[16] = Enum.Material.Glacier,
		[17] = Enum.Material.WoodPlanks,
	}

	local subsurfaceMat = MAT_ENUM[{{subsurfaceMat}}] or Enum.Material.Rock

	-- HEIGHTS_DATA and MATERIALS_DATA markers replaced with flat Luau tables by server
	local heights = --[[HEIGHTS_DATA]]{}
	local materials = --[[MATERIALS_DATA]]{}

	local halfX = sizeX / 2
	local halfZ = sizeZ / 2

	-- Determine Y range
	local bottomY = originY
	if waterLevel > 0 then
		bottomY = originY - RESOLUTION -- room for water below
	end
	local topY = math.ceil(peakHeight / RESOLUTION) * RESOLUTION + RESOLUTION * 2

	-- Process terrain in chunks using WriteVoxels
	local chunksX = math.ceil(gridWidth / CHUNK)
	local chunksZ = math.ceil(gridDepth / CHUNK)
	local chunksDone = 0

	for czi = 0, chunksZ - 1 do
		local z0 = czi * CHUNK
		local czLen = math.min(CHUNK, gridDepth - z0)

		for cxi = 0, chunksX - 1 do
			local x0 = cxi * CHUNK
			local cxLen = math.min(CHUNK, gridWidth - x0)

			-- Find max height in this chunk for Y range optimization
			local chunkMaxH = 0
			for lz = 0, czLen - 1 do
				for lx = 0, cxLen - 1 do
					local idx = (z0 + lz) * gridWidth + (x0 + lx) + 1
					local h = heights[idx] or 0
					if h > chunkMaxH then chunkMaxH = h end
				end
			end

			-- Skip empty chunks
			if chunkMaxH <= 0 and waterLevel <= 0 then
				chunksDone += 1
				continue
			end

			-- Column Y range for this chunk
			local localTopY = math.ceil(math.max(chunkMaxH, waterLevel, RESOLUTION) / RESOLUTION) * RESOLUTION + RESOLUTION
			local voxelsY = math.max(1, math.floor((localTopY - bottomY) / RESOLUTION))

			-- Process Y in sub-chunks
			for cy0 = 0, voxelsY - 1, CHUNK_Y do
				local cyLen = math.min(CHUNK_Y, voxelsY - cy0)

				local mats = {}
				local occs = {}
				local anyFill = false

				for lx = 1, cxLen do
					mats[lx] = {}
					occs[lx] = {}
					for ly = 1, cyLen do
						mats[lx][ly] = table.create(czLen, Enum.Material.Air)
						occs[lx][ly] = table.create(czLen, 0)
					end

					for ly = 1, cyLen do
						local worldY = bottomY + (cy0 + ly - 1) * RESOLUTION

						for lz = 1, czLen do
							local gx = x0 + lx - 1
							local gz = z0 + lz - 1
							local idx = gz * gridWidth + gx + 1
							local h = heights[idx] or 0
							local surfaceMat = MAT_ENUM[materials[idx] or 0] or Enum.Material.Grass

							if worldY <= h then
								-- Below or at surface
								local distToSurface = h - worldY
								if distToSurface < RESOLUTION then
									-- Surface voxel: use surface material with partial occupancy for smoothness
									local frac = distToSurface / RESOLUTION
									mats[lx][ly][lz] = surfaceMat
									occs[lx][ly][lz] = math.max(0.2, math.min(1, frac + 0.5))
								elseif distToSurface < RESOLUTION * 2 then
									-- Just below surface: surface material full
									mats[lx][ly][lz] = surfaceMat
									occs[lx][ly][lz] = 1
								else
									-- Deep subsurface: subsurface material
									mats[lx][ly][lz] = subsurfaceMat
									occs[lx][ly][lz] = 1
								end
								anyFill = true
							elseif waterLevel > 0 and worldY <= waterLevel then
								-- Above terrain but below water level: water
								mats[lx][ly][lz] = Enum.Material.Water
								occs[lx][ly][lz] = 1
								anyFill = true
							end
						end
					end
				end

				if anyFill then
					local regionMin = Vector3.new(
						originX - halfX + x0 * RESOLUTION,
						bottomY + cy0 * RESOLUTION,
						originZ - halfZ + z0 * RESOLUTION
					)
					local regionMax = Vector3.new(
						originX - halfX + (x0 + cxLen) * RESOLUTION,
						bottomY + (cy0 + cyLen) * RESOLUTION,
						originZ - halfZ + (z0 + czLen) * RESOLUTION
					)
					local region = Region3.new(regionMin, regionMax):ExpandToGrid(RESOLUTION)
					Terrain:WriteVoxels(region, RESOLUTION, mats, occs)
				end
			end

			chunksDone += 1
			-- Yield every 4 chunks to prevent Studio freeze
			if chunksDone % 4 == 0 then
				task.wait()
			end
		end
	end

	-- Tag a marker part for tracking
	local marker = Instance.new("Part")
	marker.Name = "EnvTools_TerrainMarker"
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
