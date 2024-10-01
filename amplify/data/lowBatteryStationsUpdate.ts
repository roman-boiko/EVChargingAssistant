import type { Schema } from "./resource";


export const handler: Schema["lowBatteryStationsUpdate"]["functionHandler"] = async (
  event,
  context
) => {
  return {
    station1Address: event.arguments.station1Address,
    station1Latitude: event.arguments.station1Latitude,
    station1Longitude: event.arguments.station1Longitude,
    station1Distance: event.arguments.station1Distance,
    station2Address: event.arguments.station2Address,
    station2Latitude: event.arguments.station2Latitude,
    station2Longitude: event.arguments.station2Longitude,
    station2Distance: event.arguments.station2Distance,
  };
};