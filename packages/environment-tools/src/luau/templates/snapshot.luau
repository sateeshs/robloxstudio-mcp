-- snapshot.luau — Capture scene state: instance counts, terrain bounds, lighting summary
-- Params: opId

local CollectionService = game:GetService("CollectionService")
local Lighting = game:GetService("Lighting")

local OP_ID = {{opId}}
print("[ENVTOOLS:" .. OP_ID .. "] BEGIN")

local ok, result = pcall(function()
	-- Count EnvTools-tagged instances by type
	local tagged = CollectionService:GetTagged("EnvTools")
	local counts = {
		total = #tagged,
		terrain = 0,
		mood = 0,
		scatter = 0,
		structure = 0,
		other = 0,
	}

	local terrainBounds = {}

	for _, inst in ipairs(tagged) do
		local t = inst:GetAttribute("EnvToolsType")
		if t == "terrain" then
			counts.terrain += 1
			-- Collect terrain bounds
			local ox = inst:GetAttribute("TerrainOriginX")
			local oy = inst:GetAttribute("TerrainOriginY")
			local oz = inst:GetAttribute("TerrainOriginZ")
			local sx = inst:GetAttribute("TerrainSizeX")
			local sz = inst:GetAttribute("TerrainSizeZ")
			if ox and oy and oz and sx and sz then
				table.insert(terrainBounds, {
					origin = {x = ox, y = oy, z = oz},
					size = {x = sx, z = sz},
				})
			end
		elseif t == "mood" then
			counts.mood += 1
		elseif t == "scatter" then
			counts.scatter += 1
		elseif t == "structure" then
			counts.structure += 1
		else
			counts.other += 1
		end
	end

	-- Lighting summary
	local lighting = {
		clockTime = Lighting.ClockTime,
		brightness = Lighting.Brightness,
		ambient = {
			r = math.floor(Lighting.Ambient.R * 255),
			g = math.floor(Lighting.Ambient.G * 255),
			b = math.floor(Lighting.Ambient.B * 255),
		},
		fogEnd = Lighting.FogEnd,
	}

	-- Atmosphere
	local atmo = Lighting:FindFirstChildOfClass("Atmosphere")
	if atmo then
		lighting.atmosphere = {
			density = atmo.Density,
			haze = atmo.Haze,
			glare = atmo.Glare,
		}
	end

	-- Workspace instance summary
	local workspaceChildren = 0
	local partCount = 0
	local modelCount = 0
	for _, child in workspace:GetDescendants() do
		workspaceChildren += 1
		if child:IsA("BasePart") then
			partCount += 1
		elseif child:IsA("Model") then
			modelCount += 1
		end
	end

	return {
		envToolsCounts = counts,
		terrainBounds = terrainBounds,
		lighting = lighting,
		workspace = {
			totalDescendants = workspaceChildren,
			partCount = partCount,
			modelCount = modelCount,
		},
	}
end)

print("[ENVTOOLS:" .. OP_ID .. "] END")

if ok then
	return { ok = true, snapshot = result }
else
	return { ok = false, error = tostring(result) }
end
