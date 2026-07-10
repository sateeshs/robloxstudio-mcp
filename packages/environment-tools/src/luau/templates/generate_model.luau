-- generate_model.luau — Generate a 3D model via GenerationService (Cube 3D)
-- Params: promptEscaped, predefinedSchema, hasCustomSchema, customSchemaGroups,
--         hasImageRef, imageAssetId, hasScale, scale, hasSaveName, saveName,
--         hasBoundingBox, bboxX, bboxY, bboxZ, posX, posY, posZ,
--         anchorToTerrain, modelName, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
local GenerationService = game:GetService("GenerationService")

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_generate_" .. OP_ID)
if not recordingId then
	warn("[ENVTOOLS:" .. OP_ID .. "] Failed to begin recording")
	return { ok = false, error = "Failed to begin ChangeHistory recording" }
end

local ok, err = pcall(function()
	local prompt = {{promptEscaped}}
	local hasCustomSchema = {{hasCustomSchema}}
	local hasImageRef = {{hasImageRef}}
	local imageAssetId = {{imageAssetId}}
	local hasScale = {{hasScale}}
	local scaleVal = {{scale}}
	local hasSaveName = {{hasSaveName}}
	local saveName = {{saveName}}
	local hasBBox = {{hasBoundingBox}}
	local bboxX = {{bboxX}}
	local bboxY = {{bboxY}}
	local bboxZ = {{bboxZ}}
	local posX = {{posX}}
	local posY = {{posY}}
	local posZ = {{posZ}}
	local anchorToTerrain = {{anchorToTerrain}}
	local modelName = {{modelName}}

	-- Build generation inputs
	local inputs = {
		TextPrompt = prompt,
	}

	-- Image-guided generation
	if hasImageRef then
		inputs.ImagePrompt = Content.fromAssetId(imageAssetId)
	end

	-- Build schema: custom or predefined
	local schema
	if hasCustomSchema then
		local groupNames = {--[[CUSTOM_GROUPS]]}
		local groups = {}
		for _, name in ipairs(groupNames) do
			table.insert(groups, { Name = name })
		end
		schema = {
			SchemaDefinition = groups,
		}
	else
		local schemaName = {{predefinedSchema}}
		schema = {
			PredefinedSchema = schemaName,
		}
	end

	local options = {}
	if hasBBox then
		options.Size = Vector3.new(bboxX, bboxY, bboxZ)
	end

	-- Call GenerateModelAsync (yields)
	local success, resultOrErr = pcall(function()
		return GenerationService:GenerateModelAsync(inputs, schema, options)
	end)

	if not success then
		local errStr = tostring(resultOrErr)

		-- Check for common error conditions and provide friendly messages
		if errStr:find("DynamicGeneration") or errStr:find("capability") then
			error(
				"GenerationService requires DynamicGeneration capability. " ..
				"Enable it: File > Game Settings > Security > 'Editable Mesh / Editable Image APIs'. " ..
				"The place may also need to be published."
			)
		elseif errStr:find("moderat") or errStr:find("filter") or errStr:find("content") then
			error(
				"The prompt was rejected by content moderation. " ..
				"Try a different description that follows Roblox Community Standards."
			)
		elseif errStr:find("rate") or errStr:find("limit") or errStr:find("throttl") then
			error(
				"Generation rate limit reached (max 10/min). " ..
				"Wait a moment and try again."
			)
		else
			error("GenerationService error: " .. errStr)
		end
	end

	local generatedModel = resultOrErr

	-- Post-generation scaling via ScaleTo
	if hasScale and scaleVal ~= 1 and generatedModel:IsA("Model") then
		generatedModel:ScaleTo(scaleVal)
	end

	-- Ensure EnvTools folder
	local folder = workspace:FindFirstChild("EnvTools")
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = "EnvTools"
		folder.Parent = workspace
		CollectionService:AddTag(folder, "EnvTools")
	end

	local assetsFolder = folder:FindFirstChild("Assets")
	if not assetsFolder then
		assetsFolder = Instance.new("Folder")
		assetsFolder.Name = "Assets"
		assetsFolder.Parent = folder
		CollectionService:AddTag(assetsFolder, "EnvTools")
	end

	-- Name and parent the generated model
	if generatedModel:IsA("Model") then
		generatedModel.Name = modelName
		generatedModel.Parent = assetsFolder

		-- Position the model
		local targetPos = Vector3.new(posX, posY, posZ)

		if anchorToTerrain then
			-- Raycast down to find terrain surface
			local params = RaycastParams.new()
			params.FilterType = Enum.RaycastFilterType.Include
			params.FilterDescendantsInstances = {workspace.Terrain}
			local rayResult = workspace:Raycast(
				Vector3.new(posX, posY + 200, posZ),
				Vector3.new(0, -400, 0),
				params
			)
			if rayResult then
				targetPos = rayResult.Position
			end
		end

		generatedModel:PivotTo(CFrame.new(targetPos))

		-- Anchor all parts
		for _, desc in generatedModel:GetDescendants() do
			if desc:IsA("BasePart") then
				desc.Anchored = true
			end
		end
	elseif generatedModel:IsA("BasePart") then
		generatedModel.Name = modelName
		generatedModel.Anchored = true

		local targetPos = Vector3.new(posX, posY, posZ)
		if anchorToTerrain then
			local params = RaycastParams.new()
			params.FilterType = Enum.RaycastFilterType.Include
			params.FilterDescendantsInstances = {workspace.Terrain}
			local rayResult = workspace:Raycast(
				Vector3.new(posX, posY + 200, posZ),
				Vector3.new(0, -400, 0),
				params
			)
			if rayResult then
				targetPos = rayResult.Position
			end
		end

		-- Scale single parts via Size
		if hasScale and scaleVal ~= 1 then
			generatedModel.Size = generatedModel.Size * scaleVal
		end

		generatedModel.Position = targetPos
		generatedModel.Parent = assetsFolder
	else
		generatedModel.Name = modelName
		generatedModel.Parent = assetsFolder
	end

	-- Tag for EnvTools tracking
	CollectionService:AddTag(generatedModel, "EnvTools")
	generatedModel:SetAttribute("EnvToolsOp", OP_ID)
	generatedModel:SetAttribute("EnvToolsType", "asset")
	generatedModel:SetAttribute("GenerationPrompt", prompt)

	-- Save generation for LoadGeneratedMeshAsync reuse
	if hasSaveName then
		generatedModel:SetAttribute("EnvToolsSaveName", saveName)
	end

	for _, desc in generatedModel:GetDescendants() do
		if desc:IsA("BasePart") or desc:IsA("Model") then
			CollectionService:AddTag(desc, "EnvTools")
			desc:SetAttribute("EnvToolsOp", OP_ID)
		end
	end

	return {
		instancePath = generatedModel:GetFullName(),
	}
end)

if ok then
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Commit)
else
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Cancel)
end

print("[ENVTOOLS:" .. OP_ID .. "] END")

if ok then
	return { ok = true, instancePath = err and err.instancePath or nil }
else
	return { ok = false, error = tostring(err) }
end
