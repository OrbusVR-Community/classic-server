/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var Chance = require("orbus").Chance;
1
var Sheep = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Sheep.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Sheep
});

Sheep.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    this.gameObject.addEventListener("MonsterDeath", function() {
        if(othis.monster.getSyncedVar("willLevel") > 5 && Chance.rollPercentChance(25)) {
            //This was actually a sheep shifter!
            othis.spawnShifter(null, othis.monster.getSyncedVar("willLevel"));
        }
    })
}

Sheep.prototype.spawnShifter = function(targetEntity, newLevel) {
    console.log("SPAWNING SHEEP SHIFTER!");
    var othis = this;
    var myworldpos = this.gameObject.transform.position;
    var newent = othis.gameObject.zone.spawnEntity("SheepShifter", myworldpos);
    var newmonster = newent.gameObject.getComponent("Monster");
    newmonster.assignLootTable(this.gameObject.zone.LOOT_TABLES["zone2surprise"]);
    _.defer(function() {
        newmonster.scaleToLevel(newLevel);
        if(targetEntity !== null) {
            newmonster.addAggroForEntity(targetEntity, 100);
        }
    });
}

module.exports = Sheep;
