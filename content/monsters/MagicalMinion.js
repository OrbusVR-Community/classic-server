/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var MagicalMinion = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

MagicalMinion.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: MagicalMinion
});

MagicalMinion.prototype.Start = function() {
    var othis = this;

    this.addSyncedVar(1, "magicEnabled", "bool", true);

    this.monster = this.gameObject.getComponent("Monster");
    var myVitalityElite = 5000 + 125 * this.monster.getSyncedVar("willLevel") * 2.8;
    this.monster.initStats({baseVitality: myVitalityElite});
    this.monster.disallowCrowdControl = true;

    this.gameObject.addEventListener("PacifyMagic", function() {
        console.log("HEARD PACIFY MAGIC");
        othis.setSyncedVar("magicEnabled", false);
        var prevHp = othis.monster.getSyncedVar("hitPoints");
        othis.monster.initStats(); //back to being a normal creature.
        if(prevHp < othis.monster.getSyncedVar("maxHitPoints")) {
            othis.monster.setSyncedVar("hitPoints", prevHp);
        }
        othis.monster.disallowCrowdControl = false;
    });
}


module.exports = MagicalMinion;
