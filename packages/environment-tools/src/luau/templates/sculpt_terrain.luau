-- sculpt_terrain.luau — Voxel-level terrain editing
-- Params: operation, shape, posX, posY, posZ, sizeX, sizeY, sizeZ,
--         material, sourceMaterial, strength, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
local Terrain = workspace.Terrain

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_sculpt_" .. OP_ID)
if not recordingId then
	warn("[ENVTOOLS:" .. OP_ID .. "] Failed to begin recording")
	return { ok = false, error = "Failed to begin ChangeHistory recording" }
end

local ok, err = pcall(function()
	local operation = {{operation}}
	local shape = {{shape}}
	local posX = {{posX}}
	local posY = {{posY}}
	local posZ = {{posZ}}
	local sizeX = {{sizeX}}
	local sizeY = {{sizeY}}
	local sizeZ = {{sizeZ}}
	local materialName = {{material}}
	local sourceMaterialName = {{sourceMaterial}}
	local strength = {{strength}}

	local RESOLUTION = 4
	local position = Vector3.new(posX, posY, posZ)
	local size = Vector3.new(sizeX, sizeY, sizeZ)

	-- Resolve material enums
	local material = Enum.Material[materialName] or Enum.Material.Grass
	local sourceMaterial = Enum.Material[sourceMaterialName] or Enum.Material.Rock

	if operation == "fill" then
		if shape == "ball" then
			local radius = math.min(sizeX, sizeY, sizeZ) / 2
			Terrain:FillBall(position, radius, material)
		elseif shape == "cylinder" then
			local height = sizeY
			local radius = math.min(sizeX, sizeZ) / 2
			Terrain:FillCylinder(CFrame.new(position), height, radius, material)
		elseif shape == "wedge" then
			Terrain:FillWedge(CFrame.new(position), size, material)
		else
			Terrain:FillBlock(CFrame.new(position), size, material)
		end

	elseif operation == "subtract" then
		-- Subtract by filling with Air
		if shape == "ball" then
			local radius = math.min(sizeX, sizeY, sizeZ) / 2
			Terrain:FillBall(position, radius, Enum.Material.Air)
		elseif shape == "cylinder" then
			local height = sizeY
			local radius = math.min(sizeX, sizeZ) / 2
			Terrain:FillCylinder(CFrame.new(position), height, radius, Enum.Material.Air)
		elseif shape == "wedge" then
			Terrain:FillWedge(CFrame.new(position), size, Enum.Material.Air)
		else
			Terrain:FillBlock(CFrame.new(position), size, Enum.Material.Air)
		end

	elseif operation == "smooth" then
		-- Read voxels, average occupancy with neighbors, write back
		local halfSize = size / 2
		local regionMin = position - halfSize
		local regionMax = position + halfSize
		local region = Region3.new(regionMin, regionMax):ExpandToGrid(RESOLUTION)
		local mats, occs = Terrain:ReadVoxels(region, RESOLUTION)

		local sizeArr = mats
		local xLen = #sizeArr
		if xLen == 0 then return end

		for _pass = 1, math.max(1, math.floor(strength * 3)) do
			local newOccs = {}
			for x = 1, xLen do
				newOccs[x] = {}
				local yLen = #sizeArr[x]
				for y = 1, yLen do
					newOccs[x][y] = {}
					local zLen = #sizeArr[x][y]
					for z = 1, zLen do
						-- Average with 6 neighbors
						local sum = occs[x][y][z]
						local count = 1
						if x > 1 then sum += occs[x-1][y][z]; count += 1 end
						if x < xLen then sum += occs[x+1][y][z]; count += 1 end
						if y > 1 then sum += occs[x][y-1][z]; count += 1 end
						if y < yLen then sum += occs[x][y+1][z]; count += 1 end
						if z > 1 then sum += occs[x][y][z-1]; count += 1 end
						if z < zLen then sum += occs[x][y][z+1]; count += 1 end
						newOccs[x][y][z] = sum / count
					end
				end
			end
			occs = newOccs
		end

		Terrain:WriteVoxels(region, RESOLUTION, mats, occs)

	elseif operation == "replace_material" then
		local halfSize = size / 2
		local regionMin = position - halfSize
		local regionMax = position + halfSize
		local region = Region3.new(regionMin, regionMax):ExpandToGrid(RESOLUTION)
		Terrain:ReplaceMaterial(region, RESOLUTION, sourceMaterial, material)

	elseif operation == "paint" then
		-- Read voxels, replace material where occupied, write back
		local halfSize = size / 2
		local regionMin = position - halfSize
		local regionMax = position + halfSize
		local region = Region3.new(regionMin, regionMax):ExpandToGrid(RESOLUTION)
		local mats, occs = Terrain:ReadVoxels(region, RESOLUTION)

		for x = 1, #mats do
			for y = 1, #mats[x] do
				for z = 1, #mats[x][y] do
					if occs[x][y][z] > 0 and mats[x][y][z] ~= Enum.Material.Air then
						mats[x][y][z] = material
					end
				end
			end
		end

		Terrain:WriteVoxels(region, RESOLUTION, mats, occs)
	end

	-- Tag a marker for tracking
	local marker = Instance.new("Part")
	marker.Name = "EnvTools_SculptMarker"
	marker.Anchored = true
	marker.CanCollide = false
	marker.Transparency = 1
	marker.Size = Vector3.new(1, 1, 1)
	marker.Position = position
	marker.Parent = workspace
	CollectionService:AddTag(marker, "EnvTools")
	marker:SetAttribute("EnvToolsOp", OP_ID)
	marker:SetAttribute("EnvToolsType", "sculpt")
end)

if ok then
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Commit)
else
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Cancel)
end

print("[ENVTOOLS:" .. OP_ID .. "] END")
return { ok = ok, error = err and tostring(err) or nil }
