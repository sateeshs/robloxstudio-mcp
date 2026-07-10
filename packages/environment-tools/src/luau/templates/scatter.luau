-- scatter.luau — Batch scatter objects at pre-computed positions
-- Params: sourceKind, sourceName, alignMode, originY, opId
-- Special: PLACEMENTS_DATA marker is replaced with Luau table of {x,z,r,s} entries

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_scatter_" .. OP_ID)
if not recordingId then
	warn("[ENVTOOLS:" .. OP_ID .. "] Failed to begin recording")
	return { ok = false, error = "Failed to begin ChangeHistory recording" }
end

local ok, err = pcall(function()
	local sourceKind = {{sourceKind}}
	local sourceName = {{sourceName}}
	local alignMode = {{alignMode}}
	local originY = {{originY}}

	local placements = --[[PLACEMENTS_DATA]]

	-- Ensure EnvTools folder exists
	local folder = workspace:FindFirstChild("EnvTools")
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = "EnvTools"
		folder.Parent = workspace
		CollectionService:AddTag(folder, "EnvTools")
	end

	local scatterFolder = Instance.new("Folder")
	scatterFolder.Name = "Scatter_" .. OP_ID
	scatterFolder.Parent = folder
	CollectionService:AddTag(scatterFolder, "EnvTools")
	scatterFolder:SetAttribute("EnvToolsOp", OP_ID)
	scatterFolder:SetAttribute("EnvToolsType", "scatter")

	-- Template object generators for built-in scatter types
	local templateBuilders = {
		tree_pine = function()
			local model = Instance.new("Model")
			model.Name = "TreePine"
			local trunk = Instance.new("Part")
			trunk.Name = "Trunk"
			trunk.Shape = Enum.PartType.Cylinder
			trunk.Size = Vector3.new(8, 1.5, 1.5)
			trunk.CFrame = CFrame.new(0, 4, 0) * CFrame.Angles(0, 0, math.rad(90))
			trunk.Color = Color3.fromRGB(101, 67, 33)
			trunk.Material = Enum.Material.Wood
			trunk.Anchored = true
			trunk.Parent = model
			local crown = Instance.new("Part")
			crown.Name = "Crown"
			crown.Shape = Enum.PartType.Ball
			crown.Size = Vector3.new(6, 8, 6)
			crown.Position = Vector3.new(0, 10, 0)
			crown.Color = Color3.fromRGB(34, 100, 34)
			crown.Material = Enum.Material.Grass
			crown.Anchored = true
			crown.Parent = model
			model.PrimaryPart = trunk
			return model
		end,
		tree_oak = function()
			local model = Instance.new("Model")
			model.Name = "TreeOak"
			local trunk = Instance.new("Part")
			trunk.Name = "Trunk"
			trunk.Shape = Enum.PartType.Cylinder
			trunk.Size = Vector3.new(10, 2, 2)
			trunk.CFrame = CFrame.new(0, 5, 0) * CFrame.Angles(0, 0, math.rad(90))
			trunk.Color = Color3.fromRGB(80, 50, 20)
			trunk.Material = Enum.Material.Wood
			trunk.Anchored = true
			trunk.Parent = model
			local crown = Instance.new("Part")
			crown.Name = "Crown"
			crown.Shape = Enum.PartType.Ball
			crown.Size = Vector3.new(10, 7, 10)
			crown.Position = Vector3.new(0, 12, 0)
			crown.Color = Color3.fromRGB(50, 120, 30)
			crown.Material = Enum.Material.Grass
			crown.Anchored = true
			crown.Parent = model
			model.PrimaryPart = trunk
			return model
		end,
		rock = function()
			local p = Instance.new("Part")
			p.Name = "Rock"
			p.Size = Vector3.new(3, 2, 3)
			p.Color = Color3.fromRGB(130, 130, 130)
			p.Material = Enum.Material.Slate
			p.Anchored = true
			return p
		end,
		bush = function()
			local p = Instance.new("Part")
			p.Name = "Bush"
			p.Shape = Enum.PartType.Ball
			p.Size = Vector3.new(3, 2.5, 3)
			p.Color = Color3.fromRGB(40, 100, 30)
			p.Material = Enum.Material.Grass
			p.Anchored = true
			return p
		end,
		cactus = function()
			local model = Instance.new("Model")
			model.Name = "Cactus"
			local body = Instance.new("Part")
			body.Name = "Body"
			body.Shape = Enum.PartType.Cylinder
			body.Size = Vector3.new(6, 1.5, 1.5)
			body.CFrame = CFrame.new(0, 3, 0) * CFrame.Angles(0, 0, math.rad(90))
			body.Color = Color3.fromRGB(50, 130, 50)
			body.Material = Enum.Material.SmoothPlastic
			body.Anchored = true
			body.Parent = model
			model.PrimaryPart = body
			return model
		end,
		snowman = function()
			local model = Instance.new("Model")
			model.Name = "Snowman"
			local base = Instance.new("Part")
			base.Name = "Base"
			base.Shape = Enum.PartType.Ball
			base.Size = Vector3.new(4, 4, 4)
			base.Position = Vector3.new(0, 2, 0)
			base.Color = Color3.fromRGB(240, 240, 245)
			base.Material = Enum.Material.Snow
			base.Anchored = true
			base.Parent = model
			local mid = Instance.new("Part")
			mid.Name = "Mid"
			mid.Shape = Enum.PartType.Ball
			mid.Size = Vector3.new(3, 3, 3)
			mid.Position = Vector3.new(0, 5, 0)
			mid.Color = Color3.fromRGB(240, 240, 245)
			mid.Material = Enum.Material.Snow
			mid.Anchored = true
			mid.Parent = model
			local head = Instance.new("Part")
			head.Name = "Head"
			head.Shape = Enum.PartType.Ball
			head.Size = Vector3.new(2, 2, 2)
			head.Position = Vector3.new(0, 7.5, 0)
			head.Color = Color3.fromRGB(240, 240, 245)
			head.Material = Enum.Material.Snow
			head.Anchored = true
			head.Parent = model
			model.PrimaryPart = base
			return model
		end,
		crystal = function()
			local p = Instance.new("Part")
			p.Name = "Crystal"
			p.Size = Vector3.new(1.5, 4, 1.5)
			p.Color = Color3.fromRGB(100, 50, 200)
			p.Material = Enum.Material.Neon
			p.Transparency = 0.3
			p.Anchored = true
			return p
		end,
	}

	-- Get source template
	local sourceTemplate
	if sourceKind == "template" then
		local builder = templateBuilders[sourceName]
		if not builder then error("Unknown scatter template: " .. sourceName) end
		sourceTemplate = builder()
	elseif sourceKind == "instancePath" then
		local inst = workspace
		for _, segment in ipairs(string.split(sourceName, ".")) do
			inst = inst:FindFirstChild(segment)
			if not inst then error("Instance not found: " .. sourceName) end
		end
		sourceTemplate = inst
	else
		error("assetId scatter source not yet supported")
	end

	-- Place each object
	for i, pt in ipairs(placements) do
		local clone = sourceTemplate:Clone()
		clone.Name = clone.Name .. "_" .. i

		local y = originY
		if alignMode == "terrain" then
			-- Raycast down to find terrain surface
			local params = RaycastParams.new()
			params.FilterType = Enum.RaycastFilterType.Include
			params.FilterDescendantsInstances = {workspace.Terrain}
			local result = workspace:Raycast(Vector3.new(pt.x, originY + 200, pt.z), Vector3.new(0, -400, 0), params)
			if result then
				y = result.Position.Y
			end
		end

		local cf = CFrame.new(pt.x, y, pt.z) * CFrame.Angles(0, math.rad(pt.r), 0)

		if clone:IsA("Model") and clone.PrimaryPart then
			clone:PivotTo(cf)
			-- Apply scale
			if pt.s ~= 1 then
				clone:ScaleTo(pt.s)
			end
		elseif clone:IsA("BasePart") then
			clone.CFrame = cf
			if pt.s ~= 1 then
				clone.Size = clone.Size * pt.s
			end
		end

		CollectionService:AddTag(clone, "EnvTools")
		clone:SetAttribute("EnvToolsOp", OP_ID)
		clone.Parent = scatterFolder

		if i % 50 == 0 then
			task.wait()
		end
	end

	-- Cleanup source template if we created it
	if sourceKind == "template" then
		sourceTemplate:Destroy()
	end
end)

if ok then
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Commit)
else
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Cancel)
end

print("[ENVTOOLS:" .. OP_ID .. "] END")
return { ok = ok, error = err and tostring(err) or nil }
