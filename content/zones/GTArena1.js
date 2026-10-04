var ZoneInfo = {
    name: "GTArena1",
    heightmapOffset: {x: 0, z: 0},
    waterLevel: 72,
    safetyLevel: 0.0,
    freeForAll: true,
    noDbSync: true,
    allowDbLoad: false,
    defaultPosition: function() {
        positionStartCounter++;
        return startPositions[(positionStartCounter % startPositions.length)];
    },
    leaveZoneOnDeath: true,
    xpBonus: 10.0,
    possibleWeather: [["clear", 2.0], ["cloudy", 1.0]],
    noTombstone: true
}

var startPositions = ["343.12,79.077,363.636", "325.16,79.071,328.986","298.6,79.072,318.006","273.20,79.075,324.976","244.80,79.074,368.920","276.30,79.073,411.436","297.94,79.07,414.266","324.46,79.067,401.796"];
var positionStartCounter = -1;

module.exports = ZoneInfo;