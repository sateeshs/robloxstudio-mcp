-- add_effect.luau — Place a visual/audio effect in the scene
-- Params: effectType, posX, posY, posZ, hasColor, colorR, colorG, colorB,
--         size, intensity, radius, enabled, looped, effectName, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_effect_" .. OP_ID)
if not recordingId then
	warn("[ENVTOOLS:" .. OP_ID .. "] Failed to begin recording")
	return { ok = false, error = "Failed to begin ChangeHistory recording" }
end

local ok, err = pcall(function()
	local effectType = {{effectType}}
	local posX = {{posX}}
	local posY = {{posY}}
	local posZ = {{posZ}}
	local hasColor = {{hasColor}}
	local colorR = {{colorR}}
	local colorG = {{colorG}}
	local colorB = {{colorB}}
	local size = {{size}}
	local intensity = {{intensity}}
	local radius = {{radius}}
	local enabled = {{enabled}}
	local looped = {{looped}}
	local effectName = {{effectName}}

	-- Ensure EnvTools folder
	local folder = workspace:FindFirstChild("EnvTools")
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = "EnvTools"
		folder.Parent = workspace
		CollectionService:AddTag(folder, "EnvTools")
	end

	local effectsFolder = folder:FindFirstChild("Effects")
	if not effectsFolder then
		effectsFolder = Instance.new("Folder")
		effectsFolder.Name = "Effects"
		effectsFolder.Parent = folder
		CollectionService:AddTag(effectsFolder, "EnvTools")
	end

	-- Create anchor part (invisible, anchored)
	local anchor = Instance.new("Part")
	anchor.Name = effectName
	anchor.Position = Vector3.new(posX, posY, posZ)
	anchor.Size = Vector3.new(1, 1, 1)
	anchor.Anchored = true
	anchor.CanCollide = false
	anchor.Transparency = 1
	anchor.Parent = effectsFolder
	CollectionService:AddTag(anchor, "EnvTools")
	anchor:SetAttribute("EnvToolsOp", OP_ID)
	anchor:SetAttribute("EnvToolsType", "effect")
	anchor:SetAttribute("EffectType", effectType)

	local attachment = Instance.new("Attachment")
	attachment.Parent = anchor

	local userColor = hasColor and Color3.fromRGB(colorR, colorG, colorB) or nil

	-- ===== PARTICLE EFFECTS =====
	if effectType == "fire" then
		local emitter = Instance.new("ParticleEmitter")
		emitter.Parent = attachment
		emitter.Rate = 40 * intensity
		emitter.Lifetime = NumberRange.new(1, 2)
		emitter.Speed = NumberRange.new(10 * size, 20 * size)
		emitter.Acceleration = Vector3.new(0, 5, 0)
		emitter.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, userColor or Color3.fromRGB(255, 150, 0)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 0, 0)),
		})
		emitter.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, size * 0.5),
			NumberSequenceKeypoint.new(1, 0),
		})
		emitter.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.3),
			NumberSequenceKeypoint.new(1, 1),
		})
		emitter.LightEmission = 0.5
		emitter.Enabled = enabled

		-- Add warm light
		local light = Instance.new("PointLight")
		light.Parent = anchor
		light.Color = userColor or Color3.fromRGB(255, 150, 50)
		light.Brightness = 2 * intensity
		light.Range = radius
		light.Shadows = true

	elseif effectType == "smoke" then
		local emitter = Instance.new("ParticleEmitter")
		emitter.Parent = attachment
		emitter.Rate = 15 * intensity
		emitter.Lifetime = NumberRange.new(3, 5)
		emitter.Speed = NumberRange.new(3 * size, 8 * size)
		emitter.Acceleration = Vector3.new(0, 2, 0)
		emitter.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, userColor or Color3.fromRGB(200, 200, 200)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(100, 100, 100)),
		})
		emitter.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, size * 0.3),
			NumberSequenceKeypoint.new(1, size * 2),
		})
		emitter.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.3),
			NumberSequenceKeypoint.new(0.5, 0.5),
			NumberSequenceKeypoint.new(1, 1),
		})
		emitter.Enabled = enabled

	elseif effectType == "sparkles" then
		local emitter = Instance.new("ParticleEmitter")
		emitter.Parent = attachment
		emitter.Texture = "rbxasset://textures/particles/sparkles_main.png"
		emitter.Rate = 25 * intensity
		emitter.Lifetime = NumberRange.new(1, 2)
		emitter.Speed = NumberRange.new(2, 5)
		emitter.SpreadAngle = Vector2.new(180, 180)
		emitter.Color = ColorSequence.new(userColor or Color3.fromRGB(255, 255, 100))
		emitter.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, size * 0.2),
			NumberSequenceKeypoint.new(0.5, size * 0.4),
			NumberSequenceKeypoint.new(1, 0),
		})
		emitter.LightEmission = 0.8
		emitter.Enabled = enabled

	elseif effectType == "rain" then
		-- Rain emitter on a wide invisible part above
		anchor.Size = Vector3.new(radius * 2, 1, radius * 2)
		anchor.Position = Vector3.new(posX, posY + 50, posZ)

		local emitter = Instance.new("ParticleEmitter")
		emitter.Parent = attachment
		emitter.Rate = 80 * intensity
		emitter.Lifetime = NumberRange.new(2, 3)
		emitter.Speed = NumberRange.new(30, 45)
		emitter.Acceleration = Vector3.new(0, -60, 0)
		emitter.EmissionDirection = Enum.NormalId.Bottom
		emitter.SpreadAngle = Vector2.new(15, 15)
		emitter.Shape = Enum.ParticleEmitterShape.Box
		emitter.Color = ColorSequence.new(userColor or Color3.fromRGB(200, 220, 255))
		emitter.Size = NumberSequence.new(0.1)
		emitter.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.2),
			NumberSequenceKeypoint.new(1, 0.8),
		})
		emitter.Enabled = enabled

	elseif effectType == "snow" then
		anchor.Size = Vector3.new(radius * 2, 1, radius * 2)
		anchor.Position = Vector3.new(posX, posY + 40, posZ)

		local emitter = Instance.new("ParticleEmitter")
		emitter.Parent = attachment
		emitter.Rate = 30 * intensity
		emitter.Lifetime = NumberRange.new(5, 8)
		emitter.Speed = NumberRange.new(2, 5)
		emitter.Acceleration = Vector3.new(0, -3, 0)
		emitter.EmissionDirection = Enum.NormalId.Bottom
		emitter.SpreadAngle = Vector2.new(30, 30)
		emitter.Shape = Enum.ParticleEmitterShape.Box
		emitter.Color = ColorSequence.new(userColor or Color3.fromRGB(240, 245, 255))
		emitter.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, size * 0.15),
			NumberSequenceKeypoint.new(1, size * 0.1),
		})
		emitter.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.1),
			NumberSequenceKeypoint.new(1, 0.7),
		})
		emitter.RotSpeed = NumberRange.new(-30, 30)
		emitter.Enabled = enabled

	elseif effectType == "magic" then
		local emitter = Instance.new("ParticleEmitter")
		emitter.Parent = attachment
		emitter.Texture = "rbxasset://textures/particles/sparkles_main.png"
		emitter.Rate = 20 * intensity
		emitter.Lifetime = NumberRange.new(1, 3)
		emitter.Speed = NumberRange.new(3, 8)
		emitter.SpreadAngle = Vector2.new(360, 360)
		emitter.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, userColor or Color3.fromRGB(130, 80, 255)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 100, 200)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(80, 200, 255)),
		})
		emitter.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0),
			NumberSequenceKeypoint.new(0.3, size * 0.3),
			NumberSequenceKeypoint.new(1, 0),
		})
		emitter.LightEmission = 1
		emitter.Rotation = NumberRange.new(0, 360)
		emitter.RotSpeed = NumberRange.new(-90, 90)
		emitter.Enabled = enabled

		local light = Instance.new("PointLight")
		light.Parent = anchor
		light.Color = userColor or Color3.fromRGB(130, 80, 255)
		light.Brightness = 1.5 * intensity
		light.Range = radius * 0.5

	elseif effectType == "dust" then
		local emitter = Instance.new("ParticleEmitter")
		emitter.Parent = attachment
		emitter.Rate = 10 * intensity
		emitter.Lifetime = NumberRange.new(3, 6)
		emitter.Speed = NumberRange.new(1, 3)
		emitter.SpreadAngle = Vector2.new(180, 180)
		emitter.Color = ColorSequence.new(userColor or Color3.fromRGB(180, 160, 130))
		emitter.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, size * 0.1),
			NumberSequenceKeypoint.new(0.5, size * 0.2),
			NumberSequenceKeypoint.new(1, 0),
		})
		emitter.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.5),
			NumberSequenceKeypoint.new(1, 1),
		})
		emitter.Enabled = enabled

	elseif effectType == "embers" then
		local emitter = Instance.new("ParticleEmitter")
		emitter.Parent = attachment
		emitter.Texture = "rbxasset://textures/particles/sparkles_main.png"
		emitter.Rate = 15 * intensity
		emitter.Lifetime = NumberRange.new(2, 4)
		emitter.Speed = NumberRange.new(3, 8)
		emitter.Acceleration = Vector3.new(0, 4, 0)
		emitter.SpreadAngle = Vector2.new(40, 40)
		emitter.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, userColor or Color3.fromRGB(255, 200, 50)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 80, 0)),
		})
		emitter.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, size * 0.1),
			NumberSequenceKeypoint.new(1, 0),
		})
		emitter.LightEmission = 0.7
		emitter.Enabled = enabled

	-- ===== LIGHTS =====
	elseif effectType == "torch_light" then
		local light = Instance.new("PointLight")
		light.Parent = anchor
		light.Color = userColor or Color3.fromRGB(255, 150, 50)
		light.Brightness = 3 * intensity
		light.Range = radius
		light.Shadows = true

	elseif effectType == "spotlight" then
		local light = Instance.new("SpotLight")
		light.Parent = anchor
		light.Color = userColor or Color3.fromRGB(255, 255, 240)
		light.Face = Enum.NormalId.Bottom
		light.Angle = 45
		light.Brightness = 4 * intensity
		light.Range = radius
		light.Shadows = true

	elseif effectType == "neon_glow" then
		anchor.Transparency = 0.3
		anchor.Material = Enum.Material.Neon
		anchor.Color = userColor or Color3.fromRGB(0, 200, 255)
		anchor.Size = Vector3.new(size, size * 0.2, size)

		local light = Instance.new("PointLight")
		light.Parent = anchor
		light.Color = userColor or Color3.fromRGB(0, 200, 255)
		light.Brightness = 2 * intensity
		light.Range = radius

	elseif effectType == "campfire_light" then
		-- Flickering warm light (uses fire + light combo)
		local light = Instance.new("PointLight")
		light.Parent = anchor
		light.Color = userColor or Color3.fromRGB(255, 120, 30)
		light.Brightness = 2.5 * intensity
		light.Range = radius
		light.Shadows = true

		-- Add fire particles
		local emitter = Instance.new("ParticleEmitter")
		emitter.Parent = attachment
		emitter.Rate = 25 * intensity
		emitter.Lifetime = NumberRange.new(1, 2)
		emitter.Speed = NumberRange.new(5, 12)
		emitter.Acceleration = Vector3.new(0, 3, 0)
		emitter.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 180, 50)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 100, 0)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(200, 50, 0)),
		})
		emitter.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, size * 0.3),
			NumberSequenceKeypoint.new(1, 0),
		})
		emitter.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.2),
			NumberSequenceKeypoint.new(1, 1),
		})
		emitter.LightEmission = 0.5
		emitter.Enabled = enabled

		-- Add embers
		local embers = Instance.new("ParticleEmitter")
		embers.Parent = attachment
		embers.Texture = "rbxasset://textures/particles/sparkles_main.png"
		embers.Rate = 5
		embers.Lifetime = NumberRange.new(2, 4)
		embers.Speed = NumberRange.new(2, 5)
		embers.Acceleration = Vector3.new(0, 3, 0)
		embers.SpreadAngle = Vector2.new(30, 30)
		embers.Color = ColorSequence.new(Color3.fromRGB(255, 200, 50))
		embers.Size = NumberSequence.new(size * 0.05)
		embers.LightEmission = 0.8
		embers.Enabled = enabled

	-- ===== EXPLOSION =====
	elseif effectType == "explosion" then
		local explosion = Instance.new("Explosion")
		explosion.Position = Vector3.new(posX, posY, posZ)
		explosion.BlastRadius = radius
		explosion.BlastPressure = 500000 * intensity
		explosion.Parent = workspace

	-- ===== AMBIENT SOUNDS =====
	elseif effectType == "ambient_fire" then
		local sound = Instance.new("Sound")
		sound.Parent = anchor
		sound.SoundId = "rbxassetid://155953556"
		sound.Volume = intensity * 0.5
		sound.Looped = looped
		sound.RollOffMaxDistance = radius
		if enabled then sound:Play() end

	elseif effectType == "ambient_wind" then
		local sound = Instance.new("Sound")
		sound.Parent = anchor
		sound.SoundId = "rbxassetid://295314768"
		sound.Volume = intensity * 0.4
		sound.Looped = looped
		sound.RollOffMaxDistance = radius
		if enabled then sound:Play() end

	elseif effectType == "ambient_water" then
		local sound = Instance.new("Sound")
		sound.Parent = anchor
		sound.SoundId = "rbxassetid://6564308795"
		sound.Volume = intensity * 0.4
		sound.Looped = looped
		sound.RollOffMaxDistance = radius
		if enabled then sound:Play() end

	elseif effectType == "ambient_rain" then
		local sound = Instance.new("Sound")
		sound.Parent = anchor
		sound.SoundId = "rbxassetid://1236717938"
		sound.Volume = intensity * 0.5
		sound.Looped = looped
		sound.RollOffMaxDistance = radius
		if enabled then sound:Play() end

	elseif effectType == "ambient_birds" then
		local sound = Instance.new("Sound")
		sound.Parent = anchor
		sound.SoundId = "rbxassetid://4565434840"
		sound.Volume = intensity * 0.3
		sound.Looped = looped
		sound.RollOffMaxDistance = radius
		if enabled then sound:Play() end

	elseif effectType == "ambient_cave" then
		local sound = Instance.new("Sound")
		sound.Parent = anchor
		sound.SoundId = "rbxassetid://1845557830"
		sound.Volume = intensity * 0.4
		sound.Looped = looped
		sound.RollOffMaxDistance = radius
		if enabled then sound:Play() end

	elseif effectType == "ambient_music" then
		local sound = Instance.new("Sound")
		sound.Parent = anchor
		sound.SoundId = "rbxassetid://1837849285"
		sound.Volume = intensity * 0.3
		sound.Looped = looped
		sound.RollOffMaxDistance = radius
		if enabled then sound:Play() end
	end
end)

if ok then
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Commit)
else
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Cancel)
end

print("[ENVTOOLS:" .. OP_ID .. "] END")
return { ok = ok, error = err and tostring(err) or nil }
