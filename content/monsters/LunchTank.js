/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var LunchTank = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

LunchTank.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: LunchTank
});

LunchTank.prototype.Start = function() {
    var othis = this;

    this.usedUp = false;
    this.gameObject.layer = 99;

    this.addSyncedVar(1, "exploded", "bool", false);

    this.monster = this.gameObject.getComponent("Monster");

    this.monster.setMovementSpeed(0);
    this.monster.attackBasedOnAggro = false;
    this.monster.dontBroadcastAggro = true;
    this.monster.xpModifier = 0.0;

    this.monster.PreAttackCallback = function(dmgAmount, currentHp) {
        if(currentHp - dmgAmount < 1) {
            console.log("TANK WOULD BE DESTROYED!");
            if(othis.parentBoss) {
                othis.parentBoss.finishedFeeding();
                othis.setSyncedVar("exploded", true);
            }
            else {
                othis.useUp();
            }
            return 0;
        }
        else {
            return dmgAmount;
        }
    };
}

LunchTank.prototype.startFeeding = function(parentBoss) {
    this.parentBoss = parentBoss;
    this.gameObject.layer = 11;
}

LunchTank.prototype.useUp = function() {
    this.gameObject.layer = 99;
    this.usedUp = true;
}

LunchTank.prototype.resetTank = function() {
    console.log("RESETTING TANK!");
    this.usedUp = false;
    this.gameObject.layer = 99;
    this.setSyncedVar("exploded", false);
    if(this.monster) {
        this.monster.resetCombatStatus();
        this.monster.resetStatus();
    }
}

module.exports = LunchTank;
