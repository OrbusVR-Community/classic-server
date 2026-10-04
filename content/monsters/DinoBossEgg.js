/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var DinoBossEgg = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

DinoBossEgg.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: DinoBossEgg
});

DinoBossEgg.prototype.Start = function() {
    var othis = this;
}

DinoBossEgg.prototype.beginHatch = function() {
    this.broadcastToActiveClients(1, [], []);
}

DinoBossEgg.prototype.hatch = function(myDino) {
    var newminion = this.gameObject.zone.spawnEntity("DinoMinion", this.gameObject.getWorldPosition());
    var newmonster = newminion.gameObject.getComponent("Monster");
    newmonster.scaleToLevel(myDino.monster.getSyncedVar("willLevel"));
    newmonster.xpModifier = 0.0;
    var nearbyMonsters = myDino.monster.nearbyMonsters(200, 15);
    if(nearbyMonsters.length > 0) {
        newmonster.addAggroForEntity(_.sample(nearbyMonsters).gameObject.entity, 100);
    }
    this.gameObject.entity.selfDestruct();
    return newminion.gameObject;
}


module.exports = DinoBossEgg;
