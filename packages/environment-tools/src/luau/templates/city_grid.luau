-- template: city_grid  op: {{opId}}
print("[ENVTOOLS:{{opId}}] BEGIN")
local CollectionService = game:GetService("CollectionService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")

local recording = ChangeHistoryService:TryBeginRecording("EnvTools city_grid")
local ok, err = pcall(function()
	local root = workspace:FindFirstChild("EnvTools")
	if not root then
		root = Instance.new("Folder")
		root.Name = "EnvTools"
		root.Parent = workspace
		CollectionService:AddTag(root, "EnvTools")
	end
	local rng = Random.new({{seed}})

	local OP_ID = {{opId}}
	local posX = {{posX}}
	local posY = {{posY}}
	local posZ = {{posZ}}
	local gridSize = {{gridSize}}
	local blockSize = {{blockSize}}
	local streetWidth = {{streetWidth}}
	local styleName = {{style}}
	local hasSidewalks = {{sidewalks}}
	local hasStreetLights = {{streetLights}}
	local hasStreetTrees = {{streetTrees}}
	local hasParks = {{parks}}
	local hasAmbientLife = {{ambientLife}}
	local buildingListStr = {{buildingList}}

	-- Parse building list
	local buildingTypes = {}
	for name in buildingListStr:gmatch("[^,]+") do
		table.insert(buildingTypes, name:match("^%s*(.-)%s*$"))
	end
	if #buildingTypes == 0 then
		buildingTypes = {"house", "shop", "apartment"}
	end

	-- Style materials and colors
	local styles = {
		modern = {
			road = Enum.Material.Asite,
			sidewalk = Enum.Material.Concrete,
			wallMat = Enum.Material.SmoothPlastic,
			roofMat = Enum.Material.Metal,
			roadColor = Color3.fromRGB(50, 50, 55),
			sidewalkColor = Color3.fromRGB(180, 175, 170),
			wallColors = {
				Color3.fromRGB(220, 220, 225),
				Color3.fromRGB(180, 190, 200),
				Color3.fromRGB(160, 165, 170),
				Color3.fromRGB(200, 195, 185),
				Color3.fromRGB(140, 150, 165),
			},
			roofColor = Color3.fromRGB(90, 95, 100),
			lampColor = Color3.fromRGB(60, 60, 65),
		},
		medieval = {
			road = Enum.Material.Cobblestone,
			sidewalk = Enum.Material.Slate,
			wallMat = Enum.Material.Brick,
			roofMat = Enum.Material.Wood,
			roadColor = Color3.fromRGB(130, 115, 95),
			sidewalkColor = Color3.fromRGB(150, 140, 120),
			wallColors = {
				Color3.fromRGB(200, 180, 150),
				Color3.fromRGB(180, 160, 130),
				Color3.fromRGB(170, 150, 120),
				Color3.fromRGB(190, 170, 140),
				Color3.fromRGB(160, 140, 110),
			},
			roofColor = Color3.fromRGB(120, 70, 40),
			lampColor = Color3.fromRGB(80, 60, 40),
		},
		futuristic = {
			road = Enum.Material.SmoothPlastic,
			sidewalk = Enum.Material.Neon,
			wallMat = Enum.Material.Glass,
			roofMat = Enum.Material.Neon,
			roadColor = Color3.fromRGB(30, 30, 40),
			sidewalkColor = Color3.fromRGB(80, 120, 200),
			wallColors = {
				Color3.fromRGB(100, 140, 200),
				Color3.fromRGB(80, 180, 220),
				Color3.fromRGB(120, 100, 200),
				Color3.fromRGB(60, 160, 180),
				Color3.fromRGB(150, 100, 220),
			},
			roofColor = Color3.fromRGB(60, 80, 180),
			lampColor = Color3.fromRGB(40, 40, 60),
		},
	}
	-- Fix Asphalt material name
	styles.modern.road = Enum.Material.Asphalt

	local s = styles[styleName] or styles.modern

	-- Building height ranges by type (studs)
	local buildingHeights = {
		house = {12, 18},
		shop = {10, 16},
		apartment = {24, 48},
		office = {36, 72},
		skyscraper = {80, 140},
		park = {0, 0},
	}

	-- City model
	local cityModel = Instance.new("Model")
	cityModel.Name = "City_" .. OP_ID
	cityModel.Parent = root
	CollectionService:AddTag(cityModel, "EnvTools")
	cityModel:SetAttribute("EnvToolsOp", OP_ID)
	cityModel:SetAttribute("EnvToolsType", "city")

	-- Sub-folders
	local roadsFolder = Instance.new("Folder")
	roadsFolder.Name = "Roads"
	roadsFolder.Parent = cityModel

	local buildingsFolder = Instance.new("Folder")
	buildingsFolder.Name = "Buildings"
	buildingsFolder.Parent = cityModel

	local propsFolder = Instance.new("Folder")
	propsFolder.Name = "Props"
	propsFolder.Parent = cityModel

	local function tagPart(part)
		CollectionService:AddTag(part, "EnvTools")
		part:SetAttribute("EnvToolsOp", OP_ID)
	end

	local totalSpan = gridSize * blockSize + (gridSize + 1) * streetWidth
	local originOffset = Vector3.new(posX - totalSpan / 2, posY, posZ - totalSpan / 2)

	local partCount = 0
	local function yieldCheck()
		partCount = partCount + 1
		if partCount % 50 == 0 then
			task.wait()
		end
	end

	-- Lay roads (horizontal and vertical streets)
	for i = 0, gridSize do
		local offset = i * (blockSize + streetWidth)

		-- Horizontal street
		local hRoad = Instance.new("Part")
		hRoad.Name = "Road_H_" .. i
		hRoad.Size = Vector3.new(totalSpan, 0.3, streetWidth)
		hRoad.Position = originOffset + Vector3.new(totalSpan / 2, 0.15, offset + streetWidth / 2)
		hRoad.Material = s.road
		hRoad.Color = s.roadColor
		hRoad.Anchored = true
		hRoad.Parent = roadsFolder
		tagPart(hRoad)
		yieldCheck()

		-- Vertical street
		local vRoad = Instance.new("Part")
		vRoad.Name = "Road_V_" .. i
		vRoad.Size = Vector3.new(streetWidth, 0.3, totalSpan)
		vRoad.Position = originOffset + Vector3.new(offset + streetWidth / 2, 0.15, totalSpan / 2)
		vRoad.Material = s.road
		vRoad.Color = s.roadColor
		vRoad.Anchored = true
		vRoad.Parent = roadsFolder
		tagPart(vRoad)
		yieldCheck()
	end

	-- Center line markings on roads
	for i = 0, gridSize do
		local offset = i * (blockSize + streetWidth)

		local hLine = Instance.new("Part")
		hLine.Name = "CenterLine_H_" .. i
		hLine.Size = Vector3.new(totalSpan, 0.32, 0.6)
		hLine.Position = originOffset + Vector3.new(totalSpan / 2, 0.16, offset + streetWidth / 2)
		hLine.Material = Enum.Material.SmoothPlastic
		hLine.Color = Color3.fromRGB(240, 220, 60)
		hLine.Anchored = true
		hLine.Parent = roadsFolder
		tagPart(hLine)
		yieldCheck()

		local vLine = Instance.new("Part")
		vLine.Name = "CenterLine_V_" .. i
		vLine.Size = Vector3.new(0.6, 0.32, totalSpan)
		vLine.Position = originOffset + Vector3.new(offset + streetWidth / 2, 0.16, totalSpan / 2)
		vLine.Material = Enum.Material.SmoothPlastic
		vLine.Color = Color3.fromRGB(240, 220, 60)
		vLine.Anchored = true
		vLine.Parent = roadsFolder
		tagPart(vLine)
		yieldCheck()
	end

	-- Sidewalks along each block edge
	if hasSidewalks then
		local swWidth = 3
		local swHeight = 0.5
		for row = 0, gridSize - 1 do
			for col = 0, gridSize - 1 do
				local bx = (col + 1) * streetWidth + col * blockSize
				local bz = (row + 1) * streetWidth + row * blockSize

				-- 4 sidewalk strips per block
				local sides = {
					{Vector3.new(blockSize, swHeight, swWidth), Vector3.new(bx + blockSize / 2, swHeight / 2, bz + swWidth / 2)},
					{Vector3.new(blockSize, swHeight, swWidth), Vector3.new(bx + blockSize / 2, swHeight / 2, bz + blockSize - swWidth / 2)},
					{Vector3.new(swWidth, swHeight, blockSize), Vector3.new(bx + swWidth / 2, swHeight / 2, bz + blockSize / 2)},
					{Vector3.new(swWidth, swHeight, blockSize), Vector3.new(bx + blockSize - swWidth / 2, swHeight / 2, bz + blockSize / 2)},
				}
				for si, side in sides do
					local sw = Instance.new("Part")
					sw.Name = "Sidewalk_" .. row .. "_" .. col .. "_" .. si
					sw.Size = side[1]
					sw.Position = originOffset + side[2]
					sw.Material = s.sidewalk
					sw.Color = s.sidewalkColor
					sw.Anchored = true
					sw.Parent = roadsFolder
					tagPart(sw)
					yieldCheck()
				end
			end
		end
	end

	-- Decide which blocks are parks
	local parkBlocks = {}
	if hasParks and gridSize >= 2 then
		-- Make ~20% of blocks into parks (at least 1)
		local totalBlocks = gridSize * gridSize
		local numParks = math.max(1, math.floor(totalBlocks * 0.2))
		local candidates = {}
		for i = 0, totalBlocks - 1 do
			table.insert(candidates, i)
		end
		for i = 1, numParks do
			local idx = rng:NextInteger(1, #candidates)
			parkBlocks[candidates[idx]] = true
			table.remove(candidates, idx)
		end
	end

	-- Build structures on each block
	for row = 0, gridSize - 1 do
		for col = 0, gridSize - 1 do
			local blockIdx = row * gridSize + col
			local bx = (col + 1) * streetWidth + col * blockSize
			local bz = (row + 1) * streetWidth + row * blockSize
			local blockCenter = originOffset + Vector3.new(bx + blockSize / 2, 0, bz + blockSize / 2)

			if parkBlocks[blockIdx] then
				-- Park: green ground + trees + bench
				local grass = Instance.new("Part")
				grass.Name = "Park_" .. row .. "_" .. col
				grass.Size = Vector3.new(blockSize - 6, 0.4, blockSize - 6)
				grass.Position = blockCenter + Vector3.new(0, 0.2, 0)
				grass.Material = Enum.Material.Grass
				grass.Color = Color3.fromRGB(80, 160, 60)
				grass.Anchored = true
				grass.Parent = buildingsFolder
				tagPart(grass)
				yieldCheck()

				-- Park trees (4-8)
				local numTrees = rng:NextInteger(4, 8)
				for t = 1, numTrees do
					local tx = rng:NextNumber(-blockSize / 2 + 8, blockSize / 2 - 8)
					local tz = rng:NextNumber(-blockSize / 2 + 8, blockSize / 2 - 8)
					local treeHeight = rng:NextNumber(8, 16)

					local trunk = Instance.new("Part")
					trunk.Name = "ParkTree_Trunk_" .. t
					trunk.Size = Vector3.new(1.5, treeHeight * 0.6, 1.5)
					trunk.Position = blockCenter + Vector3.new(tx, treeHeight * 0.3 + 0.4, tz)
					trunk.Material = Enum.Material.Wood
					trunk.Color = Color3.fromRGB(100, 70, 40)
					trunk.Anchored = true
					trunk.Shape = Enum.PartType.Cylinder
					trunk.Orientation = Vector3.new(0, 0, 90)
					trunk.Parent = buildingsFolder
					tagPart(trunk)
					yieldCheck()

					local canopy = Instance.new("Part")
					canopy.Name = "ParkTree_Canopy_" .. t
					canopy.Shape = Enum.PartType.Ball
					canopy.Size = Vector3.new(treeHeight * 0.7, treeHeight * 0.6, treeHeight * 0.7)
					canopy.Position = blockCenter + Vector3.new(tx, treeHeight * 0.6 + 0.4, tz)
					canopy.Material = Enum.Material.Grass
					canopy.Color = Color3.fromRGB(40, 130 + rng:NextInteger(0, 40), 30)
					canopy.Anchored = true
					canopy.Parent = buildingsFolder
					tagPart(canopy)
					yieldCheck()
				end

				-- Park bench
				local bench = Instance.new("Part")
				bench.Name = "ParkBench_" .. row .. "_" .. col
				bench.Size = Vector3.new(5, 1.5, 2)
				bench.Position = blockCenter + Vector3.new(0, 0.75 + 0.4, 0)
				bench.Material = Enum.Material.Wood
				bench.Color = Color3.fromRGB(120, 80, 40)
				bench.Anchored = true
				bench.Parent = buildingsFolder
				tagPart(bench)
				yieldCheck()
			else
				-- Building block: 1-4 buildings per block
				local numBuildings = rng:NextInteger(1, math.min(4, #buildingTypes))
				local buildingPadding = 6
				local innerSize = blockSize - buildingPadding * 2

				-- Ground slab
				local slab = Instance.new("Part")
				slab.Name = "BlockSlab_" .. row .. "_" .. col
				slab.Size = Vector3.new(blockSize - 4, 0.3, blockSize - 4)
				slab.Position = blockCenter + Vector3.new(0, 0.15, 0)
				slab.Material = Enum.Material.Concrete
				slab.Color = Color3.fromRGB(160, 155, 150)
				slab.Anchored = true
				slab.Parent = buildingsFolder
				tagPart(slab)
				yieldCheck()

				for b = 1, numBuildings do
					local bType = buildingTypes[rng:NextInteger(1, #buildingTypes)]
					local heights = buildingHeights[bType] or {12, 24}
					local height = rng:NextInteger(heights[1], heights[2])
					if height < 4 then height = 12 end

					-- Position within block (subdivide for multiple buildings)
					local subSize = innerSize / math.ceil(math.sqrt(numBuildings))
					local subRow = math.floor((b - 1) / math.ceil(math.sqrt(numBuildings)))
					local subCol = (b - 1) % math.ceil(math.sqrt(numBuildings))
					local bPosX = -innerSize / 2 + subCol * subSize + subSize / 2
					local bPosZ = -innerSize / 2 + subRow * subSize + subSize / 2

					local footprintX = subSize * rng:NextNumber(0.5, 0.85)
					local footprintZ = subSize * rng:NextNumber(0.5, 0.85)

					local wallColor = s.wallColors[rng:NextInteger(1, #s.wallColors)]

					-- Main building body
					local body = Instance.new("Part")
					body.Name = bType .. "_" .. row .. "_" .. col .. "_" .. b
					body.Size = Vector3.new(footprintX, height, footprintZ)
					body.Position = blockCenter + Vector3.new(bPosX, height / 2 + 0.3, bPosZ)
					body.Material = s.wallMat
					body.Color = wallColor
					body.Anchored = true
					body.Parent = buildingsFolder
					tagPart(body)
					yieldCheck()

					-- Roof
					local roof = Instance.new("Part")
					roof.Name = bType .. "_Roof_" .. row .. "_" .. col .. "_" .. b
					roof.Size = Vector3.new(footprintX + 1, 1, footprintZ + 1)
					roof.Position = blockCenter + Vector3.new(bPosX, height + 0.8, bPosZ)
					roof.Material = s.roofMat
					roof.Color = s.roofColor
					roof.Anchored = true
					roof.Parent = buildingsFolder
					tagPart(roof)
					yieldCheck()

					-- Windows (front face only, for performance)
					if height >= 12 then
						local windowRows = math.floor(height / 5)
						local windowCols = math.max(1, math.floor(footprintX / 5))
						for wr = 1, math.min(windowRows, 15) do
							for wc = 1, math.min(windowCols, 6) do
								local wx = -footprintX / 2 + wc * (footprintX / (windowCols + 1))
								local wy = wr * 5 - 1.5
								local win = Instance.new("Part")
								win.Name = "Window"
								win.Size = Vector3.new(2, 2.5, 0.2)
								win.Position = blockCenter + Vector3.new(bPosX + wx - footprintX / 2 + footprintX / (windowCols + 1) * wc - footprintX / (windowCols + 1), wy + 0.3, bPosZ + footprintZ / 2 + 0.1)
								win.Material = Enum.Material.Glass
								win.Color = Color3.fromRGB(180, 210, 240)
								win.Transparency = 0.4
								win.Anchored = true
								win.Parent = buildingsFolder
								tagPart(win)
								yieldCheck()
							end
							-- Limit windows to keep under budget
							if partCount > 1800 then break end
						end
					end
				end
			end
		end
	end

	-- Street lights at intersections
	if hasStreetLights then
		for row = 0, gridSize do
			for col = 0, gridSize do
				local ix = col * (blockSize + streetWidth) + streetWidth / 2
				local iz = row * (blockSize + streetWidth) + streetWidth / 2

				local pole = Instance.new("Part")
				pole.Name = "StreetLight_Pole_" .. row .. "_" .. col
				pole.Size = Vector3.new(0.5, 10, 0.5)
				pole.Position = originOffset + Vector3.new(ix + streetWidth / 2 - 1, 5, iz + streetWidth / 2 - 1)
				pole.Material = Enum.Material.Metal
				pole.Color = s.lampColor
				pole.Anchored = true
				pole.Parent = propsFolder
				tagPart(pole)
				yieldCheck()

				local lamp = Instance.new("Part")
				lamp.Name = "StreetLight_Lamp_" .. row .. "_" .. col
				lamp.Size = Vector3.new(2, 0.6, 2)
				lamp.Position = originOffset + Vector3.new(ix + streetWidth / 2 - 1, 10.3, iz + streetWidth / 2 - 1)
				lamp.Material = Enum.Material.Neon
				lamp.Color = Color3.fromRGB(255, 240, 200)
				lamp.Anchored = true
				lamp.Parent = propsFolder
				tagPart(lamp)
				yieldCheck()

				local light = Instance.new("PointLight")
				light.Name = "Light"
				light.Brightness = 1
				light.Range = 30
				light.Color = Color3.fromRGB(255, 240, 200)
				light.Parent = lamp
			end
		end
	end

	-- Street trees along sidewalks
	if hasStreetTrees then
		local treeSpacing = 20
		for i = 0, gridSize do
			local streetOffset = i * (blockSize + streetWidth) + streetWidth / 2
			local numTrees = math.floor(totalSpan / treeSpacing)
			for t = 0, numTrees - 1 do
				if rng:NextNumber() > 0.4 then
					local pos = originOffset + Vector3.new(
						streetOffset + streetWidth / 2 + 2,
						0,
						t * treeSpacing + treeSpacing / 2
					)
					local tHeight = rng:NextNumber(6, 12)

					local trunk = Instance.new("Part")
					trunk.Name = "StreetTree_Trunk"
					trunk.Size = Vector3.new(1, tHeight * 0.5, 1)
					trunk.Position = pos + Vector3.new(0, tHeight * 0.25, 0)
					trunk.Material = Enum.Material.Wood
					trunk.Color = Color3.fromRGB(90, 65, 35)
					trunk.Anchored = true
					trunk.Parent = propsFolder
					tagPart(trunk)
					yieldCheck()

					local canopy = Instance.new("Part")
					canopy.Name = "StreetTree_Canopy"
					canopy.Shape = Enum.PartType.Ball
					canopy.Size = Vector3.new(tHeight * 0.5, tHeight * 0.4, tHeight * 0.5)
					canopy.Position = pos + Vector3.new(0, tHeight * 0.55, 0)
					canopy.Material = Enum.Material.Grass
					canopy.Color = Color3.fromRGB(50, 140 + rng:NextInteger(0, 30), 40)
					canopy.Anchored = true
					canopy.Parent = propsFolder
					tagPart(canopy)
					yieldCheck()
				end

				-- Budget guard
				if partCount > 1900 then break end
			end
			if partCount > 1900 then break end
		end
	end

	-- Ambient bird sounds on tallest buildings
	if hasAmbientLife then
		local birdPositions = {}
		for _, child in buildingsFolder:GetChildren() do
			if child:IsA("BasePart") and child.Size.Y > 30 then
				table.insert(birdPositions, child.Position + Vector3.new(0, child.Size.Y / 2 + 2, 0))
			end
		end
		-- Place up to 4 bird emitters
		for i = 1, math.min(4, #birdPositions) do
			local anchor = Instance.new("Part")
			anchor.Name = "BirdEmitter_" .. i
			anchor.Size = Vector3.new(1, 1, 1)
			anchor.Position = birdPositions[i]
			anchor.Transparency = 1
			anchor.CanCollide = false
			anchor.Anchored = true
			anchor.Parent = propsFolder
			tagPart(anchor)

			local sound = Instance.new("Sound")
			sound.Name = "BirdAmbient"
			sound.SoundId = "rbxassetid://9120300824"
			sound.Volume = 0.3
			sound.Looped = true
			sound.RollOffMaxDistance = 80
			sound.Playing = true
			sound.Parent = anchor
		end
	end
end)
if recording then
	ChangeHistoryService:FinishRecording(recording,
		ok and Enum.FinishRecordingOperation.Commit or Enum.FinishRecordingOperation.Cancel)
end
if not ok then error("[ENVTOOLS:{{opId}}] ERROR: " .. tostring(err)) end
print("[ENVTOOLS:{{opId}}] END")
return { ok = ok, error = err and tostring(err) or nil }
