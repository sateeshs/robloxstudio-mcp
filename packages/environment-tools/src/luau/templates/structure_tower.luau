-- structure_tower.luau — Procedural tower structure
-- Params: posX, posY, posZ, scale, material, seed, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_tower_" .. OP_ID)
if not recordingId then
	warn("[ENVTOOLS:" .. OP_ID .. "] Failed to begin recording")
	return { ok = false, error = "Failed to begin ChangeHistory recording" }
end

local ok, err = pcall(function()
	local posX = {{posX}}
	local posY = {{posY}}
	local posZ = {{posZ}}
	local scale = {{scale}}
	local materialName = {{material}}
	local seed = {{seed}}

	local materialMap = {
		wood = Enum.Material.Wood,
		stone = Enum.Material.Slate,
		brick = Enum.Material.Brick,
		ice = Enum.Material.Ice,
		neon = Enum.Material.Neon,
	}
	local mat = materialMap[materialName] or Enum.Material.Slate

	local rng = Random.new(seed)
	local s = scale

	-- Ensure EnvTools folder
	local folder = workspace:FindFirstChild("EnvTools")
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = "EnvTools"
		folder.Parent = workspace
		CollectionService:AddTag(folder, "EnvTools")
	end

	local model = Instance.new("Model")
	model.Name = "Tower_" .. OP_ID
	model.Parent = folder

	local origin = Vector3.new(posX, posY, posZ)
	local towerRadius = 4 * s
	local floorCount = 3 + math.floor(rng:NextNumber() * 2) -- 3-4 floors
	local floorHeight = 6 * s

	-- Build floors
	for floor = 0, floorCount - 1 do
		local floorY = origin.Y + floor * floorHeight

		-- Cylindrical wall section (approximated with 8 segments)
		for i = 0, 7 do
			local angle = (i / 8) * math.pi * 2
			local nextAngle = ((i + 1) / 8) * math.pi * 2
			local midAngle = (angle + nextAngle) / 2

			local wallPart = Instance.new("Part")
			wallPart.Name = "Wall_" .. floor .. "_" .. i
			wallPart.Size = Vector3.new(towerRadius * 0.8, floorHeight, 0.5 * s)
			wallPart.CFrame = CFrame.new(
				origin.X + math.cos(midAngle) * towerRadius,
				floorY + floorHeight / 2,
				origin.Z + math.sin(midAngle) * towerRadius
			) * CFrame.Angles(0, -midAngle + math.pi / 2, 0)
			wallPart.Material = mat
			wallPart.Anchored = true
			wallPart.Parent = model
		end

		-- Floor platform
		local platform = Instance.new("Part")
		platform.Name = "Floor_" .. floor
		platform.Shape = Enum.PartType.Cylinder
		platform.Size = Vector3.new(0.5 * s, towerRadius * 2.2, towerRadius * 2.2)
		platform.CFrame = CFrame.new(origin.X, floorY + 0.25 * s, origin.Z) * CFrame.Angles(0, 0, math.rad(90))
		platform.Material = mat
		platform.Anchored = true
		platform.Parent = model
	end

	-- Conical roof
	local roofY = origin.Y + floorCount * floorHeight
	local roofHeight = 5 * s
	local roofColor = Color3.fromRGB(140, 50, 50)
	if materialName == "ice" then roofColor = Color3.fromRGB(180, 220, 240) end
	if materialName == "neon" then roofColor = Color3.fromRGB(50, 200, 200) end

	-- Approximate cone with stacked cylinders
	local coneSteps = 5
	for i = 0, coneSteps - 1 do
		local frac = i / coneSteps
		local r = towerRadius * (1 - frac * 0.9)
		local h = roofHeight / coneSteps
		local roofPart = Instance.new("Part")
		roofPart.Name = "Roof_" .. i
		roofPart.Shape = Enum.PartType.Cylinder
		roofPart.Size = Vector3.new(h, r * 2, r * 2)
		roofPart.CFrame = CFrame.new(origin.X, roofY + i * h + h / 2, origin.Z) * CFrame.Angles(0, 0, math.rad(90))
		roofPart.Color = roofColor
		roofPart.Material = Enum.Material.SmoothPlastic
		roofPart.Anchored = true
		roofPart.Parent = model
	end

	-- Battlements on top floor rim
	for i = 0, 7 do
		local angle = (i / 8) * math.pi * 2
		local merlon = Instance.new("Part")
		merlon.Name = "Merlon_" .. i
		merlon.Size = Vector3.new(1.5 * s, 2 * s, 1.5 * s)
		merlon.Position = Vector3.new(
			origin.X + math.cos(angle) * (towerRadius + 0.3 * s),
			roofY + 1 * s,
			origin.Z + math.sin(angle) * (towerRadius + 0.3 * s)
		)
		merlon.Material = mat
		merlon.Anchored = true
		merlon.Parent = model
	end

	-- Tag everything
	for _, child in model:GetDescendants() do
		if child:IsA("BasePart") then
			CollectionService:AddTag(child, "EnvTools")
			child:SetAttribute("EnvToolsOp", OP_ID)
		end
	end
	CollectionService:AddTag(model, "EnvTools")
	model:SetAttribute("EnvToolsOp", OP_ID)
	model:SetAttribute("EnvToolsType", "structure")
end)

if ok then
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Commit)
else
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Cancel)
end

print("[ENVTOOLS:" .. OP_ID .. "] END")
return { ok = ok, error = err and tostring(err) or nil }
