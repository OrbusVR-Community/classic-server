var ZoneInfo = {
    name: "FortDefenseMap",
    heightmapOffset: {x: 0, z: 0},
    waterLevel: 72,
    safetyLevel: 0.0,
    freeForAll: true,
    noDbSync: true,
    defaultPosition: function() {
        positionStartCounter++;
        return startPositions[(positionStartCounter % startPositions.length)];
    },
    leaveZoneOnDeath: true,
    xpBonus: 10.0,
    possibleWeather: [["clear", 2.0], ["cloudy", 1.0]],
    noTombstone: true
}

var startPositions = ["325.23,79.33,323.0", "264.2,79.33,328.284","300.1,79.33,282.3","293.5,79.3,367.4","320.7,79.33,289.8","277.8,79.33,357.7","319.0,79.33,354.3","274.7,79.33,294.1"];
var positionStartCounter = -1;

module.exports = ZoneInfo;