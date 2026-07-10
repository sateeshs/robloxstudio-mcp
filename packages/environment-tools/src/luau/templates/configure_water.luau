-- configure_water.luau — Set water properties on Terrain
-- Params: hasColor, colorR, colorG, colorB, transparency, reflectance, waveSize, waveSpeed, opId

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local Terrain = workspace.Terrain

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local recordingId = ChangeHistoryService:TryBeginRecording("EnvTools_water_" .. OP_ID)
if not recordingId then
	warn("[ENVTOOLS:" .. OP_ID .. "] Failed to begin recording")
	return { ok = false, error = "Failed to begin ChangeHistory recording" }
end

local ok, err = pcall(function()
	local hasColor = {{hasColor}}
	if hasColor then
		Terrain.WaterColor = Color3.fromRGB({{colorR}}, {{colorG}}, {{colorB}})
	end
	Terrain.WaterTransparency = {{transparency}}
	Terrain.WaterReflectance = {{reflectance}}
	Terrain.WaterWaveSize = {{waveSize}}
	Terrain.WaterWaveSpeed = {{waveSpeed}}
end)

if ok then
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Commit)
else
	ChangeHistoryService:FinishRecording(recordingId, Enum.FinishRecordingOperation.Cancel)
end

print("[ENVTOOLS:" .. OP_ID .. "] END")
return { ok = ok, error = err and tostring(err) or nil }
