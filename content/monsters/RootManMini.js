/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var RootManMini = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

RootManMini.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: RootManMini
});

RootManMini.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.setMovementSpeed(0);
    this.monster.trackingDistance = 6.5;
    this.monster.attackBasedOnAggro = false;
    this.monster.xpModifier = 0.0;

    this.checkTargetEvery = 1.0;
    this.timeSinceTargetCheck = 0;

    this.hadNoTarget = true;
    this.monster.defaultModifiers.armorBoostPercent = 500.0;

    this.addSyncedVar(1, "isHidden", "bool", true);

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {

        othis.timeSinceTargetCheck += args.delta;
        if(othis.timeSinceTargetCheck > othis.checkTargetEvery) {
            othis.timeSinceTargetCheck = 0;
            var nearbyMonsters = othis.monster.nearbyMonsters(6, 15);
            nearbyMonsters = _.filter(nearbyMonsters, function(aMonster) {
                return aMonster.isDead !== true;
            });
            if(nearbyMonsters.length > 0) {
                if(othis.hadNoTarget) {
                    //othis.monster.addMaxAggroForEntity(nearbyMonsters[0].gameObject.entity);
                    othis.monster.setTrackingTarget(nearbyMonsters[0].gameObject);
                    othis.setSyncedVar("isHidden", false);
                    othis.monster.defaultModifiers.armorBoostPercent = 1.0;
                    othis.hadNoTarget = false;
                }
            }
            else if(!othis.hadNoTarget) {
                othis.setSyncedVar("isHidden", true);
                othis.monster.retreatToHome();
                othis.hadNoTarget = true;
                othis.monster.defaultModifiers.armorBoostPercent = 500.0;
            }

        }
    });
}


module.exports = RootManMini;
