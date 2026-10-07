-- Shortest-distance variant of the car profile bundled with the pinned OSRM image.
-- The upstream profile keeps responsibility for access, turn restrictions, and modes.
local profile_api = dofile("/opt/car.lua")

local upstream_setup = profile_api.setup

profile_api.setup = function()
  local profile = upstream_setup()
  profile.properties.weight_name = "distance"
  return profile
end

return profile_api
