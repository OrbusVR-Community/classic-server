/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var TraduButton = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduButton.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduButton
});

TraduButton.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.timeSinceActivated = 0;

    this.monster.setMovementSpeed(0);
    this.monster.attackBasedOnAggro = false;
    this.monster.dontBroadcastAggro = true;
    this.monster.hasAggroTable = false;
    this.monster.xpModifier = 0.0;

    othis.addSyncedVar(1, "activated", "bool", false);

    this.monster.PreAttackCallback = function(dmgAmount, currentHitpoints, attackingMonster) {
        othis.setSyncedVar("activated", true);
        othis.timeSinceActivated = 0;
        return 0; //never take any actual damage
    }

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        if(othis.getSyncedVar("activated") == true) {
            othis.timeSinceActivated += args.delta;
            if(othis.timeSinceActivated > 1.5) {
                othis.setSyncedVar("activated", false);
            }
        }
    });
}


module.exports = TraduButton;
