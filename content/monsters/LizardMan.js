/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var LizardMan = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
    this.type = componentOpts.typeNum;
};

LizardMan.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: LizardMan
});

LizardMan.prototype.Start = function() {
    var othis = this;

    this.addSyncedVar(1, "isBlocking", "bool", false);

    this.monster = this.gameObject.getComponent("Monster");

    this.timeSinceShout = 0;
    this.shoutEvery = 12;
    this.timeSinceBlocked = 0;
    this.blockEvery = 6;
    this.beenBlockingFor = 0;
    this.blockFor = 6;

    if(this.type === 1) {

        this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

            if(!othis.isBlocking) {
                othis.timeSinceBlocked += args.delta;
            }

            othis.timeSinceShout += args.delta;

            if(othis.isBlocking) {
                args.takeOpportunity();
                args.finishOpportunity();
                othis.beenBlockingFor += args.delta;
                if(othis.beenBlockingFor > othis.blockFor) {
                    othis.stopBlocking();
                }
            }
            else if(othis.timeSinceShout > othis.shoutEvery) {
                args.takeOpportunity();
                args.finishOpportunity();
                othis.shout();
                othis.timeSinceShout = 0;
            }
            else if(othis.timeSinceBlocked > othis.blockEvery) {
                args.takeOpportunity();
                args.finishOpportunity();
                othis.startBlocking();
                othis.timeSinceBlocked = 0;
            }
        });

    }
}

LizardMan.prototype.startBlocking = function() {
    this.isBlocking = true;
    this.setSyncedVar("isBlocking", true);
    this.monster.defaultModifiers.armorBoostPercent = 10.0;
}

LizardMan.prototype.stopBlocking = function() {
    this.isBlocking = false;
    this.setSyncedVar("isBlocking", false);
    this.monster.defaultModifiers.armorBoostPercent = 1.0;
    this.beenBlockingFor = 0;
};

LizardMan.prototype.shout = function() {
    var othis = this;
    this.monster.triggerAnimation("shout");
    _.each(othis.monster.nearbyMonsters(30, 11), function(targetMonster) {
        var testComponent = targetMonster.gameObject.getComponent("LizardMan");
        if(testComponent != null) {
            targetMonster.addStatusEffect(StatusEffects.Effects.Bolster, 8, {damageBoostPercent: 0.50});
        }
    });
}


module.exports = LizardMan;
