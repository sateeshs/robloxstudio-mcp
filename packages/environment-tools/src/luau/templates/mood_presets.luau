-- mood_presets.luau — Apply lighting/atmosphere/sky preset
-- Params: preset, fogDensity, clockTimeOverride, brightnessOverride, ambientR, ambientG, ambientB, hasClockOverride, hasBrightnessOverride, hasAmbientOverride, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local CollectionService = game:GetService("CollectionService")
local Lighting = game:GetService("Lighting")

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_mood_" .. OP_ID)
if not recordingId then
	warn("[ENVTOOLS:" .. OP_ID .. "] Failed to begin recording")
	return { ok = false, error = "Failed to begin ChangeHistory recording" }
end

local ok, err = pcall(function()
	local preset = {{preset}}
	local fogDensity = {{fogDensity}}
	local hasClockOverride = {{hasClockOverride}}
	local hasBrightnessOverride = {{hasBrightnessOverride}}
	local hasAmbientOverride = {{hasAmbientOverride}}

	-- Preset definitions
	local presets = {
		morning = {
			ClockTime = 7,
			Brightness = 1.5,
			Ambient = Color3.fromRGB(180, 170, 150),
			OutdoorAmbient = Color3.fromRGB(150, 140, 120),
			FogColor = Color3.fromRGB(200, 190, 170),
			FogEnd = 2000,
			atmosphereDensity = 0.3,
			atmosphereColor = Color3.fromRGB(220, 200, 170),
			atmosphereDecay = Color3.fromRGB(200, 170, 140),
			atmosphereGlare = 0.5,
			atmosphereHaze = 1.5,
		},
		noon = {
			ClockTime = 12,
			Brightness = 3,
			Ambient = Color3.fromRGB(200, 200, 200),
			OutdoorAmbient = Color3.fromRGB(180, 180, 180),
			FogColor = Color3.fromRGB(200, 210, 220),
			FogEnd = 5000,
			atmosphereDensity = 0.2,
			atmosphereColor = Color3.fromRGB(200, 210, 230),
			atmosphereDecay = Color3.fromRGB(90, 130, 180),
			atmosphereGlare = 0.2,
			atmosphereHaze = 0.5,
		},
		sunset = {
			ClockTime = 18,
			Brightness = 1,
			Ambient = Color3.fromRGB(180, 130, 100),
			OutdoorAmbient = Color3.fromRGB(160, 110, 80),
			FogColor = Color3.fromRGB(220, 150, 100),
			FogEnd = 1500,
			atmosphereDensity = 0.4,
			atmosphereColor = Color3.fromRGB(250, 160, 80),
			atmosphereDecay = Color3.fromRGB(220, 120, 60),
			atmosphereGlare = 1.5,
			atmosphereHaze = 2,
		},
		night = {
			ClockTime = 0,
			Brightness = 0.1,
			Ambient = Color3.fromRGB(40, 50, 80),
			OutdoorAmbient = Color3.fromRGB(30, 40, 70),
			FogColor = Color3.fromRGB(20, 25, 50),
			FogEnd = 800,
			atmosphereDensity = 0.5,
			atmosphereColor = Color3.fromRGB(30, 40, 80),
			atmosphereDecay = Color3.fromRGB(20, 25, 50),
			atmosphereGlare = 0,
			atmosphereHaze = 2.5,
		},
		spooky = {
			ClockTime = 21,
			Brightness = 0.3,
			Ambient = Color3.fromRGB(60, 40, 70),
			OutdoorAmbient = Color3.fromRGB(50, 30, 60),
			FogColor = Color3.fromRGB(40, 30, 50),
			FogEnd = 500,
			atmosphereDensity = 0.7,
			atmosphereColor = Color3.fromRGB(80, 50, 90),
			atmosphereDecay = Color3.fromRGB(60, 30, 70),
			atmosphereGlare = 0,
			atmosphereHaze = 3,
		},
		underwater = {
			ClockTime = 12,
			Brightness = 0.5,
			Ambient = Color3.fromRGB(30, 80, 120),
			OutdoorAmbient = Color3.fromRGB(20, 70, 110),
			FogColor = Color3.fromRGB(20, 60, 100),
			FogEnd = 300,
			atmosphereDensity = 0.9,
			atmosphereColor = Color3.fromRGB(30, 80, 130),
			atmosphereDecay = Color3.fromRGB(10, 40, 80),
			atmosphereGlare = 0.1,
			atmosphereHaze = 4,
		},
		alien = {
			ClockTime = 15,
			Brightness = 2,
			Ambient = Color3.fromRGB(100, 200, 100),
			OutdoorAmbient = Color3.fromRGB(80, 180, 80),
			FogColor = Color3.fromRGB(60, 150, 60),
			FogEnd = 1000,
			atmosphereDensity = 0.5,
			atmosphereColor = Color3.fromRGB(80, 220, 80),
			atmosphereDecay = Color3.fromRGB(40, 160, 40),
			atmosphereGlare = 0.8,
			atmosphereHaze = 2,
		},
	}

	local p = presets[preset]
	if not p then error("Unknown mood preset: " .. preset) end

	-- Apply lighting properties
	Lighting.ClockTime = hasClockOverride and {{clockTimeOverride}} or p.ClockTime
	Lighting.Brightness = hasBrightnessOverride and {{brightnessOverride}} or p.Brightness
	Lighting.Ambient = hasAmbientOverride and Color3.fromRGB({{ambientR}}, {{ambientG}}, {{ambientB}}) or p.Ambient
	Lighting.OutdoorAmbient = p.OutdoorAmbient
	Lighting.FogColor = p.FogColor
	Lighting.FogEnd = p.FogEnd

	-- Apply fog density override
	if fogDensity >= 0 then
		Lighting.FogEnd = math.max(50, 5000 * (1 - fogDensity))
	end

	-- Create or update Atmosphere
	local atmo = Lighting:FindFirstChildOfClass("Atmosphere")
	if not atmo then
		atmo = Instance.new("Atmosphere")
		atmo.Parent = Lighting
	end
	atmo.Density = p.atmosphereDensity
	atmo.Color = p.atmosphereColor
	atmo.Decay = p.atmosphereDecay
	atmo.Glare = p.atmosphereGlare
	atmo.Haze = p.atmosphereHaze
	CollectionService:AddTag(atmo, "EnvTools")
	atmo:SetAttribute("EnvToolsOp", OP_ID)

	-- Tag a marker for mood tracking
	local marker = Instance.new("Configuration")
	marker.Name = "EnvTools_MoodMarker"
	marker.Parent = Lighting
	CollectionService:AddTag(marker, "EnvTools")
	marker:SetAttribute("EnvToolsOp", OP_ID)
	marker:SetAttribute("EnvToolsType", "mood")
	marker:SetAttribute("MoodPreset", preset)
end)

if ok then
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Commit)
else
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Cancel)
end

print("[ENVTOOLS:" .. OP_ID .. "] END")
return { ok = ok, error = err and tostring(err) or nil }
