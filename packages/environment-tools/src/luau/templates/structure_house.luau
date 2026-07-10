-- structure_house.luau — Procedural house structure
-- Params: posX, posY, posZ, scale, material, seed, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_house_" .. OP_ID)
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

	local materialMap = {
		wood = Enum.Material.Wood,
		stone = Enum.Material.Slate,
		brick = Enum.Material.Brick,
		ice = Enum.Material.Ice,
		neon = Enum.Material.Neon,
	}
	local mat = materialMap[materialName] or Enum.Material.Wood

	local roofMat = Enum.Material.Slate
	local roofColor = Color3.fromRGB(120, 60, 30)
	if materialName == "stone" then roofColor = Color3.fromRGB(80, 80, 80) end
	if materialName == "ice" then roofColor = Color3.fromRGB(180, 220, 240); roofMat = Enum.Material.Ice end
	if materialName == "neon" then roofColor = Color3.fromRGB(200, 50, 200); roofMat = Enum.Material.Neon end

	-- Ensure EnvTools folder
	local folder = workspace:FindFirstChild("EnvTools")
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = "EnvTools"
		folder.Parent = workspace
		CollectionService:AddTag(folder, "EnvTools")
	end

	local model = Instance.new("Model")
	model.Name = "House_" .. OP_ID
	model.Parent = folder

	local s = scale
	local origin = Vector3.new(posX, posY, posZ)

	-- Floor
	local floor = Instance.new("Part")
	floor.Name = "Floor"
	floor.Size = Vector3.new(12 * s, 0.5 * s, 10 * s)
	floor.Position = origin + Vector3.new(0, 0.25 * s, 0)
	floor.Material = mat
	floor.Color = Color3.fromRGB(160, 120, 80)
	floor.Anchored = true
	floor.Parent = model

	-- Walls (4 sides with a door opening in front)
	local wallHeight = 6 * s
	local wallThickness = 0.5 * s

	-- Back wall
	local backWall = Instance.new("Part")
	backWall.Name = "BackWall"
	backWall.Size = Vector3.new(12 * s, wallHeight, wallThickness)
	backWall.Position = origin + Vector3.new(0, wallHeight / 2 + 0.5 * s, -5 * s + wallThickness / 2)
	backWall.Material = mat
	backWall.Anchored = true
	backWall.Parent = model

	-- Left wall
	local leftWall = Instance.new("Part")
	leftWall.Name = "LeftWall"
	leftWall.Size = Vector3.new(wallThickness, wallHeight, 10 * s)
	leftWall.Position = origin + Vector3.new(-6 * s + wallThickness / 2, wallHeight / 2 + 0.5 * s, 0)
	leftWall.Material = mat
	leftWall.Anchored = true
	leftWall.Parent = model

	-- Right wall
	local rightWall = Instance.new("Part")
	rightWall.Name = "RightWall"
	rightWall.Size = Vector3.new(wallThickness, wallHeight, 10 * s)
	rightWall.Position = origin + Vector3.new(6 * s - wallThickness / 2, wallHeight / 2 + 0.5 * s, 0)
	rightWall.Material = mat
	rightWall.Anchored = true
	rightWall.Parent = model

	-- Front wall left of door
	local frontLeft = Instance.new("Part")
	frontLeft.Name = "FrontWallLeft"
	frontLeft.Size = Vector3.new(4 * s, wallHeight, wallThickness)
	frontLeft.Position = origin + Vector3.new(-4 * s, wallHeight / 2 + 0.5 * s, 5 * s - wallThickness / 2)
	frontLeft.Material = mat
	frontLeft.Anchored = true
	frontLeft.Parent = model

	-- Front wall right of door
	local frontRight = Instance.new("Part")
	frontRight.Name = "FrontWallRight"
	frontRight.Size = Vector3.new(4 * s, wallHeight, wallThickness)
	frontRight.Position = origin + Vector3.new(4 * s, wallHeight / 2 + 0.5 * s, 5 * s - wallThickness / 2)
	frontRight.Material = mat
	frontRight.Anchored = true
	frontRight.Parent = model

	-- Front wall above door
	local frontTop = Instance.new("Part")
	frontTop.Name = "FrontWallTop"
	frontTop.Size = Vector3.new(4 * s, 2 * s, wallThickness)
	frontTop.Position = origin + Vector3.new(0, wallHeight - 1 * s + 0.5 * s, 5 * s - wallThickness / 2)
	frontTop.Material = mat
	frontTop.Anchored = true
	frontTop.Parent = model

	-- Roof (two angled parts)
	local roofWidth = 7 * s
	local roofLen = 12.5 * s
	local roofAngle = math.rad(25)

	local roofLeft = Instance.new("Part")
	roofLeft.Name = "RoofLeft"
	roofLeft.Size = Vector3.new(roofLen, 0.4 * s, roofWidth)
	roofLeft.CFrame = CFrame.new(origin + Vector3.new(0, wallHeight + 1.5 * s, -1.5 * s)) * CFrame.Angles(roofAngle, 0, 0)
	roofLeft.Material = roofMat
	roofLeft.Color = roofColor
	roofLeft.Anchored = true
	roofLeft.Parent = model

	local roofRight = Instance.new("Part")
	roofRight.Name = "RoofRight"
	roofRight.Size = Vector3.new(roofLen, 0.4 * s, roofWidth)
	roofRight.CFrame = CFrame.new(origin + Vector3.new(0, wallHeight + 1.5 * s, 1.5 * s)) * CFrame.Angles(-roofAngle, 0, 0)
	roofRight.Material = roofMat
	roofRight.Color = roofColor
	roofRight.Anchored = true
	roofRight.Parent = model

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
