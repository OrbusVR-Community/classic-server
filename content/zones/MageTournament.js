var ZoneInfo = {
    name: "MageTournament",
    heightmapOffset: {x: 0, z: 0},
    waterLevel: 72,
    safetyLevel: 1.0,
    noDbSync: true,
    defaultPosition: function() {
        // var angle = Math.random()*Math.PI*2;
        // var newPos = {x: 288.1, y: 79.553, z: 318.31};
        // newPos.x += Math.cos(angle)*30;
        // newPos.z += Math.sin(angle)*30;
        // console.log("PLACING AT");
        // console.log(newPos);
        // return newPos.x + "," + newPos.y + "," + newPos.z;

        var newPos = {x: 269.27 + Math.random() * 40, y: 79.553, z: 295.36};
        return newPos.x + "," + newPos.y + "," + newPos.z;
    },
    leaveZoneOnDeath: true,
    possibleWeather: [["clear", 1.0]],
    noTombstone: true
}

module.exports = ZoneInfo;