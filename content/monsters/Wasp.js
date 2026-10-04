/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var Wasp = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Wasp.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Wasp
});

Wasp.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 4;

    this.attacksSinceStatus = 0;
    this.statusEvery = 3;
    this.spitTickPotency = 100;
    this.spitDuration = 9;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.attacksSinceStatus++;

        if(othis.attacksSinceStatus > othis.statusEvery) {
            if(args.takeOpportunity()) {
                othis.attacksSinceStatus = 0;
                othis.monster.triggerAnimation("poison");
                setTimeout(function() {
                    if(!othis.monster || !othis.gameObject.entity || !othis.monster.trackingTarget) return;

                    othis.poisonTarget(othis.monster.trackingTarget);
                    args.finishOpportunity();
                }, 1000);
            }
        }
    });
};

Wasp.prototype.poisonTarget = function(targetGo) {
    if(!targetGo) return;
    var targetMonster = targetGo.getComponent("Monster");
    if(!targetMonster) {
        console.log("Treid to poison target but had no mosnter attached...");
        return;
    }
    targetMonster.addStatusEffect(StatusEffects.Effects.Poison, this.spitDuration, {tickDmg: this.monster.potencyDamage(this.spitTickPotency), sourceEntity: this.gameObject.entity});
};

module.exports = Wasp;
